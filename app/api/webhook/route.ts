import { NextRequest, NextResponse } from 'next/server';
import { WebhookResponse } from '@/lib/types';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/gjjOpJ4pT3hbzBrK/tax-deed-platform';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Add run_id if not present
    if (!body.run_id) {
      body.run_id = crypto.randomUUID();
    }

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`n8n webhook failed: ${response.statusText}`);
    }

    const data: WebhookResponse = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        run_id: crypto.randomUUID(),
      },
      { status: 500 }
    );
  }
}