"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { X, Send, MessageSquare, Loader2 } from "lucide-react"
import { ChatMessage } from "./ChatMessage"
import { SuggestedQuestions } from "./SuggestedQuestions"
import { logger } from "@/lib/logger"

const chatLogger = logger.withContext('Auction Chat')

interface Message {
  id: string
  role: "user" | "assistant" | "error"
  content: string
}

interface AuctionRules {
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
  rulesSourceUrl: string | null
  lastVerifiedAt: string | null
  rawRulesText: string | null
}

interface AuctionChatProps {
  isOpen: boolean
  onClose: () => void
  saleId: string
  countyName: string
  stateName: string
  saleType: string
  rules: AuctionRules | null
  documents: Array<{
    id: string
    type: string
    title: string
    url: string
    format: string
    propertyCount: number
    publicationDate: string
    extractedText: string | null
    textExtractedAt: string | null
    year: number | null
  }>
}

/**
 * AI-powered chat panel for auction Q&A
 */
export function AuctionChat({
  isOpen,
  onClose,
  saleId,
  countyName,
  stateName,
  saleType,
  rules,
  documents,
}: AuctionChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Handle sending a message
  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setStreamingContent("")

    try {
      const response = await fetch("/api/chat/auction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId,
          message: messageText.trim(),
          history: messages.map((m) => ({
            role: m.role === "error" ? "assistant" : m.role,
            content: m.content,
          })),
          context: {
            countyName,
            stateName,
            saleType,
            rules,
            documents: documents.map((d) => ({
              title: d.title,
              url: d.url,
              type: d.type,
              extractedText: d.extractedText,
              year: d.year,
            })),
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      let fullContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                fullContent += parsed.content
                setStreamingContent(fullContent)
              }
            } catch {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }

      // Add the complete assistant message
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: fullContent,
      }

      setMessages((prev) => [...prev, assistantMessage])
      setStreamingContent("")
    } catch (error) {
      chatLogger.error("Chat error", {
        error: error instanceof Error ? error.message : String(error)
      })
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "error",
        content: "Sorry, I couldn't process your request. Please try again.",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, messages, saleId, countyName, stateName, saleType, rules, documents])

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  // Handle textarea key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // Handle suggested question click
  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl h-[80vh] max-h-[700px] bg-white dark:bg-slate-800 rounded-lg shadow-xl flex flex-col overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                Auction Assistant
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {countyName} County - {saleType}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Close chat"
          >
            <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !streamingContent ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                Ask about this auction
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
                I can help you understand the auction rules, registration requirements,
                bidding process, and more for {countyName} County&apos;s {saleType} sale.
              </p>
              <SuggestedQuestions
                onSelect={handleSuggestedQuestion}
                saleType={saleType}
              />
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  role={message.role}
                  content={message.content}
                />
              ))}
              {streamingContent && (
                <ChatMessage
                  role="assistant"
                  content={streamingContent}
                  isStreaming={true}
                />
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/50">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about this auction..."
              className="flex-1 resize-none rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              rows={1}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            AI responses may not be 100% accurate. Always verify critical information with the county.
          </p>
        </div>
      </div>
    </div>
  )
}
