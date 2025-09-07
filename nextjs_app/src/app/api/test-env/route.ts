import { NextResponse } from 'next/server';

export async function GET() {
    console.log('🔍 Test API called');
    
    const envCheck = {
        nodeEnv: process.env.NODE_ENV,
        vercel: process.env.VERCEL,
        vercelEnv: process.env.VERCEL_ENV,
        hasGoogleApiKey: !!process.env.GOOGLE_API_KEY,
        googleApiKeyLength: process.env.GOOGLE_API_KEY?.length,
        hasProjectId: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
        allEnvKeys: Object.keys(process.env).filter(key => key.includes('GOOGLE')),
        totalEnvKeys: Object.keys(process.env).length,
        someEnvKeys: Object.keys(process.env).slice(0, 10),
        vercelKeys: Object.keys(process.env).filter(key => key.includes('VERCEL'))
    };
    
    console.log('🔍 Environment check:', envCheck);
    
    return NextResponse.json({
        message: 'Environment test',
        environment: envCheck
    });
}