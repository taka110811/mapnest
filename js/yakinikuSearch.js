// Yakiniku restaurant search functionality
const YakinikuSearch = {
    // Search state
    lastYakinikuZoom: -1,
    yakinikuDataLoaded: false,
    lastSearchCenter: null,
    searchTimeout: null,
    
    // Search range calculation based on zoom level
    getSearchRange(zoom) {
        if (zoom >= 12) return 0.015; // 約1.5km
        if (zoom >= 10) return 0.03;  // 約3km
        if (zoom >= 9) return 0.05;   // 約5km
        return 0.07;                  // 約7km
    },
    
    // Load yakiniku shops from Overpass API
    async loadYakinikuShops(map) {
        console.log('焼肉店データの取得を開始...');
        
        const center = map.getCenter();
        const zoom = map.getZoom();
        const range = this.getSearchRange(zoom);
        
        const south = center.lat - range;
        const west = center.lng - range;
        const north = center.lat + range;
        const east = center.lng + range;
        
        console.log(`検索範囲: ${south.toFixed(4)}, ${west.toFixed(4)}, ${north.toFixed(4)}, ${east.toFixed(4)}`);
        
        try {
            const overpassQuery = this.buildOverpassQuery(south, west, north, east);
            const response = await this.queryOverpassAPI(overpassQuery);
            const features = this.processOverpassResponse(response);
            
            // データをマップに追加
            map.getSource('yakiniku-pins').setData({
                type: 'FeatureCollection',
                features: features
            });
            
            console.log(`画面中央付近で ${features.length}件の焼肉店を発見しました`);
        } catch (error) {
            console.error('Overpass API エラー:', error);
            // エラー時は空のデータを表示
            map.getSource('yakiniku-pins').setData({
                type: 'FeatureCollection',
                features: []
            });
        }
    },
    
    // Build Overpass API query
    buildOverpassQuery(south, west, north, east) {
        return `
            [out:json][timeout:15];
            (
              node["amenity"="restaurant"]["cuisine"~"yakiniku|bbq|korean"](${south.toFixed(6)},${west.toFixed(6)},${north.toFixed(6)},${east.toFixed(6)});
              node["amenity"="restaurant"]["name"~"焼肉|焼き肉|ヤキニク|カルビ|YAKINIKU"](${south.toFixed(6)},${west.toFixed(6)},${north.toFixed(6)},${east.toFixed(6)});
              way["amenity"="restaurant"]["cuisine"~"yakiniku|bbq|korean"](${south.toFixed(6)},${west.toFixed(6)},${north.toFixed(6)},${east.toFixed(6)});
              way["amenity"="restaurant"]["name"~"焼肉|焼き肉|ヤキニク|カルビ|YAKINIKU"](${south.toFixed(6)},${west.toFixed(6)},${north.toFixed(6)},${east.toFixed(6)});
            );
            out center;
        `;
    },
    
    // Query Overpass API
    async queryOverpassAPI(query) {
        console.log('Overpass APIクエリ実行中（画面中央付近）...');
        console.log('実際のクエリ:', query);
        
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: 'data=' + encodeURIComponent(query)
        });
        
        const data = await response.json();
        console.log('Overpass API レスポンス:', data);
        return data;
    },
    
    // Process Overpass API response into GeoJSON features
    processOverpassResponse(data) {
        if (!data.elements || data.elements.length === 0) {
            console.log('画面中央付近に焼肉店が見つかりませんでした');
            return [];
        }
        
        return data.elements
            .filter(element => this.isValidElement(element))
            .map(element => this.elementToFeature(element));
    },
    
    // Check if element has valid coordinates
    isValidElement(element) {
        // ノードの場合は直接座標をチェック
        if (element.type === 'node' && element.lat && element.lon) {
            return true;
        }
        // ウェイの場合は中心座標をチェック
        if (element.type === 'way' && element.center && element.center.lat && element.center.lon) {
            return true;
        }
        return false;
    },
    
    // Convert OSM element to GeoJSON feature
    elementToFeature(element) {
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
    },
    
    // Update search area visualization
    updateSearchArea(map) {
        const currentZoom = map.getZoom();
        const center = map.getCenter();
        
        if (currentZoom >= 8) {
            const range = this.getSearchRange(currentZoom);
            const searchAreaFeature = this.createSearchAreaFeature(center, range);
            
            map.getSource('search-area').setData({
                type: 'FeatureCollection',
                features: [searchAreaFeature]
            });
            
            // 検索範囲が変わったら検索を実行（デバウンス付き）
            this.debounceSearch(map, center, currentZoom);
        } else {
            // ズームレベルが範囲外なら検索範囲をクリア
            map.getSource('search-area').setData({
                type: 'FeatureCollection',
                features: []
            });
            this.lastSearchCenter = null;
        }
    },
    
    // Create search area feature
    createSearchAreaFeature(center, range) {
        const south = center.lat - range;
        const west = center.lng - range;
        const north = center.lat + range;
        const east = center.lng + range;
        
        return {
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
    },
    
    // Debounced search execution
    debounceSearch(map, center, currentZoom) {
        const currentCenter = `${center.lat.toFixed(6)},${center.lng.toFixed(6)}`;
        if (currentCenter !== this.lastSearchCenter) {
            this.lastSearchCenter = currentCenter;
            
            // 前のタイマーをクリア
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }
            
            // 500ms後に検索実行（連続操作時のAPI過負荷を防ぐ）
            this.searchTimeout = setTimeout(() => {
                if (currentZoom > 10) {
                    console.log('検索範囲変更により焼肉店データを再取得します');
                    this.loadYakinikuShops(map);
                }
            }, 500);
        }
    },
    
    // Clear yakiniku data when zooming out
    clearYakinikuData(map) {
        console.log('ズームアウト - 焼肉店データをクリアします');
        map.getSource('yakiniku-pins').setData({
            type: 'FeatureCollection',
            features: []
        });
        this.yakinikuDataLoaded = false;
        this.lastSearchCenter = null;
    }
};