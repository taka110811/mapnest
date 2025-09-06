# レイヤー管理システム

MapNestでは、MapLibre GL JSの宣言的レイヤー管理を採用し、効率的で拡張性の高いマップレンダリングを実現しています。

## 概要

従来の命令的なレイヤー操作（`map.addLayer()` / `map.removeLayer()`）ではなく、`map.setStyle()` を使った宣言的な手法を採用しています。これにより以下のメリットを得られます：

- **パフォーマンス向上**: MapLibre GL JSの差分レンダリングを活用
- **状態管理の簡素化**: レイヤーの可視性と状態を一元管理
- **拡張性の向上**: 新しいレイヤーを簡単に追加・管理可能

## アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MapConfig     │    │   useMapStyle   │    │     useMap      │
│                 │    │                 │    │                 │
│ ・レイヤー定義  │◄───┤ ・可視性管理    │◄───┤ ・マップ初期化  │
│ ・スタイル設定  │    │ ・動的データ管理│    │ ・イベント処理  │
│ ・ソース定義    │    │ ・スタイル計算  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       │                       │
         │                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ LayerControls   │    │  MapContainer   │    │  SearchPanel    │
│                 │    │                 │    │                 │
│ ・UI制御        │    │ ・イベント統合  │    │ ・検索管理      │
│ ・デバッグ機能  │    │ ・レンダリング  │    │ ・データ更新    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 主要コンポーネント

### 1. MapConfig (`src/services/mapConfig.js`)

マップの基本設定とレイヤー定義を管理します。

```javascript
const MapConfig = {
    // PMTilesファイルのURL
    PMTILES_URL: process.env.NODE_ENV === 'production' 
        ? '/api/tiles/japan_3layers_light.pmtiles'
        : 'http://localhost:8080/tiles/japan_3layers_light.pmtiles',
    
    // レイヤーカテゴリー定義
    layerCategories: {
        base: ['osm-tiles'],
        administrative: ['regions-fill', 'regions-stroke', ...],
        searchResults: ['search-clusters', 'search-cluster-count', 'search-pins']
    },
    
    // デフォルト可視性設定
    defaultLayerVisibility: {
        regions: true,
        prefectures: true,
        municipalities: true,
        searchPins: true,
        searchClusters: true,
        osmTiles: true
    }
};
```

**主要メソッド：**
- `getMapStyle(pmtilesUrl)`: 基本マップスタイルを返す
- `getAdministrativeLayers()`: 行政区域レイヤーを返す
- `getSearchPinLayers()`: 検索結果レイヤーを返す
- `getStyleTemplate(pmtilesUrl)`: 宣言的管理用テンプレートを返す
- `getBaseSources(pmtilesUrl)`: ベースソース定義を返す

### 2. useMapStyle (`src/hooks/useMapStyle.js`)

レイヤーの可視性と動的データを管理するReactフックです。

```javascript
export default function useMapStyle(pmtilesUrl) {
    // レイヤー可視性の状態管理
    const [layerVisibility, setLayerVisibility] = useState({ ... });
    
    // 動的レイヤーデータの状態管理
    const [dynamicLayers, setDynamicLayers] = useState({ ... });
    
    // 宣言的スタイル計算
    const currentMapStyle = useMemo(() => {
        // フィルタリングとカテゴリー色の適用
    }, [mapStyle, layerVisibility, dynamicLayers]);
    
    return {
        mapStyle: currentMapStyle,
        toggleLayer,
        updateSearchPins,
        layerVisibility,
        dynamicLayers
    };
}
```

**主要機能：**
- **可視性管理**: レイヤーのON/OFF切り替え
- **動的データ管理**: 検索結果ピンなどのリアルタイム更新
- **スタイル計算**: 可視性とデータに基づくスタイル生成
- **カテゴリー色適用**: 検索カテゴリーに応じたピンの色変更

### 3. useMap (`src/hooks/useMap.js`)

MapLibre GL JSマップインスタンスの初期化と管理を行います。

```javascript
export default function useMap(containerId) {
    const [map, setMap] = useState(null);
    const [zoom, setZoom] = useState(5);
    const [isLoaded, setIsLoaded] = useState(false);
    
    // 宣言的スタイル管理フックを使用
    const {
        mapStyle,
        toggleLayer,
        updateSearchPins,
        layerVisibility,
        dynamicLayers
    } = useMapStyle(MapConfig.PMTILES_URL);
    
    // スタイル更新エフェクト
    useEffect(() => {
        if (!map || !isLoaded) return;
        map.setStyle(mapStyle);
    }, [map, isLoaded, mapStyle]);
    
    return { map, zoom, isLoaded, toggleLayer, updateSearchPins, layerVisibility };
}
```

**主要機能：**
- **マップ初期化**: MapLibre GL JSインスタンスの作成
- **PMTiles統合**: ベクタータイルデータソースの設定
- **スタイル更新**: 宣言的スタイルの適用
- **イベント管理**: ズーム・移動イベントの処理

### 4. useSearch (`src/hooks/useSearch.js`)

検索機能と検索結果の管理を行います。

```javascript
export default function useSearch(updateSearchPins) {
    const [searchState, setSearchState] = useState({ ... });
    
    // 市区町村ベース検索
    const executeAreaSearch = useCallback(async (map, category, prefecture, municipality, cuisine) => {
        // Overpass API クエリの実行
        // 検索結果をupdateSearchPinsで更新
    }, [updateSearchPins]);
    
    // 検索データクリア
    const clearSearchData = useCallback((map) => {
        updateSearchPins([], '');
    }, [updateSearchPins]);
    
    return { searchState, executeAreaSearch, clearSearchData };
}
```

**主要機能：**
- **市区町村ベース検索**: 指定された市区町村内でのPOI検索
- **検索状態管理**: 検索中・結果・エラー状態の管理
- **データクリア**: 検索結果の削除

## レイヤー構成

### 1. 行政区域レイヤー

```javascript
administrative: [
    'regions-fill',      // 地方塗りつぶし
    'regions-stroke',    // 地方境界線
    'prefectures-fill',  // 都道府県塗りつぶし
    'prefectures-stroke', // 都道府県境界線
    'municipalities-fill', // 市区町村塗りつぶし
    'municipalities-stroke' // 市区町村境界線
]
```

**特徴：**
- ズームレベルに応じた階層表示
- 地方（Z3-6）→ 都道府県（Z6-8）→ 市区町村（Z8+）
- PMTilesベクタータイルから描画

### 2. 検索結果レイヤー

```javascript
searchResults: [
    'search-clusters',        // クラスター円
    'search-cluster-count',   // クラスター数値
    'search-pins'            // 個別検索ピン
]
```

**特徴：**
- 動的クラスタリング（MapLibre GL JS内蔵）
- カテゴリー別色分け
- インタラクティブなクリック処理

### 3. ベースマップレイヤー

```javascript
base: ['osm-tiles']  // OpenStreetMapラスタータイル
```

## データフロー

### 1. レイヤー可視性の変更

```
LayerControls.toggleButton
        ↓
useMapStyle.toggleLayer()
        ↓
layerVisibility状態更新
        ↓
currentMapStyle再計算
        ↓
map.setStyle(newStyle)
```

### 2. 検索結果の表示

```
SearchPanel.municipalitySelection
        ↓
useSearch.executeAreaSearch()
        ↓
Overpass API クエリ実行
        ↓
useMapStyle.updateSearchPins()
        ↓
dynamicLayers.searchPins更新
        ↓
currentMapStyle再計算
        ↓
map.setStyle(newStyle)
```

## 使用例

### レイヤーの可視性切り替え

```javascript
const { toggleLayer } = useMap('map');

// 市区町村レイヤーを非表示
toggleLayer('municipalities', false);

// 検索ピンレイヤーを切り替え
toggleLayer('searchPins');
```

### 検索結果の表示

```javascript
const { updateSearchPins } = useMapStyle();

// 検索結果を表示
updateSearchPins([
    {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [139.7671, 35.6812] },
        properties: { name: 'レストラン', category: 'restaurant' }
    }
], 'restaurant');

// 検索結果をクリア
updateSearchPins([], '');
```

### 新しいレイヤーの追加

1. **MapConfig.jsでレイヤー定義**
```javascript
layerCategories: {
    // 既存カテゴリー
    newCategory: ['new-layer-id']
}

getNewLayers() {
    return [{
        'id': 'new-layer-id',
        'type': 'circle',
        'source': 'new-source',
        'paint': { ... }
    }];
}
```

2. **useMapStyleで可視性管理**
```javascript
const [layerVisibility, setLayerVisibility] = useState({
    // 既存設定
    newLayer: true
});
```

3. **フィルタリング処理追加**
```javascript
.filter(layer => {
    // 既存条件
    if (layer.id === 'new-layer-id' && !layerVisibility.newLayer) return false;
    return true;
})
```

## パフォーマンス最適化

### 1. メモ化の活用
- `useMemo`でスタイル計算を最適化
- `useCallback`でイベントハンドラーを安定化

### 2. 差分レンダリング
- MapLibre GL JSの内蔵差分エンジンを活用
- 必要な部分のみ再描画

### 3. クラスタリング
- 大量ピンの描画パフォーマンス向上
- ズームレベルに応じた動的集約

## デバッグとツール

### LayerControls コンポーネント

開発・デバッグ用のレイヤー制御UIを提供します：

- **レイヤー切り替え**: 各レイヤーの可視性をリアルタイム制御
- **テストピン追加**: 検索結果表示のテスト機能
- **デバッグ情報**: マップ状態・レイヤー情報の出力
- **市区町村選択テスト**: 市区町村選択機能のテスト

### コンソールログ

各コンポーネントで詳細なログを出力：
- `🎨 宣言的スタイル更新を実行`
- `🔍 検索結果: N件発見`
- `🏛️ 市区町村選択: XXX`

## ベストプラクティス

### 1. 状態管理
- レイヤー状態は単一の情報源（useMapStyle）で管理
- 副作用は useEffect で制御
- 状態更新は不変性を保持

### 2. パフォーマンス
- 頻繁な状態更新はデバウンス処理
- 大きなデータセットはクラスタリング活用
- 不要な再レンダリングを避ける

### 3. 拡張性
- 新しいレイヤーは既存パターンに従って追加
- カテゴリー別に整理された構成を維持
- 設定は MapConfig で一元管理

## トラブルシューティング

### よくある問題

1. **レイヤーが表示されない**
   - LayerControlsでレイヤー可視性を確認
   - コンソールでスタイル更新ログを確認
   - MapConfig のレイヤー定義を確認

2. **検索結果が表示されない**
   - updateSearchPins の呼び出しを確認
   - searchPins レイヤーの可視性を確認
   - 検索データの形式を確認

3. **パフォーマンスの問題**
   - クラスタリング設定を確認
   - 不要な再レンダリングをReact DevToolsで確認
   - メモ化の依存配列を確認

### ログ出力での確認

```javascript
// デバッグ情報の確認
console.log('🔍 現在のlayerVisibility:', layerVisibility);
console.log('🔍 マップのソース:', map.getStyle().sources);
console.log('🔍 マップのレイヤー:', map.getStyle().layers.map(l => l.id));
```