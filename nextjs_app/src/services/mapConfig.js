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
                'search-area': {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: []
                    }
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
                ...this.getSearchAreaLayers()
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
     * 検索範囲可視化レイヤーを取得
     * @returns {Array} 検索範囲の塗りつぶしと枠線レイヤー配列
     */
    getSearchAreaLayers() {
        return [
            {
                'id': 'search-area-fill',
                'type': 'fill',
                'source': 'search-area',
                'paint': {
                    'fill-color': '#ff0000',
                    'fill-opacity': 0.1
                }
            },
            {
                'id': 'search-area-outline',
                'type': 'line',
                'source': 'search-area',
                'paint': {
                    'line-color': '#ff0000',
                    'line-width': 2,
                    'line-opacity': 0.8
                }
            }
        ];
    },
    
    /** @type {Array<string>} インタラクティブなレイヤーのID一覧 */
    interactiveLayers: ['regions-fill', 'prefectures-fill', 'municipalities-fill', 'search-pins', 'search-clusters']
};

export default MapConfig;