/**
 * マップ設定とレイヤー定義
 * MapLibre GL JSマップのスタイリングとレイヤー管理のための中央集約設定
 * @namespace MapConfig
 */
const MapConfig = {
    /** @type {string} PMTilesファイルのURL */
    PMTILES_URL: 'http://localhost:8080/tiles/japan_all_levels_unified.pmtiles',
    
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
                    }
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
            // 市区町村レベル (Z8-11)
            {
                'id': 'municipalities-fill',
                'type': 'fill',
                'source': 'pmtiles_source',
                'source-layer': 'japan_unified',
                'minzoom': 8,
                'maxzoom': 11,
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
                'maxzoom': 11,
                'filter': ['==', ['get', 'level'], 'municipality'],
                'paint': {
                    'line-color': '#333333',
                    'line-width': 1,
                    'line-opacity': 0.8
                }
            },
            // 詳細レベル (Z11+)
            {
                'id': 'detailed-fill',
                'type': 'fill',
                'source': 'pmtiles_source',
                'source-layer': 'japan_unified',
                'minzoom': 11,
                'filter': ['==', ['get', 'level'], 'detailed'],
                'paint': {
                    'fill-color': ['get', 'color'],
                    'fill-opacity': 0.7
                }
            },
            {
                'id': 'detailed-stroke',
                'type': 'line',
                'source': 'pmtiles_source',
                'source-layer': 'japan_unified',
                'minzoom': 11,
                'filter': ['==', ['get', 'level'], 'detailed'],
                'paint': {
                    'line-color': '#333333',
                    'line-width': 0.5,
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
            {
                'id': 'search-pins',
                'type': 'circle',
                'source': 'search-pins',
                'paint': {
                    'circle-radius': 6,
                    'circle-color': '#FF4500',
                    'circle-stroke-color': '#FFFFFF',
                    'circle-stroke-width': 2
                }
            },
            {
                'id': 'search-labels',
                'type': 'symbol',
                'source': 'search-pins',
                'layout': {
                    'text-field': '📍',
                    'text-size': 16,
                    'text-offset': [0, 0]
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
    interactiveLayers: ['regions-fill', 'prefectures-fill', 'municipalities-fill', 'detailed-fill', 'search-pins']
};