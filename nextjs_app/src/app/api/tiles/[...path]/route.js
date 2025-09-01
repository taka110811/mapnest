import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request, { params }) {
  try {
    const { path } = params;
    const filePath = join(process.cwd(), 'public/tiles', ...path);
    
    // PMTilesファイルを読み込み
    const fileBuffer = await readFile(filePath);
    
    // 適切なヘッダーを設定
    const headers = new Headers();
    headers.set('Content-Type', 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    
    return new NextResponse(fileBuffer, { headers });
  } catch (error) {
    console.error('PMTiles serving error:', error);
    return new NextResponse('File not found', { status: 404 });
  }
}

export async function HEAD(request, { params }) {
  // HEADリクエストの処理（PMTilesで必要）
  try {
    const { path } = params;
    const filePath = join(process.cwd(), 'public/tiles', ...path);
    const stats = await stat(filePath);
    
    const headers = new Headers();
    headers.set('Content-Length', stats.size.toString());
    headers.set('Content-Type', 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');
    
    return new NextResponse(null, { status: 200, headers });
  } catch (error) {
    return new NextResponse('File not found', { status: 404 });
  }
}