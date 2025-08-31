// Map configuration and layer definitions
const MapConfig = {
    PMTILES_URL: 'http://localhost:8080/tiles/japan_all_levels_unified.pmtiles',
    
    // Map initialization options
    mapOptions: {
        container: 'map',
        zoom: 5,
        center: [138.2529, 36.2048]
    },
    
    // Base map style configuration
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
                'yakiniku-pins': {
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
                ...this.getYakinikuLayers(),
                ...this.getSearchAreaLayers()
            ]
        };
    },
    
    // Administrative boundary layers
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
    
    // Yakiniku restaurant layers
    getYakinikuLayers() {
        return [
            {
                'id': 'yakiniku-pins',
                'type': 'circle',
                'source': 'yakiniku-pins',
                'paint': {
                    'circle-radius': 6,
                    'circle-color': '#FF4500',
                    'circle-stroke-color': '#FFFFFF',
                    'circle-stroke-width': 2
                }
            },
            {
                'id': 'yakiniku-labels',
                'type': 'symbol',
                'source': 'yakiniku-pins',
                'layout': {
                    'text-field': '🥩',
                    'text-size': 16,
                    'text-offset': [0, 0]
                }
            }
        ];
    },
    
    // Search area visualization layers
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
    
    // Interactive layer IDs
    interactiveLayers: ['regions-fill', 'prefectures-fill', 'municipalities-fill', 'detailed-fill', 'yakiniku-pins']
};