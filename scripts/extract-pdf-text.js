/**
 * PDF Text Extractor Script
 *
 * Extracts text from PDF documents and updates Supabase database.
 * Uses pdf-parse library for reliable text extraction.
 *
 * Usage:
 *   node extract-pdf-text.js [--all] [--document-id <id>]
 *
 * Options:
 *   --all           Process all documents with extracted_text = NULL
 *   --document-id   Process a specific document by ID
 *   --county        Process all documents for a specific county name
 *   --limit         Maximum number of documents to process (default: 10)
 */

// Load environment variables from TaxDeedFlow/.env.local
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'TaxDeedFlow', '.env.local') });

const https = require('https');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');

// Check if pdf-parse is available, if not provide instructions
let pdfParse;
try {
  pdfParse = require('pdf-parse');
} catch (e) {
  console.error('Error: pdf-parse module not found.');
  console.error('Please install it with: npm install pdf-parse');
  process.exit(1);
}

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://oiiwlzobizftprqspbzt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY environment variable not set');
  console.error('Set it with: set SUPABASE_SERVICE_ROLE_KEY=your_key (Windows)');
  console.error('         or: export SUPABASE_SERVICE_ROLE_KEY=your_key (Linux/Mac)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Download a file from a URL and return as Buffer
 */
async function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        console.log(`  Following redirect to: ${response.headers.location}`);
        return downloadFile(response.headers.location).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });

    request.on('error', reject);
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Extract text from a PDF buffer
 */
async function extractTextFromPdf(pdfBuffer) {
  try {
    const data = await pdfParse(pdfBuffer);
    return {
      text: data.text,
      numPages: data.numpages,
      info: data.info
    };
  } catch (error) {
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
}

/**
 * Clean and validate extracted text
 */
function cleanText(text) {
  if (!text) return null;

  // Clean up whitespace
  let cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  // Check if it's PDF metadata instead of actual content
  const isMetadata =
    cleaned.includes('StructTreeRoot') ||
    cleaned.includes('FontDescriptor') ||
    cleaned.includes('/Type /Page') ||
    (cleaned.includes('obj') && cleaned.includes('endobj') && cleaned.split('obj').length > 5);

  if (isMetadata) {
    console.log('  Warning: Extracted text appears to be PDF metadata, not content');
    return null;
  }

  // Check minimum length
  if (cleaned.length < 50) {
    console.log(`  Warning: Extracted text too short (${cleaned.length} chars)`);
    return null;
  }

  // Truncate if too long (100KB limit)
  if (cleaned.length > 100000) {
    cleaned = cleaned.substring(0, 100000) + '\n\n[... text truncated due to length ...]';
  }

  return cleaned;
}

/**
 * Process a single document
 */
async function processDocument(doc) {
  console.log(`\nProcessing: ${doc.title || doc.id}`);
  console.log(`  URL: ${doc.url}`);

  try {
    // Download PDF
    console.log('  Downloading PDF...');
    const pdfBuffer = await downloadFile(doc.url);
    console.log(`  Downloaded: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

    // Extract text
    console.log('  Extracting text...');
    const { text, numPages, info } = await extractTextFromPdf(pdfBuffer);
    console.log(`  Pages: ${numPages}`);

    // Clean text
    const cleanedText = cleanText(text);

    if (!cleanedText) {
      console.log('  Result: No usable text extracted');

      // Update database with error
      const { error } = await supabase
        .from('documents')
        .update({
          extracted_text: null,
          text_extracted_at: new Date().toISOString()
        })
        .eq('id', doc.id);

      if (error) {
        console.log(`  Database error: ${error.message}`);
      }

      return { success: false, error: 'No usable text extracted' };
    }

    console.log(`  Extracted: ${cleanedText.length} characters`);

    // Update database
    console.log('  Updating database...');
    const { error } = await supabase
      .from('documents')
      .update({
        extracted_text: cleanedText,
        text_extracted_at: new Date().toISOString()
      })
      .eq('id', doc.id);

    if (error) {
      throw new Error(`Database update failed: ${error.message}`);
    }

    console.log('  Result: SUCCESS');
    return { success: true, charCount: cleanedText.length, pages: numPages };

  } catch (error) {
    console.log(`  Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Get documents to process
 */
async function getDocuments(options) {
  let query = supabase
    .from('documents')
    .select(`
      id,
      title,
      url,
      document_type,
      county_id,
      counties!inner(county_name, state_code)
    `)
    .is('extracted_text', null)
    .not('url', 'is', null);

  if (options.documentId) {
    query = query.eq('id', options.documentId);
  }

  if (options.county) {
    query = query.ilike('counties.county_name', `%${options.county}%`);
  }

  // Filter for PDF documents
  query = query.or('url.ilike.%.pdf,file_format.eq.pdf');

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }

  return data || [];
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    all: args.includes('--all'),
    documentId: null,
    county: null,
    limit: 10
  };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--document-id' && args[i + 1]) {
      options.documentId = args[i + 1];
      i++;
    }
    if (args[i] === '--county' && args[i + 1]) {
      options.county = args[i + 1];
      i++;
    }
    if (args[i] === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[i + 1]);
      i++;
    }
  }

  if (options.all) {
    options.limit = 100; // Process more when using --all
  }

  console.log('============================================================');
  console.log('PDF Text Extractor');
  console.log('============================================================');
  console.log(`Options: ${JSON.stringify(options)}`);

  // Get documents to process
  console.log('\nFetching documents...');
  const documents = await getDocuments(options);

  if (documents.length === 0) {
    console.log('No documents to process.');
    return;
  }

  console.log(`Found ${documents.length} documents to process`);

  // Process each document
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  for (const doc of documents) {
    const result = await processDocument(doc);
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push({ id: doc.id, title: doc.title, error: result.error });
    }
  }

  // Print summary
  console.log('\n============================================================');
  console.log('SUMMARY');
  console.log('============================================================');
  console.log(`Total processed: ${documents.length}`);
  console.log(`Successful: ${results.success}`);
  console.log(`Failed: ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach(e => {
      console.log(`  - ${e.title || e.id}: ${e.error}`);
    });
  }
}

// Run
main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
