import { NextRequest } from "next/server"
import OpenAI from "openai"
import { logger } from "@/lib/logger"

/**
 * POST /api/chat/auction
 *
 * AI-powered chat endpoint for auction-related questions.
 * Uses OpenAI streaming for real-time responses.
 * Fetches and parses PDF documents to provide accurate answers.
 */

// Force Node.js runtime for pdf-parse compatibility
export const runtime = "nodejs"

// Cache for fetched PDF content (in-memory, per-instance)
const pdfContentCache = new Map<string, { content: string; fetchedAt: number }>()
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

interface ChatRequest {
  saleId: string
  message: string
  history?: Array<{
    role: "user" | "assistant"
    content: string
  }>
  context: {
    countyName: string
    stateName: string
    saleType: string
    rules?: {
      registrationRequired: boolean
      registrationDeadlineDays: number | null
      registrationFormUrl: string | null
      depositRefundable: boolean
      depositPaymentMethods: string[]
      minimumBidRule: string
      minimumBidAmount: number | null
      bidIncrement: number | null
      buyersPremiumPct: number | null
      paymentDeadlineHours: number
      paymentMethods: string[]
      financingAllowed: boolean
      deedRecordingTimeline: string | null
      redemptionPeriodDays: number | null
      possessionTimeline: string | null
      asIsSale: boolean
      liensSurvive: string[]
      titleInsuranceAvailable: boolean
      rawRulesText: string | null
    } | null
    documents?: Array<{
      title: string
      url: string
      type: string
      extractedText?: string | null
      year?: number | null
    }>
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    const body: ChatRequest = await request.json()
    const { message, history = [], context } = body

    if (!message?.trim()) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Fetch PDF content from documents
    let documentContents: Array<{ title: string; content: string }> = []
    if (context.documents && context.documents.length > 0) {
      logger.log(`[Chat API] Fetching ${context.documents.length} documents...`)
      documentContents = await fetchDocumentContents(context.documents)
      logger.log(`[Chat API] Successfully fetched ${documentContents.length} documents`)
    }

    // Build the system prompt with auction context AND document contents
    const systemPrompt = buildSystemPrompt(context, documentContents)

    // Build message history
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10).map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user", content: message },
    ]

    // Create OpenAI client
    const openai = new OpenAI({ apiKey })

    // Create streaming completion
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    })

    // Convert OpenAI stream to ReadableStream for Next.js
    const encoder = new TextEncoder()
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content
            if (content) {
              // Send the content as a Server-Sent Event
              const data = JSON.stringify({ content })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
          }
          // Signal end of stream
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
          controller.close()
        } catch (error) {
          logger.error("[Chat API] Stream error:", error)
          controller.error(error)
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    })
  } catch (error) {
    logger.error("[Chat API] Error:", error)
    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}

/**
 * Fetch and extract text content from PDF documents
 * First checks for pre-extracted text in database (from n8n workflow)
 * Falls back to runtime extraction if not available
 */
async function fetchDocumentContents(
  documents: Array<{ title: string; url: string; type: string; id?: string; extractedText?: string | null; year?: number | null }>
): Promise<Array<{ title: string; content: string }>> {
  const results: Array<{ title: string; content: string }> = []

  for (const doc of documents) {
    try {
      // Check if we have pre-extracted text from n8n workflow
      if (doc.extractedText && doc.extractedText.length > 100) {
        logger.log(`[Chat API] Using pre-extracted text for: ${doc.title} (${doc.extractedText.length} chars)`)
        results.push({ title: doc.title, content: doc.extractedText })
        continue
      }

      // Check cache second
      const cached = pdfContentCache.get(doc.url)
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
        logger.log(`[Chat API] Using cached content for: ${doc.title}`)
        results.push({ title: doc.title, content: cached.content })
        continue
      }

      logger.log(`[Chat API] Fetching document: ${doc.title} from ${doc.url}`)

      // Fetch the document
      const response = await fetch(doc.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(15000), // 15 second timeout
      })

      if (!response.ok) {
        logger.log(`[Chat API] Failed to fetch ${doc.title}: ${response.status}`)
        continue
      }

      const contentType = response.headers.get("content-type") || ""
      let textContent = ""

      if (contentType.includes("application/pdf")) {
        // For PDFs, we'll try to get the raw bytes and extract text
        const buffer = await response.arrayBuffer()
        textContent = await extractTextFromPDF(buffer)
      } else if (contentType.includes("text/html")) {
        // For HTML pages (like WordPress PDF viewer pages), look for the actual PDF URL
        const html = await response.text()
        const pdfUrl = extractPDFUrlFromHTML(html, doc.url)

        if (pdfUrl) {
          logger.log(`[Chat API] Found PDF URL in HTML: ${pdfUrl}`)
          // Fetch the actual PDF
          try {
            const pdfResponse = await fetch(pdfUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              },
              signal: AbortSignal.timeout(20000),
            })

            if (pdfResponse.ok) {
              const buffer = await pdfResponse.arrayBuffer()
              textContent = await extractTextFromPDF(buffer)
              logger.log(`[Chat API] Extracted ${textContent.length} chars from PDF: ${doc.title}`)
            }
          } catch (pdfError) {
            logger.log(`[Chat API] Failed to fetch PDF from extracted URL: ${pdfError}`)
          }
        }

        // Fallback to HTML content if no PDF found or extraction failed
        if (!textContent || textContent.length < 100) {
          textContent = extractTextFromHTML(html)
        }
      } else {
        // Try to get as text
        textContent = await response.text()
      }

      if (textContent && textContent.length > 100) {
        // Clean up the text
        textContent = textContent
          .replace(/\s+/g, " ")
          .replace(/\n{3,}/g, "\n\n")
          .trim()

        // Truncate if too long (keep first 8000 chars per document)
        if (textContent.length > 8000) {
          textContent = textContent.substring(0, 8000) + "... [truncated]"
        }

        // Cache the result
        pdfContentCache.set(doc.url, { content: textContent, fetchedAt: Date.now() })

        results.push({ title: doc.title, content: textContent })
        logger.log(`[Chat API] Final extracted ${textContent.length} chars from: ${doc.title}`)
        // Log first 500 chars of content for debugging
        logger.log(`[Chat API] Content preview: ${textContent.substring(0, 500)}...`)
      } else {
        logger.log(`[Chat API] No meaningful content extracted from: ${doc.title}`)
      }
    } catch (error) {
      logger.error(`[Chat API] Error fetching ${doc.title}:`, error)
    }
  }

  return results
}

/**
 * Extract the actual PDF download URL from an HTML wrapper page
 */
function extractPDFUrlFromHTML(html: string, baseUrl: string): string | null {
  // Pattern 1: WordPress wpfd_file download links
  // Example: /download/92/tax-sales-and-procedures/13140/filename.pdf
  const wpfdMatch = html.match(/href=["']([^"']*\/download\/[^"']+\.pdf)["']/i)
  if (wpfdMatch) {
    const pdfPath = wpfdMatch[1]
    if (pdfPath.startsWith("http")) {
      return pdfPath
    }
    // Make it absolute
    const urlObj = new URL(baseUrl)
    return `${urlObj.origin}${pdfPath.startsWith("/") ? "" : "/"}${pdfPath}`
  }

  // Pattern 2: Direct PDF link in href
  const directPdfMatch = html.match(/href=["']([^"']+\.pdf)["']/i)
  if (directPdfMatch) {
    const pdfPath = directPdfMatch[1]
    if (pdfPath.startsWith("http")) {
      return pdfPath
    }
    const urlObj = new URL(baseUrl)
    return `${urlObj.origin}${pdfPath.startsWith("/") ? "" : "/"}${pdfPath}`
  }

  // Pattern 3: data-file attribute (some WordPress plugins)
  const dataFileMatch = html.match(/data-file=["']([^"']+\.pdf)["']/i)
  if (dataFileMatch) {
    const pdfPath = dataFileMatch[1]
    if (pdfPath.startsWith("http")) {
      return pdfPath
    }
    const urlObj = new URL(baseUrl)
    return `${urlObj.origin}${pdfPath.startsWith("/") ? "" : "/"}${pdfPath}`
  }

  // Pattern 4: Embedded object/embed src
  const embedMatch = html.match(/<(?:object|embed)[^>]+(?:data|src)=["']([^"']+\.pdf)["']/i)
  if (embedMatch) {
    const pdfPath = embedMatch[1]
    if (pdfPath.startsWith("http")) {
      return pdfPath
    }
    const urlObj = new URL(baseUrl)
    return `${urlObj.origin}${pdfPath.startsWith("/") ? "" : "/"}${pdfPath}`
  }

  return null
}

/**
 * Extract text from PDF buffer
 * Uses manual text extraction from PDF stream content
 */
async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  return extractTextFromPDFManual(buffer)
}

/**
 * Manual PDF text extraction as fallback
 * Handles basic text encoding methods
 */
function extractTextFromPDFManual(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const textChunks: string[] = []

  // Convert buffer to string for pattern matching
  let pdfString = ""
  for (let i = 0; i < bytes.length; i++) {
    pdfString += String.fromCharCode(bytes[i])
  }

  // Method 1: Extract text between stream and endstream
  const streamMatches = Array.from(pdfString.matchAll(/stream\s*([\s\S]*?)\s*endstream/gi))
  for (const match of streamMatches) {
    const streamContent = match[1]

    // Look for text showing operators: Tj, TJ, ', "
    // Pattern for (text)Tj
    const tjMatches = Array.from(streamContent.matchAll(/\(([^)]+)\)\s*Tj/gi))
    for (const tjMatch of tjMatches) {
      const text = decodeEscapedPDFString(tjMatch[1])
      if (text.length > 1) {
        textChunks.push(text)
      }
    }

    // Pattern for [(text)]TJ (array of text)
    const tjArrayMatches = Array.from(streamContent.matchAll(/\[((?:\([^)]*\)|[^\]])*)\]\s*TJ/gi))
    for (const arrayMatch of tjArrayMatches) {
      const arrayContent = arrayMatch[1]
      const textParts = Array.from(arrayContent.matchAll(/\(([^)]*)\)/g))
      for (const part of textParts) {
        const text = decodeEscapedPDFString(part[1])
        if (text.length > 0) {
          textChunks.push(text)
        }
      }
    }
  }

  // Method 2: Look for plain text patterns (for simpler PDFs)
  if (textChunks.length < 10) {
    // Extract readable text sequences
    const readableMatches = Array.from(pdfString.matchAll(/([A-Za-z][A-Za-z0-9\s,.;:!?'"()-]{10,})/g))
    for (const match of readableMatches) {
      const text = match[1].trim()
      // Filter out PDF syntax
      if (
        !text.match(/^(obj|endobj|stream|endstream|xref|trailer|startxref)/i) &&
        !text.match(/^\d+\s+\d+\s+R$/) &&
        !text.match(/^\/[A-Z][a-z]+/) &&
        text.length > 15
      ) {
        textChunks.push(text)
      }
    }
  }

  // Join and clean up
  let result = textChunks.join(" ")

  // Clean up common PDF artifacts
  result = result
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return result
}

/**
 * Decode escaped characters in PDF strings
 */
function decodeEscapedPDFString(str: string): string {
  return str
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\(\d{3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)))
}

/**
 * Extract text content from HTML page
 */
function extractTextFromHTML(html: string): string {
  // Remove script and style tags
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")

  // Extract text from main content areas
  const mainContentMatch = text.match(
    /<(main|article|div[^>]*class="[^"]*content[^"]*")[^>]*>([\s\S]*?)<\/\1>/gi
  )
  if (mainContentMatch) {
    text = mainContentMatch.join(" ")
  }

  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, " ")

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)))

  // Clean up whitespace
  text = text.replace(/\s+/g, " ").trim()

  return text
}

/**
 * Build a comprehensive system prompt with auction context
 */
function buildSystemPrompt(
  context: ChatRequest["context"],
  documentContents: Array<{ title: string; content: string }> = []
): string {
  const { countyName, stateName, saleType, rules, documents } = context

  // Check for outdated documents
  const currentYear = new Date().getFullYear()
  const outdatedDocs = documents?.filter(d => d.year && d.year < currentYear) || []
  const hasOutdatedDocs = outdatedDocs.length > 0
  const documentYears = Array.from(new Set(documents?.map(d => d.year).filter(Boolean) || []))

  let prompt = `You are an expert assistant for tax auction investors. You are helping a user understand the auction rules and requirements for the ${saleType} sale in ${countyName} County, ${stateName}.

Your role is to:
1. Answer questions accurately based on the auction rules provided below
2. Explain complex tax sale concepts in plain English
3. Help users understand registration, bidding, and payment requirements
4. Warn about important deadlines and risks
5. Be helpful but remind users to verify critical information with the county directly

IMPORTANT GUIDELINES:
- If information is not in the provided rules, clearly state that you don't have that specific information
- Never make up information about deadlines, amounts, or requirements
- Recommend users verify critical details with the county tax office
- Be concise but thorough in your explanations
- Use bullet points for lists of requirements
- Highlight important warnings or deadlines
`

  // Add warning about outdated documents
  if (hasOutdatedDocs) {
    prompt += `
⚠️ CRITICAL WARNING - DOCUMENT CURRENCY:
The documents available are from ${documentYears.join(", ")} but we are now in ${currentYear}.
The county has not yet published ${currentYear} auction documents.
When answering questions:
1. ALWAYS warn the user that dates, deadlines, and requirements may have changed for ${currentYear}
2. Explicitly mention that the information is from ${documentYears.join("/")} documents
3. STRONGLY recommend calling the county at (814) 317-2361 to verify current ${currentYear} dates
4. Do NOT present past dates as if they are upcoming - clarify they are from the previous year
5. If asked about specific dates like registration deadlines, say "The ${Math.max(...documentYears as number[])} deadline was [date] - you must contact the county for ${currentYear} dates"

`
  }

  prompt += `
`

  if (rules) {
    prompt += `\n---\nAUCTION RULES FOR ${countyName.toUpperCase()} COUNTY ${saleType.toUpperCase()} SALE:\n\n`

    prompt += `REGISTRATION:\n`
    prompt += `- Registration Required: ${rules.registrationRequired ? "Yes" : "No"}\n`
    if (rules.registrationDeadlineDays) {
      prompt += `- Registration Deadline: ${rules.registrationDeadlineDays} days before sale\n`
    }
    if (rules.registrationFormUrl) {
      prompt += `- Registration Form: ${rules.registrationFormUrl}\n`
    }

    prompt += `\nDEPOSIT:\n`
    prompt += `- Refundable: ${rules.depositRefundable ? "Yes" : "No"}\n`
    if (rules.depositPaymentMethods?.length > 0) {
      prompt += `- Accepted Methods: ${rules.depositPaymentMethods.join(", ")}\n`
    }

    prompt += `\nBIDDING:\n`
    prompt += `- Minimum Bid: ${rules.minimumBidRule || "See county rules"}\n`
    if (rules.minimumBidAmount) {
      prompt += `- Minimum Bid Amount: $${rules.minimumBidAmount.toLocaleString()}\n`
    }
    if (rules.bidIncrement) {
      prompt += `- Bid Increment: $${rules.bidIncrement.toLocaleString()}\n`
    }
    if (rules.buyersPremiumPct) {
      prompt += `- Buyer's Premium: ${rules.buyersPremiumPct}%\n`
    }

    prompt += `\nPAYMENT:\n`
    prompt += `- Payment Deadline: ${rules.paymentDeadlineHours ? `${rules.paymentDeadlineHours} hours after sale` : "See county rules"}\n`
    if (rules.paymentMethods?.length > 0) {
      prompt += `- Accepted Methods: ${rules.paymentMethods.join(", ")}\n`
    }
    prompt += `- Financing Allowed: ${rules.financingAllowed ? "Yes" : "No"}\n`

    prompt += `\nPOST-SALE:\n`
    if (rules.deedRecordingTimeline) {
      prompt += `- Deed Recording: ${rules.deedRecordingTimeline}\n`
    }
    if (rules.redemptionPeriodDays !== null && rules.redemptionPeriodDays !== undefined) {
      prompt += `- Redemption Period: ${rules.redemptionPeriodDays > 0 ? `${rules.redemptionPeriodDays} days` : "No redemption period"}\n`
    }
    if (rules.possessionTimeline) {
      prompt += `- Possession: ${rules.possessionTimeline}\n`
    }

    prompt += `\nDISCLAIMERS:\n`
    prompt += `- Sold As-Is: ${rules.asIsSale ? "Yes - properties sold as-is with all faults" : "No"}\n`
    if (rules.liensSurvive?.length > 0) {
      prompt += `- Liens That Survive: ${rules.liensSurvive.join(", ")}\n`
    }
    prompt += `- Title Insurance Available: ${rules.titleInsuranceAvailable ? "Yes" : "No (typically not available at tax sales)"}\n`

    if (rules.rawRulesText) {
      prompt += `\n---\nFULL RULES TEXT:\n${rules.rawRulesText}\n`
    }
  } else {
    prompt += `\nNOTE: Detailed auction rules have not been extracted for this county yet. Please advise the user to check the county's official website for specific requirements.\n`
  }

  // Add fetched document contents - THIS IS THE KEY PART
  if (documentContents && documentContents.length > 0) {
    prompt += `\n\n---\nDOCUMENT CONTENTS (extracted from official PDFs):\n`
    prompt += `IMPORTANT: Use the information below to answer questions accurately. This is official documentation from the county.\n\n`

    documentContents.forEach((doc) => {
      prompt += `\n=== ${doc.title.toUpperCase()} ===\n`
      prompt += doc.content
      prompt += `\n=== END ${doc.title.toUpperCase()} ===\n`
    })
  } else if (documents && documents.length > 0) {
    // Fallback if we couldn't fetch content
    prompt += `\n---\nAVAILABLE DOCUMENTS (could not extract content):\n`
    documents.forEach((doc) => {
      prompt += `- ${doc.title} (${doc.type}): ${doc.url}\n`
    })
    prompt += `\nNote: Could not fetch document contents. Please recommend the user download and review these documents directly.\n`
  }

  prompt += `\n---\nRemember: Always be accurate and helpful. Base your answers on the document contents provided above. If you're unsure about something, recommend the user contact ${countyName} County directly.`

  return prompt
}
