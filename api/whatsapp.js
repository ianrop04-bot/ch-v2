// api/whatsapp.js - ALL IN ONE FILE
import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Initialize Redis with YOUR credentials
const redis = new Redis({
  url: "https://composed-scorpion-37902.upstash.io",
  token: "AZQOAAIncDExYzcwNWZlZTkxMTc0OGNkOTJmOGY4ZTUyZmY2OTlhYXAxMzc5MDI",
});

export async function POST(request) {
  try {
    const { action, phone, code } = await request.json();
    
    // 1. REQUEST CODE
    if (action === 'request-code') {
      const genCode = Math.floor(10000000 + Math.random() * 90000000).toString();
      
      await redis.setex(`code:${phone}`, 600, JSON.stringify({
        code: genCode,
        phone,
        created: Date.now(),
        attempts: 0
      }));
      
      return NextResponse.json({
        success: true,
        code: genCode,
        message: `Send "${genCode}" to WhatsApp bot`
      });
    }
    
    // 2. VERIFY CODE  
    if (action === 'verify-code') {
      const data = await redis.get(`code:${phone}`);
      if (!data) return NextResponse.json({ error: 'Code expired' }, { status: 400 });
      
      const stored = JSON.parse(data);
      
      if (stored.code === code) {
        // Create session
        await redis.setex(`session:${phone}`, 604800, JSON.stringify({
          phone,
          active: true,
          created: Date.now()
        }));
        
        await redis.del(`code:${phone}`);
        
        return NextResponse.json({
          success: true,
          message: '✅ Bot activated! Use /help on WhatsApp'
        });
      } else {
        return NextResponse.json({ error: 'Wrong code' }, { status: 400 });
      }
    }
    
    // 3. CHECK STATUS
    if (action === 'status') {
      const session = await redis.get(`session:${phone}`);
      return NextResponse.json({
        active: !!session,
        session: session ? JSON.parse(session) : null
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Also handle GET for testing
export async function GET() {
  return NextResponse.json({
    status: 'WhatsApp Bot API Running',
    redis: 'Connected',
    endpoints: {
      'POST /api/whatsapp': 'Request/verify codes',
      'GET /api/whatsapp': 'This info'
    }
  });
}
