# 階層的地図検索UI実装ガイド

## 📍 概要

都道府県 → 市区町村 → 町・字 → スポットという階層構造で、地図上をクリックしてズームインしながら観光スポットを探索できるインタラクティブな地図UIの実装手順です。

## 🎯 完成イメージ

1. **初期表示**: 日本地図全体が表示され、都道府県ごとに色分け
2. **都道府県クリック**: 選択した都道府県にズームイン、市区町村が色分け表示
3. **市区町村クリック**: 選択した市区町村にズームイン、町・字が色分け表示
4. **町・字クリック**: 最大ズーム、観光スポットのピンが表示

## 🛠️ 技術スタック

- **フロントエンド**: Next.js 14 (App Router) + TypeScript
- **地図ライブラリ**: Leaflet + React Leaflet
- **地理データ**: GeoJSON (国土地理院、e-Stat等)
- **スタイリング**: Tailwind CSS

## 📋 実装手順

### Phase 1: プロジェクトセットアップ

#### 1.1 Next.jsプロジェクトの作成

```bash
# プロジェクト作成
npx create-next-app@latest tourist-map-search --typescript --tailwind --app

cd tourist-map-search

# 必要なパッケージのインストール
npm install leaflet react-leaflet
npm install -D @types/leaflet

# GeoJSON処理用ライブラリ
npm install @turf/turf
```

#### 1.2 Leafletのスタイルシート設定

`app/globals.css`に追加:

```css
@import 'leaflet/dist/leaflet.css';

/* Leafletのアイコン修正 */
.leaflet-default-icon-path {
  background-image: url(https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png);
}
```

#### 1.3 プロジェクト構造の作成

```
tourist-map-search/
├── app/
│   ├── components/
│   │   ├── Map/
│   │   │   ├── MapContainer.tsx
│   │   │   ├── PrefectureLayer.tsx
│   │   │   ├── CityLayer.tsx
│   │   │   ├── DistrictLayer.tsx
│   │   │   └── SpotMarkers.tsx
│   │   └── UI/
│   │       ├── BreadcrumbNav.tsx
│   │       └── InfoPanel.tsx
│   ├── hooks/
│   │   ├── useMapData.ts
│   │   └── useZoomLevel.ts
│   ├── lib/
│   │   ├── geoData.ts
│   │   └── mapUtils.ts
│   ├── types/
│   │   └── map.ts
│   └── data/
│       ├── prefectures/
│       ├── cities/
│       └── spots/
```

### Phase 2: 地理データの準備

#### 2.1 GeoJSONデータの取得

```bash
# データ格納ディレクトリ作成
mkdir -p public/geodata
```

**データソース:**
- 都道府県境界: [国土地理院](https://www.gsi.go.jp/)
- 市区町村境界: [e-Stat](https://www.e-stat.go.jp/)
- [RESAS API](https://opendata.resas-portal.go.jp/)

#### 2.2 データ型定義 (`app/types/map.ts`)

```typescript
export interface GeoFeature {
  type: 'Feature';
  properties: {
    name: string;
    name_ja: string;
    code: string;
    level: 'prefecture' | 'city' | 'district';
    population?: number;
    spotCount?: number;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface TouristSpot {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  description: string;
  images: string[];
  rating: number;
}

export interface MapViewState {
  center: [number, number];
  zoom: number;
  selectedPrefecture?: string;
  selectedCity?: string;
  selectedDistrict?: string;
}
```

### Phase 3: 地図コンポーネントの実装

#### 3.1 メインマップコンテナ (`app/components/Map/MapContainer.tsx`)

```typescript
'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MapViewState } from '@/app/types/map';

// Leafletは動的インポート（SSR対策）
const DynamicMap = dynamic(
  () => import('./DynamicMapContent'),
  { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-gray-100 animate-pulse" />
  }
);

export default function MapContainer() {
  const [viewState, setViewState] = useState<MapViewState>({
    center: [36.2048, 138.2529], // 日本の中心座標
    zoom: 5,
  });

  return (
    <div className="relative w-full h-screen">
      <DynamicMap 
        viewState={viewState}
        onViewStateChange={setViewState}
      />
    </div>
  );
}
```

#### 3.2 動的マップコンテンツ (`app/components/Map/DynamicMapContent.tsx`)

```typescript
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { useState, useEffect } from 'react';
import PrefectureLayer from './PrefectureLayer';
import CityLayer from './CityLayer';
import DistrictLayer from './DistrictLayer';
import SpotMarkers from './SpotMarkers';

interface Props {
  viewState: MapViewState;
  onViewStateChange: (state: MapViewState) => void;
}

export default function DynamicMapContent({ viewState, onViewStateChange }: Props) {
  const [currentZoom, setCurrentZoom] = useState(viewState.zoom);

  // ズームレベルに応じた表示切り替え
  const getVisibleLayers = () => {
    if (currentZoom < 7) return 'prefecture';
    if (currentZoom < 10) return 'city';
    if (currentZoom < 13) return 'district';
    return 'spots';
  };

  return (
    <MapContainer
      center={viewState.center}
      zoom={viewState.zoom}
      className="w-full h-full"
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapEventHandler 
        onZoomChange={setCurrentZoom}
        onViewStateChange={onViewStateChange}
      />

      {getVisibleLayers() === 'prefecture' && (
        <PrefectureLayer 
          onPrefectureClick={(code) => {
            onViewStateChange({
              ...viewState,
              selectedPrefecture: code
            });
          }}
        />
      )}

      {getVisibleLayers() === 'city' && viewState.selectedPrefecture && (
        <CityLayer 
          prefectureCode={viewState.selectedPrefecture}
          onCityClick={(code) => {
            onViewStateChange({
              ...viewState,
              selectedCity: code
            });
          }}
        />
      )}

      {getVisibleLayers() === 'district' && viewState.selectedCity && (
        <DistrictLayer 
          cityCode={viewState.selectedCity}
          onDistrictClick={(code) => {
            onViewStateChange({
              ...viewState,
              selectedDistrict: code
            });
          }}
        />
      )}

      {getVisibleLayers() === 'spots' && viewState.selectedDistrict && (
        <SpotMarkers districtCode={viewState.selectedDistrict} />
      )}
    </MapContainer>
  );
}

// マップイベントハンドラーコンポーネント
function MapEventHandler({ onZoomChange, onViewStateChange }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
    moveend: () => {
      const center = map.getCenter();
      onViewStateChange(prev => ({
        ...prev,
        center: [center.lat, center.lng],
        zoom: map.getZoom()
      }));
    }
  });

  return null;
}
```

#### 3.3 都道府県レイヤー (`app/components/Map/PrefectureLayer.tsx`)

```typescript
import { useEffect, useState } from 'react';
import { GeoJSON } from 'react-leaflet';
import { Layer } from 'leaflet';

interface Props {
  onPrefectureClick: (code: string) => void;
}

export default function PrefectureLayer({ onPrefectureClick }: Props) {
  const [geoData, setGeoData] = useState(null);

  useEffect(() => {
    // GeoJSONデータの読み込み
    fetch('/geodata/prefectures.json')
      .then(res => res.json())
      .then(data => setGeoData(data));
  }, []);

  if (!geoData) return null;

  const getColor = (population: number) => {
    // 人口や観光スポット数に応じた色分け
    return population > 5000000 ? '#800026' :
           population > 3000000 ? '#BD0026' :
           population > 1000000 ? '#E31A1C' :
           population > 500000  ? '#FC4E2A' :
           population > 200000  ? '#FD8D3C' :
           population > 100000  ? '#FEB24C' :
           population > 50000   ? '#FED976' :
                                  '#FFEDA0';
  };

  const style = (feature: any) => ({
    fillColor: getColor(feature.properties.population),
    weight: 2,
    opacity: 1,
    color: 'white',
    dashArray: '3',
    fillOpacity: 0.7
  });

  const onEachFeature = (feature: any, layer: Layer) => {
    layer.on({
      mouseover: (e) => {
        const layer = e.target;
        layer.setStyle({
          weight: 5,
          color: '#666',
          dashArray: '',
          fillOpacity: 0.9
        });
        layer.bringToFront();
      },
      mouseout: (e) => {
        const layer = e.target;
        layer.setStyle(style(feature));
      },
      click: (e) => {
        onPrefectureClick(feature.properties.code);
        // ズームアニメーション
        e.target._map.fitBounds(e.target.getBounds(), {
          padding: [50, 50],
          duration: 0.5
        });
      }
    });

    // ツールチップ
    layer.bindTooltip(
      `<div>
        <strong>${feature.properties.name_ja}</strong><br/>
        観光スポット: ${feature.properties.spotCount || 0}件
      </div>`,
      { sticky: true }
    );
  };

  return (
    <GeoJSON 
      data={geoData}
      style={style}
      onEachFeature={onEachFeature}
    />
  );
}
```

### Phase 4: データ管理とユーティリティ

#### 4.1 カスタムフック (`app/hooks/useMapData.ts`)

```typescript
import { useState, useEffect } from 'react';
import { GeoFeature, TouristSpot } from '@/app/types/map';

export function useMapData(level: string, parentCode?: string) {
  const [data, setData] = useState<GeoFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let url = `/api/geodata/${level}`;
        if (parentCode) {
          url += `?parent=${parentCode}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch data');
        
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [level, parentCode]);

  return { data, loading, error };
}
```

#### 4.2 地図ユーティリティ (`app/lib/mapUtils.ts`)

```typescript
import * as turf from '@turf/turf';

export const calculateCenter = (geometry: any): [number, number] => {
  const center = turf.center(geometry);
  return [
    center.geometry.coordinates[1],
    center.geometry.coordinates[0]
  ];
};

export const calculateBounds = (geometry: any) => {
  const bbox = turf.bbox(geometry);
  return [
    [bbox[1], bbox[0]], // 南西
    [bbox[3], bbox[2]]  // 北東
  ];
};

export const getZoomLevel = (area: number): number => {
  // 面積に基づいた適切なズームレベルの計算
  if (area > 10000) return 7;
  if (area > 1000) return 9;
  if (area > 100) return 11;
  return 13;
};
```

### Phase 5: UIコンポーネント

#### 5.1 パンくずナビゲーション (`app/components/UI/BreadcrumbNav.tsx`)

```typescript
interface Props {
  path: Array<{ name: string; code: string; level: string }>;
  onNavigate: (level: string, code: string) => void;
}

export default function BreadcrumbNav({ path, onNavigate }: Props) {
  return (
    <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3">
      <nav className="flex items-center space-x-2">
        <button
          onClick={() => onNavigate('country', 'japan')}
          className="text-blue-600 hover:text-blue-800"
        >
          日本
        </button>
        
        {path.map((item, index) => (
          <div key={item.code} className="flex items-center space-x-2">
            <span className="text-gray-400">/</span>
            <button
              onClick={() => onNavigate(item.level, item.code)}
              className={`hover:text-blue-800 ${
                index === path.length - 1 ? 'text-gray-900 font-semibold' : 'text-blue-600'
              }`}
            >
              {item.name}
            </button>
          </div>
        ))}
      </nav>
    </div>
  );
}
```

#### 5.2 情報パネル (`app/components/UI/InfoPanel.tsx`)

```typescript
interface Props {
  selectedArea: any;
  spots: TouristSpot[];
  isLoading: boolean;
}

export default function InfoPanel({ selectedArea, spots, isLoading }: Props) {
  return (
    <div className="absolute right-4 top-4 bottom-4 w-80 bg-white rounded-lg shadow-lg overflow-hidden z-[1000]">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold">
          {selectedArea?.name || '地域を選択してください'}
        </h2>
        {selectedArea && (
          <p className="text-sm text-gray-600 mt-1">
            観光スポット: {spots.length}件
          </p>
        )}
      </div>
      
      <div className="overflow-y-auto h-[calc(100%-80px)] p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {spots.map(spot => (
              <div
                key={spot.id}
                className="p-3 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
              >
                <h3 className="font-semibold">{spot.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{spot.category}</p>
                <div className="flex items-center mt-2">
                  <span className="text-yellow-500">★</span>
                  <span className="text-sm ml-1">{spot.rating}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Phase 6: APIエンドポイント

#### 6.1 地理データAPI (`app/api/geodata/[level]/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { level: string } }
) {
  const { level } = params;
  const parentCode = request.nextUrl.searchParams.get('parent');

  try {
    let filePath: string;
    
    switch (level) {
      case 'prefecture':
        filePath = path.join(process.cwd(), 'public/geodata/prefectures.json');
        break;
      case 'city':
        if (!parentCode) {
          return NextResponse.json({ error: 'Parent code required' }, { status: 400 });
        }
        filePath = path.join(process.cwd(), `public/geodata/cities/${parentCode}.json`);
        break;
      case 'district':
        if (!parentCode) {
          return NextResponse.json({ error: 'Parent code required' }, { status: 400 });
        }
        filePath = path.join(process.cwd(), `public/geodata/districts/${parentCode}.json`);
        break;
      default:
        return NextResponse.json({ error: 'Invalid level' }, { status: 400 });
    }

    const data = await fs.readFile(filePath, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load geographic data' },
      { status: 500 }
    );
  }
}
```

### Phase 7: メインページ実装

#### 7.1 メインページ (`app/page.tsx`)

```typescript
import MapContainer from './components/Map/MapContainer';
import BreadcrumbNav from './components/UI/BreadcrumbNav';
import InfoPanel from './components/UI/InfoPanel';

export default function HomePage() {
  return (
    <main className="relative w-full h-screen">
      <MapContainer />
      {/* UIコンポーネントはクライアントコンポーネントとして実装 */}
    </main>
  );
}
```

## 🚀 実行とテスト

### 開発サーバーの起動

```bash
npm run dev
# http://localhost:3000 でアクセス
```

### ビルドとプロダクション実行

```bash
npm run build
npm run start
```

## 📈 パフォーマンス最適化

### 1. GeoJSONデータの最適化

```typescript
// データ簡略化ツール
import * as turf from '@turf/turf';

export function simplifyGeoJSON(geojson: any, tolerance: number = 0.01) {
  return turf.simplify(geojson, { tolerance, highQuality: true });
}
```

### 2. レイヤーの遅延読み込み

```typescript
const PrefectureLayer = lazy(() => import('./PrefectureLayer'));
const CityLayer = lazy(() => import('./CityLayer'));
```

### 3. データキャッシング

```typescript
// SWRまたはReact Queryの使用
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useGeoData(url: string) {
  const { data, error, isLoading } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  
  return { data, error, isLoading };
}
```

## 🎨 スタイリングのカスタマイズ

### カラーパレット定義

```css
/* app/styles/map-theme.css */
:root {
  --color-level-1: #FFEDA0;
  --color-level-2: #FED976;
  --color-level-3: #FEB24C;
  --color-level-4: #FD8D3C;
  --color-level-5: #FC4E2A;
  --color-level-6: #E31A1C;
  --color-level-7: #BD0026;
  --color-level-8: #800026;
}

.map-container {
  filter: contrast(1.1) brightness(1.05);
}
```

## 🐛 トラブルシューティング

### よくある問題と解決方法

1. **Leafletアイコンが表示されない**
   - `_app.tsx`でCSSを正しくインポートしているか確認
   - 動的インポートを使用しているか確認

2. **GeoJSONが大きすぎる**
   - Mapshaper.orgなどでデータを簡略化
   - TopoJSONフォーマットの使用を検討

3. **ズーム時のパフォーマンス問題**
   - React.memoを使用してコンポーネントを最適化
   - requestAnimationFrameでレンダリングを制御

## 📚 参考リソース

- [Leaflet Documentation](https://leafletjs.com/)
- [React Leaflet](https://react-leaflet.js.org/)
- [国土地理院 地理院地図](https://maps.gsi.go.jp/)
- [e-Stat 地図で見る統計](https://www.e-stat.go.jp/gis)
- [Turf.js](https://turfjs.org/)
- [Mapshaper](https://mapshaper.org/)

## 📝 次のステップ

- [ ] 検索バーの実装
- [ ] フィルター機能の追加
- [ ] スポット詳細情報の表示
- [ ] ルート検索機能
- [ ] お気に入り機能
- [ ] PWA対応
- [ ] 多言語対応

## 💡 Tips

- GeoJSONファイルは圧縮して配信サイズを削減
- 必要に応じてWebWorkerで重い処理をオフロード
- インデックスDBでオフラインキャッシュ実装
- ベクタータイルの使用を検討（大規模データの場合）

---

このガイドに従って実装することで、Comfyのような階層的でインタラクティブな地図検索UIを構築できます。
