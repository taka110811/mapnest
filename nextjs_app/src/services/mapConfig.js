/**
 * マップ設定とレイヤー定義
 * MapLibre GL JSマップのスタイリングとレイヤー管理のための中央集約設定
 * @namespace MapConfig
 */
const MapConfig = {
    /** @type {string} PMTilesファイルのURL */
    PMTILES_URL: process.env.NODE_ENV === 'production' 
        ? '/api/tiles/japan_3layers_light.pmtiles'
        : 'http://localhost:8080/tiles/japan_3layers_light.pmtiles',
    
    /** @type {Object} マップ初期化オプション */
    mapOptions: {
        container: 'map',
        zoom: 5,
        center: [138.2529, 36.2048]
    },
    
    /**
     * ベースマップスタイルの設定を取得
     * @param {string} pmtilesUrl - PMTilesファイルのURL
     * @returns {Object} MapLibre GL JSスタイル仕様
     */
    getMapStyle(pmtilesUrl) {
        return {
            version: 8,
            glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
            sources: {
                'osm-raster': {
                    type: 'raster',
                    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                },
                'pmtiles_source': {
                    type: 'vector',
                    url: `pmtiles://${pmtilesUrl}`,
                    attribution: 'PMTiles Vector Data'
                },
                'search-pins': {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: []
                    },
                    cluster: true,
                    clusterMaxZoom: 14,
                    clusterRadius: 50
                },
                'favorites-pins': {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: []
                    },
                    cluster: false
                }
            },
            layers: [
                {
                    'id': 'osm-tiles',
                    'type': 'raster',
                    'source': 'osm-raster',
                    'minzoom': 0,
                    'maxzoom': 22
                },
                ...this.getAdministrativeLayers(),
                ...this.getSearchPinLayers(),
                ...this.getFavoritesPinLayers()
            ]
        };
    },
    
    /**
     * 行政区域境界レイヤーを取得
     * @returns {Array} 行政区域レイヤー配列（地方、都道府県、市区町村、詳細レベル）
     */
    getAdministrativeLayers() {
        return [
            // 地方レベル (Z3-6)
            {
                'id': 'regions-fill',
                'type': 'fill',
                'source': 'pmtiles_source',
                'source-layer': 'japan_unified',
                'minzoom': 3,
                'maxzoom': 6,
                'filter': ['==', ['get', 'level'], 'region'],
                'paint': {
                    'fill-color': ['get', 'color'],
                    'fill-opacity': 0.7
                }
            },
            {
                'id': 'regions-stroke',
                'type': 'line',
                'source': 'pmtiles_source',
                'source-layer': 'japan_unified',
                'minzoom': 3,
                'maxzoom': 6,
                'filter': ['==', ['get', 'level'], 'region'],
                'paint': {
                    'line-color': '#333333',
                    'line-width': 2,
                    'line-opacity': 0.8
                }
            },
            // 都道府県レベル (Z6-8)
            {
                'id': 'prefectures-fill',
                'type': 'fill',
                'source': 'pmtiles_source',
                'source-layer': 'japan_unified',
                'minzoom': 6,
                'maxzoom': 8,
                'filter': ['==', ['get', 'level'], 'prefecture'],
                'paint': {
                    'fill-color': ['get', 'color'],
                    'fill-opacity': 0.7
                }
            },
            {
                'id': 'prefectures-stroke',
                'type': 'line',
                'source': 'pmtiles_source',
                'source-layer': 'japan_unified',
                'minzoom': 6,
                'maxzoom': 8,
                'filter': ['==', ['get', 'level'], 'prefecture'],
                'paint': {
                    'line-color': '#333333',
                    'line-width': 1.5,
                    'line-opacity': 0.8
                }
            },
            // 市区町村レベル (Z8+)
            {
                'id': 'municipalities-fill',
                'type': 'fill',
                'source': 'pmtiles_source',
                'source-layer': 'japan_unified',
                'minzoom': 8,
                'filter': ['==', ['get', 'level'], 'municipality'],
                'paint': {
                    'fill-color': ['get', 'color'],
                    'fill-opacity': 0.7
                }
            },
            {
                'id': 'municipalities-stroke',
                'type': 'line',
                'source': 'pmtiles_source',
                'source-layer': 'japan_unified',
                'minzoom': 8,
                'filter': ['==', ['get', 'level'], 'municipality'],
                'paint': {
                    'line-color': '#333333',
                    'line-width': 1,
                    'line-opacity': 0.8
                }
            }
        ];
    },
    
    /**
     * 検索結果ピン表示レイヤーを取得
     * @returns {Array} 検索結果ピンとラベルのレイヤー配列
     */
    getSearchPinLayers() {
        return [
            // クラスター円
            {
                'id': 'search-clusters',
                'type': 'circle',
                'source': 'search-pins',
                'filter': ['has', 'point_count'],
                'paint': {
                    'circle-color': [
                        'step',
                        ['get', 'point_count'],
                        '#51bbd6',  // 2-9 points
                        10, '#f1c40f',  // 10-49 points
                        50, '#e67e22',  // 50-99 points
                        100, '#e74c3c'  // 100+ points
                    ],
                    'circle-radius': [
                        'step',
                        ['get', 'point_count'],
                        15,  // 2-9 points
                        10, 20,  // 10-49 points
                        50, 25,  // 50-99 points
                        100, 30  // 100+ points
                    ],
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#FFFFFF'
                }
            },
            // クラスター数値
            {
                'id': 'search-cluster-count',
                'type': 'symbol',
                'source': 'search-pins',
                'filter': ['has', 'point_count'],
                'layout': {
                    'text-field': '{point_count_abbreviated}',
                    'text-font': ['Noto Sans Regular'],
                    'text-size': 12,
                    'text-allow-overlap': true
                },
                'paint': {
                    'text-color': '#FFFFFF'
                }
            },
            // 個別ピン
            {
                'id': 'search-pins',
                'type': 'circle',
                'source': 'search-pins',
                'filter': ['!', ['has', 'point_count']],
                'paint': {
                    'circle-color': '#FF4500',
                    'circle-radius': 6,
                    'circle-stroke-color': '#FFFFFF',
                    'circle-stroke-width': 2
                }
            }
        ];
    },
    
    /**
     * お気に入りピン表示レイヤーを取得
     * @returns {Array} お気に入りピンとラベルのレイヤー配列
     */
    getFavoritesPinLayers() {
        return [
            // お気に入りピン
            {
                'id': 'favorites-pins',
                'type': 'circle',
                'source': 'favorites-pins',
                'paint': {
                    'circle-color': '#FFD700',
                    'circle-radius': 8,
                    'circle-stroke-color': '#FF6B6B',
                    'circle-stroke-width': 3,
                    'circle-opacity': 0.9
                }
            },
            // お気に入りピンラベル
            {
                'id': 'favorites-labels',
                'type': 'symbol',
                'source': 'favorites-pins',
                'layout': {
                    'text-field': '{name}',
                    'text-font': ['Noto Sans Regular'],
                    'text-size': 11,
                    'text-offset': [0, 1.8],
                    'text-anchor': 'top',
                    'text-allow-overlap': false,
                    'text-ignore-placement': false
                },
                'paint': {
                    'text-color': '#333333',
                    'text-halo-color': '#FFFFFF',
                    'text-halo-width': 2
                }
            }
        ];
    },
    
    /** @type {Array<string>} インタラクティブなレイヤーのID一覧 */
    interactiveLayers: ['regions-fill', 'prefectures-fill', 'municipalities-fill', 'search-pins', 'search-clusters', 'favorites-pins'],
    
    /**
     * レイヤーの階層構造定義
     * 宣言的レイヤー管理で使用される
     */
    layerCategories: {
        base: ['osm-tiles'],
        administrative: ['regions-fill', 'regions-stroke', 'prefectures-fill', 'prefectures-stroke', 'municipalities-fill', 'municipalities-stroke'],
        searchResults: ['search-clusters', 'search-cluster-count', 'search-pins'],
        favorites: ['favorites-pins', 'favorites-labels']
    },
    
    /**
     * レイヤーのデフォルト可視性設定
     */
    defaultLayerVisibility: {
        regions: true,
        prefectures: true,
        municipalities: true,
        searchPins: true,
        searchClusters: true,
        favorites: true,
        favoritesLabels: true,
        osmTiles: true
    },
    
    /**
     * 宣言的スタイル更新のためのスタイルテンプレートを取得
     * @param {string} pmtilesUrl - PMTilesファイルのURL
     * @returns {Object} MapLibre GL JSスタイル仕様のテンプレート
     */
    getStyleTemplate(pmtilesUrl) {
        return {
            version: 8,
            glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
            sources: this.getBaseSources(pmtilesUrl),
            layers: []
        };
    },
    
    /**
     * ベースソース定義を取得
     * @param {string} pmtilesUrl - PMTilesファイルのURL
     * @returns {Object} ソース定義オブジェクト
     */
    getBaseSources(pmtilesUrl) {
        return {
            'osm-raster': {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            },
            'pmtiles_source': {
                type: 'vector',
                url: `pmtiles://${pmtilesUrl}`,
                attribution: 'PMTiles Vector Data'
            },
            'search-pins': {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                },
                cluster: true,
                clusterMaxZoom: 14,
                clusterRadius: 50
            },
            'favorites-pins': {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                },
                cluster: false
            }
        };
    }
};

export default MapConfig;