import { NextRequest, NextResponse } from 'next/server';
import { PropertyService } from '@/lib/services/property.service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse filters from query params
    const filters = {
      state: searchParams.get('state') || undefined,
      county: searchParams.get('county') || undefined,
      classification: searchParams.get('classification') || undefined,
      minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
      minScore: searchParams.get('minScore') ? parseFloat(searchParams.get('minScore')!) : undefined,
      maxScore: searchParams.get('maxScore') ? parseFloat(searchParams.get('maxScore')!) : undefined,
    };
    
    const { data, error } = await PropertyService.getProperties(filters);
    
    if (error) {
      return NextResponse.json(
        { error: error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      data: data || [],
      total: data?.length || 0
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch properties' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { data, error } = await PropertyService.createProperty(body);
    
    if (error) {
      return NextResponse.json(
        { error: error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to create property' },
      { status: 500 }
    );
  }
}