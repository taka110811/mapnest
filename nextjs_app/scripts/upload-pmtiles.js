#!/usr/bin/env node
/**
 * PMTilesファイルをVercel Blob Storageにアップロードするスクリプト
 * 使用方法: node scripts/upload-pmtiles.js
 */

import { put } from '@vercel/blob';
import { readFile } from 'fs/promises';
import { join } from 'path';

async function uploadPMTiles() {
  try {
    console.log('PMTilesファイルをVercel Blobにアップロード中...');
    
    const filePath = join(process.cwd(), 'public/tiles/japan_all_levels_unified.pmtiles');
    const fileBuffer = await readFile(filePath);
    
    const blob = await put('tiles/japan_all_levels_unified.pmtiles', fileBuffer, {
      access: 'public',
      contentType: 'application/octet-stream'
    });
    
    console.log('✅ アップロード完了!');
    console.log(`URL: ${blob.url}`);
    console.log('\n次のステップ:');
    console.log(`1. mapConfig.js のPMTILES_URLを以下に更新してください:`);
    console.log(`   PMTILES_URL: '${blob.url}'`);
    console.log(`2. API Routeが不要になるため削除できます: src/app/api/tiles/`);
    
  } catch (error) {
    console.error('❌ アップロードエラー:', error.message);
    console.log('\nVercel Blobの設定を確認してください:');
    console.log('1. BLOB_READ_WRITE_TOKEN環境変数が設定されているか');
    console.log('2. Vercelプロジェクトに接続されているか');
  }
}

uploadPMTiles();