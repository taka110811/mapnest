# 階層的地図検索UI実装ガイド【2024年版】

## 📍 概要

都道府県 → 市区町村 → 町・字 → スポットという階層構造で、地図上をクリックしてズームインしながら観光スポットを探索できる高性能なインタラクティブ地図UIの実装手順です。Comfyの最新アーキテクチャ（2024年版）を参考に、モダンな技術スタックで構築します。

## 🎯 完成イメージ

1. **初期表示**: 日本地図全体が表示され、都道府県ごとに色分け
2. **都道府県クリック**: 選択した都道府県にズームイン、市区町村が色分け表示
3. **市区町村クリック**: 選択した市区町村にズームイン、町・字が色分け表示
4. **町・字クリック**: 最大ズーム、観光スポットのピンが表示

## 🛠️ 技術スタック【2024年最新版】

### フロントエンド
- **フレームワーク**: Next.js 14 (App Router) + React + TypeScript
- **地図ライブラリ**: MapLibre GL JS（Leafletから移行）
- **ベクトルタイル**: PMTiles（静的配信）
- **スタイリング**: Tailwind CSS
- **ホスティング**: Vercel

### バックエンド
- **言語**: Rust
- **フレームワーク**: Actix Web
- **データベース**: インメモリデータ構造 + SQLite（最小限）
- **ホスティング**: Google Cloud Run

### インフラ・データ
- **CDN**: Cloudflare
- **ベクトルタイル配信**: PMTiles（静的ファイル）
- **監視**: Google Cloud Logging

## 🚀 主要な最適化ポイント

1. **MapLibre GL JSによる高性能レンダリング**
2. **PMTilesによる静的ベクトルタイル配信**
3. **Rustバックエンドによる超高速レスポンス**
4. **Cloud Runによるサーバーレス構成**
5. **Vercelによる最適化されたSSR/SSG**

## 📋 実装手順

### Phase 1: プロジェクトセットアップ

#### 1.1 Next.jsプロジェクトの作成

```bash
# プロジェクト作成（最新のNext.js）
npx create-next-app@latest mapnest --typescript --tailwind --app --src-dir

cd mapnest

# 必要なパッケージのインストール
npm install maplibre-gl react-map-gl
npm install pmtiles
npm install @turf/turf
npm install swr

# 開発用パッケージ
npm install -D @types/mapbox-gl
```

#### 1.2 プロジェクト構造

```
mapnest/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── api/
│   │   │   ├── spots/route.ts
│   │   │   └── search/route.ts
│   │   └── location/
│   │       └── [slug]/page.tsx   # SSRページ
│   ├── components/
│   │   ├── Map/
│   │   │   ├── MapContainer.tsx
│   │   │   ├── MapControls.tsx
│   │   │   ├── VectorTileLayer.tsx
│   │   │   └── SpotMarkers.tsx
│   │   ├── UI/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── FilterPanel.tsx
│   │   │   ├── SpotCard.tsx
│   │   │   └── NavigationBreadcrumb.tsx
│   │   └── Charts/
│   │       └── HistogramFilter.tsx
│   ├── hooks/
│   │   ├── useMapData.ts
│   │   ├── useVectorTiles.ts
│   │   └── useSpotSearch.ts
│   ├── lib/
│   │   ├── mapUtils.ts
│   │   ├── pmtiles.ts
│   │   └── api.ts
│   └── types/
│       └── index.ts
├── public/
│   └── tiles/           # PMTilesファイル
│       ├── japan-prefectures.pmtiles
│       ├── japan-cities.pmtiles
│       └── japan-districts.pmtiles
├── rust-backend/        # Rustバックエンド
│   ├── src/
│   │   ├── main.rs
│   │   ├── handlers/
│   │   ├── models/
│   │   └── utils/
│   └── Cargo.toml
└── docker/
    └── Dockerfile
```

### Phase 2: MapLibre GL JS実装

#### 2.1 MapLibreの設定 (`src/app/globals.css`)

```css
@import 'maplibre-gl/dist/maplibre-gl.css';

/* カスタムスタイル */
.maplibregl-popup {
  font-family: 'Inter', system-ui, sans-serif;
}

.maplibregl-ctrl-group {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
}
```

#### 2.2 型定義 (`src/types/index.ts`)

```typescript
export interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

export interface TouristSpot {
  id: string;
  name: string;
  name_en?: string;
  category: string;
  coordinates: [number, number];
  description: string;
  images: string[];
  rating: number;
  review_count: number;
  price_range?: string;
  opening_hours?: string;
  prefecture_code: string;
  city_code: string;
  district_code?: string;
}

export interface SearchFilters {
  categories: string[];
  rating_min: number;
  price_range: string[];
  keywords: string;
  bounds?: [[number, number], [number, number]];
}

export interface AreaInfo {
  code: string;
  name: string;
  name_en: string;
  level: 'prefecture' | 'city' | 'district';
  spot_count: number;
  population?: number;
  area_km2?: number;
}
```

#### 2.3 メインマップコンポーネント (`src/components/Map/MapContainer.tsx`)

```typescript
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Map, { 
  NavigationControl, 
  ScaleControl,
  GeolocateControl,
  MapRef 
} from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import { PMTiles } from 'pmtiles';
import { ViewState, SearchFilters } from '@/types';
import VectorTileLayer from './VectorTileLayer';
import SpotMarkers from './SpotMarkers';
import { useSpotSearch } from '@/hooks/useSpotSearch';

// PMTilesプロトコルの登録
let pmtilesProtocol: any;

export default function MapContainer() {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState<ViewState>({
    longitude: 138.2529,
    latitude: 36.2048,
    zoom: 5,
    pitch: 0,
    bearing: 0
  });
  
  const [selectedArea, setSelectedArea] = useState<{
    level: string;
    code: string;
  } | null>(null);

  const [filters, setFilters] = useState<SearchFilters>({
    categories: [],
    rating_min: 0,
    price_range: [],
    keywords: ''
  });

  // カスタムフックでスポットデータ取得
  const { spots, isLoading } = useSpotSearch(selectedArea, filters);

  // PMTilesプロトコルの初期化
  useEffect(() => {
    if (!pmtilesProtocol) {
      pmtilesProtocol = {
        type: 'pmtiles',
        protocolInit: (params: any) => {
          const pmtiles = new PMTiles(params.url);
          return {
            tile: async (params: any) => {
              const response = await pmtiles.getZxy(
                params.z,
                params.x,
                params.y
              );
              return response?.data;
            }
          };
        }
      };
      maplibregl.addProtocol('pmtiles', pmtilesProtocol.protocolInit);
    }
  }, []);

  // 地図クリックハンドラー
  const handleMapClick = useCallback((event: any) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // クリックした地物の取得
    const features = map.queryRenderedFeatures(event.point, {
      layers: ['prefectures-fill', 'cities-fill', 'districts-fill']
    });

    if (features && features.length > 0) {
      const feature = features[0];
      const { code, level, name } = feature.properties;
      
      // エリア選択とズーム
      setSelectedArea({ level, code });
      
      // 境界にフィットするようズーム
      if (feature.geometry.type === 'Polygon' || 
          feature.geometry.type === 'MultiPolygon') {
        const bounds = getBounds(feature.geometry);
        map.fitBounds(bounds, {
          padding: 50,
          duration: 1000
        });
      }
    }
  }, []);

  // ズームレベルに応じたレイヤー表示制御
  const getVisibleLayers = () => {
    const zoom = viewState.zoom;
    if (zoom < 7) return ['prefectures'];
    if (zoom < 10) return ['cities'];
    if (zoom < 13) return ['districts'];
    return ['spots'];
  };

  return (
    <div className="relative w-full h-screen">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onClick={handleMapClick}
        mapLib={maplibregl}
        mapStyle={{
          version: 8,
          sources: {},
          layers: []
        }}
        style={{ width: '100%', height: '100%' }}
        maxZoom={18}
        minZoom={4}
      >
        {/* コントロール */}
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-right" />
        <GeolocateControl 
          position="top-right"
          trackUserLocation
        />

        {/* ベクトルタイルレイヤー */}
        <VectorTileLayer
          visibleLayers={getVisibleLayers()}
          selectedArea={selectedArea}
        />

        {/* スポットマーカー */}
        {getVisibleLayers().includes('spots') && (
          <SpotMarkers 
            spots={spots}
            isLoading={isLoading}
          />
        )}
      </Map>

      {/* UI オーバーレイ */}
      <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none">
        <div className="pointer-events-auto">
          <SearchBar onSearch={(keywords) => 
            setFilters(prev => ({ ...prev, keywords }))
          } />
        </div>
      </div>

      {/* フィルターパネル */}
      <FilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        spotCount={spots.length}
      />
    </div>
  );
}
```

#### 2.4 ベクトルタイルレイヤー (`src/components/Map/VectorTileLayer.tsx`)

```typescript
import { useEffect } from 'react';
import { useMap } from 'react-map-gl';

interface Props {
  visibleLayers: string[];
  selectedArea: { level: string; code: string } | null;
}

export default function VectorTileLayer({ visibleLayers, selectedArea }: Props) {
  const { current: map } = useMap();

  useEffect(() => {
    if (!map) return;

    // 都道府県レイヤー
    if (!map.getSource('prefectures')) {
      map.addSource('prefectures', {
        type: 'vector',
        url: 'pmtiles:///tiles/japan-prefectures.pmtiles'
      });

      // 塗りつぶしレイヤー
      map.addLayer({
        id: 'prefectures-fill',
        type: 'fill',
        source: 'prefectures',
        'source-layer': 'prefectures',
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'spot_count'],
            0, '#FEE5D9',
            50, '#FCAE91',
            100, '#FB6A4A',
            200, '#DE2D26',
            500, '#A50F15'
          ],
          'fill-opacity': [
            'case',
            ['==', ['get', 'code'], selectedArea?.code || ''],
            0.9,
            0.6
          ]
        }
      });

      // 境界線レイヤー
      map.addLayer({
        id: 'prefectures-line',
        type: 'line',
        source: 'prefectures',
        'source-layer': 'prefectures',
        paint: {
          'line-color': '#fff',
          'line-width': 2,
          'line-opacity': 0.8
        }
      });

      // ラベルレイヤー
      map.addLayer({
        id: 'prefectures-label',
        type: 'symbol',
        source: 'prefectures',
        'source-layer': 'prefectures',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans CJK JP Regular'],
          'text-size': 12
        },
        paint: {
          'text-color': '#333',
          'text-halo-color': '#fff',
          'text-halo-width': 1
        }
      });
    }

    // レイヤーの表示/非表示制御
    const updateLayerVisibility = () => {
      ['prefectures', 'cities', 'districts'].forEach(layer => {
        const isVisible = visibleLayers.includes(layer);
        ['fill', 'line', 'label'].forEach(suffix => {
          const layerId = `${layer}-${suffix}`;
          if (map.getLayer(layerId)) {
            map.setLayoutProperty(
              layerId,
              'visibility',
              isVisible ? 'visible' : 'none'
            );
          }
        });
      });
    };

    updateLayerVisibility();

    // ホバー効果
    map.on('mousemove', 'prefectures-fill', (e) => {
      if (e.features && e.features.length > 0) {
        map.getCanvas().style.cursor = 'pointer';
        
        // ポップアップ表示
        const feature = e.features[0];
        const { name, spot_count } = feature.properties;
        
        // ツールチップ実装
      }
    });

    map.on('mouseleave', 'prefectures-fill', () => {
      map.getCanvas().style.cursor = '';
    });

  }, [map, visibleLayers, selectedArea]);

  return null;
}
```

### Phase 3: Rustバックエンド実装

#### 3.1 Cargo.toml

```toml
[package]
name = "mapnest-backend"
version = "0.1.0"
edition = "2021"

[dependencies]
actix-web = "4"
actix-cors = "0.6"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
sqlx = { version = "0.7", features = ["runtime-tokio-rustls", "sqlite"] }
anyhow = "1"
env_logger = "0.11"
dotenv = "0.15"
geojson = "0.24"
geo = "0.27"
rstar = "0.11"  # 空間インデックス
rayon = "1.7"   # 並列処理

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
```

#### 3.2 メインサーバー (`rust-backend/src/main.rs`)

```rust
use actix_web::{web, App, HttpServer, middleware};
use actix_cors::Cors;
use std::sync::Arc;
use anyhow::Result;

mod handlers;
mod models;
mod utils;
mod spatial_index;

use crate::models::AppState;
use crate::spatial_index::SpatialIndex;

#[actix_web::main]
async fn main() -> Result<()> {
    env_logger::init();
    dotenv::dotenv().ok();

    // データをメモリに読み込み
    let spots_data = utils::load_spots_data()?;
    let spatial_index = Arc::new(SpatialIndex::new(spots_data));
    
    let app_state = web::Data::new(AppState {
        spatial_index,
    });

    println!("Server starting on http://0.0.0.0:8080");

    HttpServer::new(move || {
        App::new()
            .app_data(app_state.clone())
            .wrap(
                Cors::default()
                    .allow_any_origin()
                    .allow_any_method()
                    .allow_any_header()
            )
            .wrap(middleware::Logger::default())
            .wrap(middleware::Compress::default())
            .service(
                web::scope("/api")
                    .route("/spots", web::get().to(handlers::get_spots))
                    .route("/search", web::post().to(handlers::search_spots))
                    .route("/areas/{level}/{code}", web::get().to(handlers::get_area_info))
                    .route("/histogram", web::get().to(handlers::get_histogram_data))
            )
    })
    .bind("0.0.0.0:8080")?
    .run()
    .await?;

    Ok(())
}
```

#### 3.3 空間インデックス実装 (`rust-backend/src/spatial_index.rs`)

```rust
use geo::{Point, Rect};
use rstar::{RTree, AABB};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TouristSpot {
    pub id: String,
    pub name: String,
    pub coordinates: [f64; 2],
    pub category: String,
    pub rating: f32,
    pub review_count: u32,
    pub prefecture_code: String,
    pub city_code: String,
}

impl rstar::RTreeObject for TouristSpot {
    type Envelope = AABB<[f64; 2]>;

    fn envelope(&self) -> Self::Envelope {
        AABB::from_point(self.coordinates)
    }
}

pub struct SpatialIndex {
    rtree: RTree<TouristSpot>,
    spots: Vec<TouristSpot>,
}

impl SpatialIndex {
    pub fn new(spots: Vec<TouristSpot>) -> Self {
        let rtree = RTree::bulk_load(spots.clone());
        Self { rtree, spots }
    }

    pub fn search_in_bounds(&self, bounds: [[f64; 2]; 2]) -> Vec<TouristSpot> {
        let envelope = AABB::from_corners(bounds[0], bounds[1]);
        self.rtree
            .locate_in_envelope(&envelope)
            .cloned()
            .collect()
    }

    pub fn search_nearest(&self, point: [f64; 2], k: usize) -> Vec<TouristSpot> {
        self.rtree
            .nearest_neighbor_iter(&point)
            .take(k)
            .cloned()
            .collect()
    }

    pub fn filter_spots(&self, filters: &SearchFilters) -> Vec<TouristSpot> {
        use rayon::prelude::*;
        
        self.spots
            .par_iter()
            .filter(|spot| {
                // 高速フィルタリング処理
                let matches_category = filters.categories.is_empty() 
                    || filters.categories.contains(&spot.category);
                let matches_rating = spot.rating >= filters.rating_min;
                let matches_keyword = filters.keywords.is_empty()
                    || spot.name.contains(&filters.keywords);
                
                matches_category && matches_rating && matches_keyword
            })
            .cloned()
            .collect()
    }
}
```

### Phase 4: PMTiles静的配信設定

#### 4.1 PMTilesの生成

```bash
# tippecanoeのインストール
brew install tippecanoe  # macOS
# または
git clone https://github.com/felt/tippecanoe.git
cd tippecanoe
make -j
make install

# GeoJSONからPMTilesへの変換
tippecanoe -o prefectures.pmtiles \
  --no-feature-limit \
  --no-tile-size-limit \
  --minimum-zoom=4 \
  --maximum-zoom=8 \
  --layer=prefectures \
  prefectures.geojson

# 市区町村データ
tippecanoe -o cities.pmtiles \
  --no-feature-limit \
  --no-tile-size-limit \
  --minimum-zoom=7 \
  --maximum-zoom=11 \
  --layer=cities \
  cities.geojson
```

#### 4.2 Vercelでの静的配信設定 (`vercel.json`)

```json
{
  "functions": {
    "src/app/api/spots/route.ts": {
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/tiles/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        },
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/tiles/:path*",
      "destination": "https://cdn.example.com/tiles/:path*"
    }
  ]
}
```

### Phase 5: パフォーマンス最適化

#### 5.1 データフェッチング最適化 (`src/hooks/useSpotSearch.ts`)

```typescript
import useSWR from 'swr';
import { TouristSpot, SearchFilters } from '@/types';

const fetcher = async (url: string, filters: SearchFilters) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters)
  });
  
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
};

export function useSpotSearch(
  area: { level: string; code: string } | null,
  filters: SearchFilters
) {
  const { data, error, isLoading } = useSWR(
    area ? [`/api/search`, filters] : null,
    ([url, filters]) => fetcher(url, filters),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      keepPreviousData: true, // 前のデータを保持
    }
  );

  return {
    spots: data?.spots || [],
    total: data?.total || 0,
    isLoading,
    error
  };
}
```

#### 5.2 Web Worker活用 (`src/workers/dataProcessor.worker.ts`)

```typescript
// 重い処理をWeb Workerで実行
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'PROCESS_GEOJSON':
      const processed = await processGeoJSON(data);
      self.postMessage({ type: 'GEOJSON_PROCESSED', data: processed });
      break;
      
    case 'CALCULATE_CLUSTERS':
      const clusters = calculateClusters(data.spots, data.zoom);
      self.postMessage({ type: 'CLUSTERS_CALCULATED', data: clusters });
      break;
  }
});

function processGeoJSON(geojson: any) {
  // Turf.jsを使った重い地理演算
  // ...
}

function calculateClusters(spots: any[], zoom: number) {
  // Superclusterアルゴリズムでクラスタリング
  // ...
}
```

### Phase 6: Cloud Runデプロイ

#### 6.1 Dockerfile

```dockerfile
# ビルドステージ
FROM rust:1.75 as builder

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release

# 実行ステージ
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/mapnest-backend /usr/local/bin/

EXPOSE 8080

CMD ["mapnest-backend"]
```

#### 6.2 Cloud Runデプロイスクリプト

```bash
#!/bin/bash

# ビルドとプッシュ
docker build -t gcr.io/PROJECT_ID/mapnest-backend .
docker push gcr.io/PROJECT_ID/mapnest-backend

# Cloud Runへデプロイ
gcloud run deploy mapnest-backend \
  --image gcr.io/PROJECT_ID/mapnest-backend \
  --platform managed \
  --region asia-northeast1 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 60 \
  --concurrency 1000 \
  --max-instances 100 \
  --min-instances 1 \
  --allow-unauthenticated
```

## 🎯 パフォーマンス目標

- **初期ロード**: < 2秒
- **地図操作**: 60fps維持
- **API レスポンス**: < 100ms（P95）
- **検索処理**: < 50ms
- **メモリ使用量**: < 200MB（フロントエンド）

## 📊 モニタリング

```typescript
// パフォーマンス計測
export function measurePerformance() {
  // Core Web Vitals
  if (typeof window !== 'undefined' && 'web-vital' in window) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(console.log);
      getFID(console.log);
      getFCP(console.log);
      getLCP(console.log);
      getTTFB(console.log);
    });
  }
}
```

## 🚀 実行とテスト

### 開発環境

```bash
# フロントエンド
npm run dev

# Rustバックエンド
cd rust-backend
cargo watch -x run
```

### プロダクションビルド

```bash
# フロントエンド
npm run build
npm run start

# バックエンド
cargo build --release
./target/release/mapnest-backend
```

## 💡 2024年版の主な改善点

1. **MapLibre GL JS採用**
   - WebGLベースの高速レンダリング
   - 3D表示対応
   - スムーズなアニメーション

2. **PMTiles静的配信**
   - バックエンドの負荷軽減
   - CDN配信で高速化
   - 地理データ処理の簡素化

3. **Rustバックエンド**
   - 1.5倍の性能向上
   - メモリ安全性
   - 並列処理の活用

4. **Cloud Run採用**
   - サーバーレスでコスト削減
   - 自動スケーリング
   - ログ管理の簡素化

5. **Vercel移行**
   - Next.js SSRの完全サポート
   - エッジ関数の活用
   - 自動最適化

## 📚 参考リソース

- [MapLibre GL JS Documentation](https://maplibre.org/maplibre-gl-js/docs/)
- [PMTiles Specification](https://github.com/protomaps/PMTiles)
- [Actix Web Guide](https://actix.rs/)
- [Vercel Documentation](https://vercel.com/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)

---

このガイドは、Comfy 2024年版の最新アーキテクチャを参考に、モダンで高性能な地図検索UIを実装するための包括的な手順です。
