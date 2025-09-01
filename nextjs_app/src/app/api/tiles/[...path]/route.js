import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';

export async function GET(request, { params }) {
  try {
    const { path } = params;
    const filePath = join(process.cwd(), 'public/tiles', ...path);
    
    // ファイル情報を取得
    const fileStats = await stat(filePath);
    const fileSize = fileStats.size;
    
    // Range requestの処理
    const range = request.headers.get('range');
    
    if (range) {
      // Range requestの場合
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      
      if (start >= fileSize) {
        return new NextResponse('Requested range not satisfiable', { 
          status: 416,
          headers: {
            'Content-Range': `bytes */${fileSize}`
          }
        });
      }
      
      // 部分的にファイルを読み込み
      const chunkSize = (end - start) + 1;
      const fileHandle = await require('fs').promises.open(filePath, 'r');
      const buffer = Buffer.alloc(chunkSize);
      await fileHandle.read(buffer, 0, chunkSize, start);
      await fileHandle.close();
      
      const headers = new Headers();
      headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      headers.set('Accept-Ranges', 'bytes');
      headers.set('Content-Length', chunkSize.toString());
      headers.set('Content-Type', 'application/octet-stream');
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Range');
      
      return new NextResponse(buffer, { 
        status: 206, // Partial Content
        headers 
      });
    } else {
      // 通常のGETリクエスト
      const fileBuffer = await readFile(filePath);
      
      const headers = new Headers();
      headers.set('Content-Type', 'application/octet-stream');
      headers.set('Content-Length', fileSize.toString());
      headers.set('Accept-Ranges', 'bytes');
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Range');
      
      return new NextResponse(fileBuffer, { headers });
    }
  } catch (error) {
    console.error('PMTiles serving error:', error);
    return new NextResponse('File not found', { status: 404 });
  }
}

export async function HEAD(request, { params }) {
  try {
    const { path } = params;
    const filePath = join(process.cwd(), 'public/tiles', ...path);
    const stats = await stat(filePath);
    
    const headers = new Headers();
    headers.set('Content-Length', stats.size.toString());
    headers.set('Content-Type', 'application/octet-stream');
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Range');
    
    return new NextResponse(null, { status: 200, headers });
  } catch (error) {
    return new NextResponse('File not found', { status: 404 });
  }
}

export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type'
    }
  });
}