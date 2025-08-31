// Add PMTiles protocol
const protocol = new pmtiles.Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

const PMTILES_URL = 'http://localhost:8080/tiles/japan_all_levels_unified.pmtiles';
const p = new pmtiles.PMTiles(PMTILES_URL);
protocol.add(p);

// Fetch header and create map
p.getHeader().then(h => {
    console.log('PMTiles header:', h);
    
    // メタデータも取得
    p.getMetadata().then(metadata => {
        console.log('PMTiles metadata:', metadata);
        if (metadata && metadata.vector_layers) {
            console.log('Available vector layers:', metadata.vector_layers);
            metadata.vector_layers.forEach(layer => {
                console.log(`Layer: ${layer.id}, Fields:`, layer.fields);
            });
        }
    }).catch(err => console.error('Metadata error:', err));
    
    const map = new maplibregl.Map({
        container: 'map',
        zoom: 5,
        center: [138.2529, 36.2048],
        style: {
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
                    url: `pmtiles://${PMTILES_URL}`,
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
                },
                // 焼肉店のピン
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
                // 焼肉店のラベル
                {
                    'id': 'yakiniku-labels',
                    'type': 'symbol',
                    'source': 'yakiniku-pins',
                    'layout': {
                        'text-field': '🥩',
                        'text-size': 16,
                        'text-offset': [0, 0]
                    }
                },
                // 検索範囲の表示
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
            ]
        }
    });

    map.on('load', () => {
        console.log('Map loaded successfully');
        
        // ソース情報を確認
        const source = map.getSource('pmtiles_source');
        console.log('Source:', source);
        
        // 利用可能なレイヤーを確認
        setTimeout(() => {
            try {
                // ソースレイヤーを指定せずに全フィーチャーをクエリ
                const allFeatures = map.querySourceFeatures('pmtiles_source');
                console.log('All features found:', allFeatures.length);
                
                // レイヤー構造とプロパティの詳細調査
                if (allFeatures.length > 0) {
                    console.log('=== PMTiles Layer Analysis ===');
                    console.log('Total features found:', allFeatures.length);
                    console.log('Sample feature:', allFeatures[0]);
                    console.log('Source layer from feature:', allFeatures[0].sourceLayer);
                    console.log('Feature properties:', allFeatures[0].properties);
                    
                    // level プロパティの確認
                    const levelValues = [...new Set(allFeatures.map(f => f.properties.level))].filter(Boolean);
                    console.log('Available level values:', levelValues);
                    
                    // 各階層のフィーチャー数
                    levelValues.forEach(level => {
                        const count = allFeatures.filter(f => f.properties.level === level).length;
                        console.log(`${level}: ${count} features`);
                        
                        // 各階層のサンプル
                        const sample = allFeatures.find(f => f.properties.level === level);
                        if (sample) {
                            console.log(`${level} sample properties:`, sample.properties);
                        }
                    });
                    
                    // color プロパティの確認
                    const colorValues = [...new Set(allFeatures.map(f => f.properties.color))].filter(Boolean);
                    console.log('Available color values:', colorValues);
                }
                
                // 可能性のあるソースレイヤー名を再確認
                const possibleLayers = ['default', 'japan', 'japan_ver85', 'boundaries', 'layer0', 'data', 'regions', 'prefectures', 'municipalities', 'detailed'];
                possibleLayers.forEach(layerName => {
                    const layerFeatures = map.querySourceFeatures('pmtiles_source', { sourceLayer: layerName });
                    if (layerFeatures.length > 0) {
                        console.log(`Layer '${layerName}' has ${layerFeatures.length} features`);
                    }
                });
            } catch (error) {
                console.error('Error querying features:', error);
            }
        }, 3000);
    });

    // ズームレベル変更時の情報更新
    function updateLayerInfo(zoom) {
        let layerName = '';
        if (zoom >= 3 && zoom < 6) {
            layerName = '地方';
        } else if (zoom >= 6 && zoom < 8) {
            layerName = '都道府県';
        } else if (zoom >= 8 && zoom < 11) {
            layerName = '市区町村';
        } else if (zoom >= 11) {
            layerName = '詳細';
        }
        
        document.getElementById('current-zoom').textContent = zoom.toFixed(1);
        document.getElementById('current-layer').textContent = layerName;
    }

    map.on('load', () => {
        updateLayerInfo(map.getZoom());
        // 初回は焼肉店データを読み込まない（ズーム時に読み込む）
    });
    
    // Overpass APIから焼肉店データを取得（画面中央付近の範囲）
    async function loadYakinikuShops() {
        console.log('焼肉店データの取得を開始...');
        
        // 現在の画面中央から半径約1km範囲を計算
        const center = map.getCenter();
        const zoom = map.getZoom();
        
        // ズームレベルに応じた検索範囲を調整（範囲をさらに大きく）
        const range = zoom >= 12 ? 0.015 : zoom >= 10 ? 0.03 : zoom >= 9 ? 0.05 : 0.07; // 約1.5km, 3km, 5km, 7km
        
        const south = center.lat - range;
        const west = center.lng - range;
        const north = center.lat + range;
        const east = center.lng + range;
        
        console.log(`検索範囲: ${south.toFixed(4)}, ${west.toFixed(4)}, ${north.toFixed(4)}, ${east.toFixed(4)}`);
        
        try {
            // より効率的な検索クエリ（画面中央付近のみ）
            const overpassQuery = `
                [out:json][timeout:15];
                (
                  node["amenity"="restaurant"]["cuisine"~"yakiniku|bbq|korean"](${south.toFixed(6)},${west.toFixed(6)},${north.toFixed(6)},${east.toFixed(6)});
                  node["amenity"="restaurant"]["name"~"焼肉|焼き肉|ヤキニク|カルビ|YAKINIKU"](${south.toFixed(6)},${west.toFixed(6)},${north.toFixed(6)},${east.toFixed(6)});
                  way["amenity"="restaurant"]["cuisine"~"yakiniku|bbq|korean"](${south.toFixed(6)},${west.toFixed(6)},${north.toFixed(6)},${east.toFixed(6)});
                  way["amenity"="restaurant"]["name"~"焼肉|焼き肉|ヤキニク|カルビ|YAKINIKU"](${south.toFixed(6)},${west.toFixed(6)},${north.toFixed(6)},${east.toFixed(6)});
                );
                out center;
            `;
            
            console.log('Overpass APIクエリ実行中（画面中央付近）...');
            console.log('実際のクエリ:', overpassQuery);
            const response = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: 'data=' + encodeURIComponent(overpassQuery)
            });
            
            const data = await response.json();
            console.log('Overpass API レスポンス:', data);
            
            let features = [];
            
            if (data.elements && data.elements.length > 0) {
                features = data.elements
                    .filter(element => {
                        // ノードの場合は直接座標をチェック
                        if (element.type === 'node' && element.lat && element.lon) {
                            return true;
                        }
                        // ウェイの場合は中心座標をチェック
                        if (element.type === 'way' && element.center && element.center.lat && element.center.lon) {
                            return true;
                        }
                        return false;
                    })
                    .map(element => {
                        let coords;
                        if (element.type === 'node') {
                            coords = [element.lon, element.lat];
                        } else if (element.type === 'way' && element.center) {
                            coords = [element.center.lon, element.center.lat];
                        }
                        
                        return {
                            type: 'Feature',
                            geometry: {
                                type: 'Point',
                                coordinates: coords
                            },
                            properties: {
                                name: element.tags?.name || '焼肉店',
                                cuisine: element.tags?.cuisine || 'yakiniku',
                                address: element.tags?.['addr:full'] || element.tags?.['addr:city'] || '',
                                phone: element.tags?.phone || '',
                                website: element.tags?.website || ''
                            }
                        };
                    });
                
                console.log(`画面中央付近で ${features.length}件の焼肉店を発見しました`);
            } else {
                console.log('画面中央付近に焼肉店が見つかりませんでした');
            }
            
            // データをマップに追加
            map.getSource('yakiniku-pins').setData({
                type: 'FeatureCollection',
                features: features
            });
            
        } catch (error) {
            console.error('Overpass API エラー:', error);
            // エラー時は空のデータを表示
            map.getSource('yakiniku-pins').setData({
                type: 'FeatureCollection',
                features: []
            });
        }
    }

    let lastYakinikuZoom = -1;
    let yakinikuDataLoaded = false;
    let lastSearchCenter = null;
    let searchTimeout = null;
    
    // 検索範囲を更新する関数
    function updateSearchArea() {
        const currentZoom = map.getZoom();
        const center = map.getCenter();
        
        if (currentZoom >= 8) {  // 上限を削除
            // ズームレベルに応じた検索範囲を計算（範囲をさらに大きく）
            const range = currentZoom >= 12 ? 0.015 : currentZoom >= 10 ? 0.03 : currentZoom >= 9 ? 0.05 : 0.07;
            
            const south = center.lat - range;
            const west = center.lng - range;
            const north = center.lat + range;
            const east = center.lng + range;
            
            // 検索範囲を地図上に表示
            const searchAreaFeature = {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [west, south],
                        [east, south],
                        [east, north],
                        [west, north],
                        [west, south]
                    ]]
                },
                properties: {
                    description: '焼肉店検索範囲'
                }
            };
            
            map.getSource('search-area').setData({
                type: 'FeatureCollection',
                features: [searchAreaFeature]
            });
            
            // 検索範囲が変わったら検索を実行（デバウンス付き）
            const currentCenter = `${center.lat.toFixed(6)},${center.lng.toFixed(6)}`;
            if (currentCenter !== lastSearchCenter) {
                lastSearchCenter = currentCenter;
                
                // 前のタイマーをクリア
                if (searchTimeout) {
                    clearTimeout(searchTimeout);
                }
                
                // 500ms後に検索実行（連続操作時のAPI過負荷を防ぐ）
                searchTimeout = setTimeout(() => {
                    if (currentZoom > 10) {
                        console.log('検索範囲変更により焼肉店データを再取得します');
                        loadYakinikuShops();
                    }
                }, 500);
            }
        } else {
            // ズームレベルが範囲外なら検索範囲をクリア
            map.getSource('search-area').setData({
                type: 'FeatureCollection',
                features: []
            });
            lastSearchCenter = null;
        }
    }
    
    map.on('zoom', () => {
        const currentZoom = map.getZoom();
        updateLayerInfo(currentZoom);
        updateSearchArea(); // 検索範囲を更新
        
        // ズームアウトしたら焼肉店データをクリア
        if (currentZoom <= 10 && yakinikuDataLoaded) {
            console.log('ズームアウト - 焼肉店データをクリアします');
            map.getSource('yakiniku-pins').setData({
                type: 'FeatureCollection',
                features: []
            });
            yakinikuDataLoaded = false;
            lastSearchCenter = null;
        }
    });
    
    // 地図の移動時にも検索範囲を更新
    map.on('move', () => {
        updateSearchArea();
    });

    // タイルクリック時のズームイン機能
    map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point);
        if (features.length > 0) {
            const feature = features[0];
            const props = feature.properties;
            const currentZoom = map.getZoom();
            
            // 階層に応じた次のズームレベルとセンター計算
            let targetZoom = currentZoom + 2;
            let shouldZoom = false;
            
            // フィーチャーの中心座標を計算
            const bounds = new maplibregl.LngLatBounds();
            if (feature.geometry.type === 'Polygon') {
                feature.geometry.coordinates[0].forEach(coord => {
                    bounds.extend(coord);
                });
            } else if (feature.geometry.type === 'MultiPolygon') {
                feature.geometry.coordinates.forEach(polygon => {
                    polygon[0].forEach(coord => {
                        bounds.extend(coord);
                    });
                });
            }
            
            // 階層別のズーム処理
            if (props.level === 'region' && currentZoom < 6) {
                targetZoom = 7; // 都道府県レベルに切り替え
                shouldZoom = true;
            } else if (props.level === 'prefecture' && currentZoom < 8) {
                targetZoom = 9; // 市区町村レベルに切り替え
                shouldZoom = true;
            } else if (props.level === 'municipality' && currentZoom < 11) {
                targetZoom = 12; // 詳細レベルに切り替え
                shouldZoom = true;
            }
            
            if (shouldZoom) {
                // ズームインアニメーション
                map.fitBounds(bounds, {
                    padding: 50,
                    maxZoom: targetZoom,
                    duration: 300
                });
            } else {
                // 詳細情報ポップアップ表示（最下位レベルまたはズーム不要な場合）
                let content = '<h3>地域情報</h3>';
                if (props.level === 'region') {
                    content += `<p><strong>地方:</strong> ${props.region_jp}</p>`;
                    content += `<p><strong>人口:</strong> ${props.population?.toLocaleString() || 'N/A'}</p>`;
                    content += `<p><strong>世帯数:</strong> ${props.households?.toLocaleString() || 'N/A'}</p>`;
                } else if (props.level === 'prefecture') {
                    content += `<p><strong>都道府県:</strong> ${props.prefecture_jp}</p>`;
                    content += `<p><strong>地方:</strong> ${props.region_jp}</p>`;
                    content += `<p><strong>JISコード:</strong> ${props.jis_code}</p>`;
                    content += `<p><strong>人口:</strong> ${props.population?.toLocaleString() || 'N/A'}</p>`;
                } else if (props.level === 'municipality') {
                    content += `<p><strong>市区町村:</strong> ${props.municipality_jp}</p>`;
                    content += `<p><strong>都道府県:</strong> ${props.prefecture_jp}</p>`;
                    content += `<p><strong>コード:</strong> ${props.jcode}</p>`;
                    content += `<p><strong>人口:</strong> ${props.population?.toLocaleString() || 'N/A'}</p>`;
                } else if (props.level === 'detailed') {
                    content += `<p><strong>地域:</strong> ${props.SIKUCHOSON || 'N/A'}</p>`;
                    content += `<p><strong>都道府県:</strong> ${props.KEN || 'N/A'}</p>`;
                    content += `<p><strong>人口:</strong> ${props.P_NUM?.toLocaleString() || 'N/A'}</p>`;
                    content += `<p><strong>世帯数:</strong> ${props.H_NUM?.toLocaleString() || 'N/A'}</p>`;
                    content += `<p class="zoom-note" style="color: #666; font-size: 11px; margin-top: 8px;">💡 これ以上詳細なレベルはありません</p>`;
                }

                new maplibregl.Popup()
                    .setLngLat(e.lngLat)
                    .setHTML(content)
                    .addTo(map);
            }
        }
    });

    // 焼肉店のピンクリック時の詳細表示
    map.on('click', 'yakiniku-pins', (e) => {
        const feature = e.features[0];
        const props = feature.properties;
        
        let content = `<div style="font-family: Arial, sans-serif;">`;
        content += `<h3 style="margin: 0 0 8px 0; color: #FF4500;">🥩 ${props.name}</h3>`;
        if (props.address) content += `<p style="margin: 2px 0;"><strong>住所:</strong> ${props.address}</p>`;
        if (props.phone) content += `<p style="margin: 2px 0;"><strong>電話:</strong> ${props.phone}</p>`;
        if (props.cuisine && props.cuisine !== 'unknown') content += `<p style="margin: 2px 0;"><strong>料理:</strong> ${props.cuisine}</p>`;
        if (props.website) content += `<p style="margin: 2px 0;"><a href="${props.website}" target="_blank">ウェブサイト</a></p>`;
        content += `</div>`;
        
        new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(content)
            .addTo(map);
    });
    
    // マウスホバー効果
    map.on('mouseenter', ['regions-fill', 'prefectures-fill', 'municipalities-fill', 'detailed-fill', 'yakiniku-pins'], () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    
    map.on('mouseleave', ['regions-fill', 'prefectures-fill', 'municipalities-fill', 'detailed-fill', 'yakiniku-pins'], () => {
        map.getCanvas().style.cursor = '';
    });

    map.on('error', (e) => {
        console.error('Map error:', e);
    });
}).catch(error => {
    console.error('Failed to load PMTiles header:', error);
});