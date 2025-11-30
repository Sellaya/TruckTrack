import { NextRequest, NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/seed-data';

export async function POST(request: NextRequest) {
  try {
    console.log('🌱 Seed API called');
    const result = await seedDatabase();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: result.data,
      }, { status: 200 });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message,
        data: result.data,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('❌ Error in seed API:', error);
    return NextResponse.json({
      success: false,
      message: `Error: ${error.message || error}`,
      error: error.toString(),
    }, { status: 500 });
  }
}

// Allow GET for testing
export async function GET() {
  return NextResponse.json({
    message: 'Seed API - Use POST to seed the database',
    endpoint: '/api/seed',
    method: 'POST',
  });
}

