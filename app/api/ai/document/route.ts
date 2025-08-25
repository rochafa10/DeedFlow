import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const county = formData.get('county') as string || 'Miami-Dade';
    const state = formData.get('state') as string || 'FL';
    const auctionDate = formData.get('auctionDate') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'PDF file is required' },
        { status: 400 }
      );
    }

    // Convert file to base64 for n8n
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');

    // Send to n8n AI document processor
    const response = await fetch(`${N8N_WEBHOOK_URL}/process-auction-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document: {
          data: base64,
          mimeType: file.type,
          fileName: file.name,
        },
        county,
        state,
        auction_date: auctionDate,
      }),
    });

    if (!response.ok) {
      throw new Error(`Document processing failed: ${response.statusText}`);
    }

    const result = await response.json();

    // Store import batch record
    const supabase = createClient();
    const { data: batchData, error: batchError } = await supabase
      .from('import_batches')
      .insert({
        source: 'ai_document_processor',
        file_name: file.name,
        properties_count: result.propertiesProcessed || 0,
        status: 'completed',
        summary: result.summary,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (batchError) {
      console.error('Failed to store import batch:', batchError);
    }

    return NextResponse.json({
      success: true,
      propertiesProcessed: result.propertiesProcessed || 0,
      summary: result.summary,
      batchId: batchData?.id,
      properties: result.properties || [],
    });
  } catch (error) {
    console.error('Document processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 }
    );
  }
}