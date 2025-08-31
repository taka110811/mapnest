/**
 * 汎用的な検索機能
 * OpenStreetMap Overpass APIを使用した場所の検索・表示機能を提供
 * @namespace GenericSearch
 */
const GenericSearch = {
    /** @type {boolean} 検索データが読み込まれているかのフラグ */
    searchDataLoaded: false,
    /** @type {string|null} 最後の検索センター座標 */
    lastSearchCenter: null,
    /** @type {number|null} 検索実行のタイムアウトID */
    searchTimeout: null,
    /** @type {string} 現在の検索カテゴリー */
    currentCategory: '',
    /** @type {string} 現在の料理ジャンル */
    currentCuisine: '',
    
    /**
     * カテゴリーの設定定義
     */
    categoryConfig: {
        'restaurant': {
            amenity: 'restaurant',
            icon: '🍽️',
            color: '#FF4500',
            name: 'レストラン'
        },
        'cafe': {
            amenity: 'cafe',
            icon: '☕',
            color: '#8B4513',
            name: 'カフェ'
        },
        'convenience': {
            shop: 'convenience',
            icon: '🏪',
            color: '#007BFF',
            name: 'コンビニ'
        },
        'supermarket': {
            shop: 'supermarket',
            icon: '🛒',
            color: '#28A745',
            name: 'スーパー'
        },
        'hospital': {
            amenity: 'hospital',
            icon: '🏥',
            color: '#DC3545',
            name: '病院'
        },
        'school': {
            amenity: 'school',
            icon: '🏫',
            color: '#6F42C1',
            name: '学校'
        },
        'bank': {
            amenity: 'bank',
            icon: '🏦',
            color: '#17A2B8',
            name: '銀行'
        },
        'gas_station': {
            amenity: 'fuel',
            icon: '⛽',
            color: '#FD7E14',
            name: 'ガソリンスタンド'
        },
        'pharmacy': {
            amenity: 'pharmacy',
            icon: '💊',
            color: '#20C997',
            name: '薬局'
        },
        'post_office': {
            amenity: 'post_office',
            icon: '📫',
            color: '#E83E8C',
            name: '郵便局'
        }
    },

    /**
     * ズームレベルに基づいて検索範囲を計算
     * @param {number} zoom - 現在のズームレベル
     * @returns {number} 検索範囲（度数）
     */
    getSearchRange(zoom) {
        if (zoom >= 12) return 0.015; // 約1.5km
        if (zoom >= 10) return 0.03;  // 約3km
        if (zoom >= 9) return 0.05;   // 約5km
        return 0.07;                  // 約7km
    },
    
    /**
     * Overpass APIから検索データを取得してマップに表示
     * @param {maplibregl.Map} map - MapLibre GLマップインスタンス
     * @param {string} category - 検索カテゴリー
     * @param {string} cuisine - 料理ジャンル（レストラン用）
     * @returns {Promise<void>}
     */
    async loadSearchResults(map, category, cuisine = '') {
        console.log(`検索データの取得を開始... カテゴリー: ${category}, 料理: ${cuisine}`);
        
        if (!this.categoryConfig[category]) {
            console.error(`未対応のカテゴリー: ${category}`);
            return;
        }

        this.currentCategory = category;
        this.currentCuisine = cuisine;
        
        const center = map.getCenter();
        const zoom = map.getZoom();
        const range = this.getSearchRange(zoom);
        
        const south = center.lat - range;
        const west = center.lng - range;
        const north = center.lat + range;
        const east = center.lng + range
        
        console.log(`検索範囲: ${south.toFixed(4)}, ${west.toFixed(4)}, ${north.toFixed(4)}, ${east.toFixed(4)}`);
        
        try {
            const overpassQuery = this.buildOverpassQuery(category, cuisine, south, west, north, east);
            const response = await this.queryOverpassAPI(overpassQuery);
            const features = this.processOverpassResponse(response, category);
            
            // データをマップに追加
            map.getSource('search-pins').setData({
                type: 'FeatureCollection',
                features: features
            });
            
            // ピンの色を更新
            this.updatePinStyle(map, category);
            
            console.log(`${this.categoryConfig[category].name}を ${features.length}件発見しました`);
            
            // 結果をUIに表示
            this.updateSearchResults(features.length, category);
            
            this.searchDataLoaded = true;
        } catch (error) {
            console.error('Overpass API エラー:', error);
            // エラー時は空のデータを表示
            map.getSource('search-pins').setData({
                type: 'FeatureCollection',
                features: []
            });
            this.updateSearchResults(0, category, 'エラーが発生しました');
        }
    },
    
    /**
     * Overpass APIクエリを構築
     * @param {string} category - 検索カテゴリー
     * @param {string} cuisine - 料理ジャンル
     * @param {number} south - 南端座標
     * @param {number} west - 西端座標
     * @param {number} north - 北端座標
     * @param {number} east - 東端座標
     * @returns {string} Overpass APIクエリ文字列
     */
    buildOverpassQuery(category, cuisine, south, west, north, east) {
        const config = this.categoryConfig[category];
        const bbox = `${south.toFixed(6)},${west.toFixed(6)},${north.toFixed(6)},${east.toFixed(6)}`;
        
        let filters = [];
        
        // メインフィルター
        if (config.amenity) {
            filters.push(`["amenity"="${config.amenity}"]`);
        } else if (config.shop) {
            filters.push(`["shop"="${config.shop}"]`);
        }
        
        // 料理ジャンルフィルター（レストラン・カフェの場合）
        if (cuisine && (category === 'restaurant' || category === 'cafe')) {
            filters.push(`["cuisine"~"${cuisine}"]`);
        }
        
        const filterString = filters.join('');
        
        return `
            [out:json][timeout:15];
            (
              node${filterString}(${bbox});
              way${filterString}(${bbox});
            );
            out center;
        `;
    },
    
    /**
     * Overpass APIにクエリを送信
     * @param {string} query - 実行するOverpassクエリ
     * @returns {Promise<Object>} APIレスポンスデータ
     */
    async queryOverpassAPI(query) {
        console.log('Overpass APIクエリ実行中...');
        console.log('実際のクエリ:', query);
        
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: 'data=' + encodeURIComponent(query)
        });
        
        const data = await response.json();
        console.log('Overpass API レスポンス:', data);
        return data;
    },
    
    /**
     * Overpass APIレスポンスをGeoJSONフィーチャーに変換
     * @param {Object} data - Overpass APIレスポンスデータ
     * @param {string} category - 検索カテゴリー
     * @returns {Array<Object>} GeoJSONフィーチャー配列
     */
    processOverpassResponse(data, category) {
        if (!data.elements || data.elements.length === 0) {
            console.log('検索結果が見つかりませんでした');
            return [];
        }
        
        const config = this.categoryConfig[category];
        
        return data.elements
            .filter(element => this.isValidElement(element))
            .map(element => this.elementToFeature(element, config));
    },
    
    /**
     * 要素が有効な座標を持っているかチェック
     * @param {Object} element - OSM要素オブジェクト
     * @returns {boolean} 有効な座標を持つかどうか
     */
    isValidElement(element) {
        if (element.type === 'node' && element.lat && element.lon) {
            return true;
        }
        if (element.type === 'way' && element.center && element.center.lat && element.center.lon) {
            return true;
        }
        return false;
    },
    
    /**
     * OSM要素をGeoJSONフィーチャーに変換
     * @param {Object} element - OSM要素オブジェクト
     * @param {Object} config - カテゴリー設定
     * @returns {Object} GeoJSONフィーチャー
     */
    elementToFeature(element, config) {
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
                name: element.tags?.name || config.name,
                category: config.name,
                cuisine: element.tags?.cuisine || '',
                address: element.tags?.['addr:full'] || element.tags?.['addr:city'] || '',
                phone: element.tags?.phone || '',
                website: element.tags?.website || '',
                icon: config.icon
            }
        };
    },
    
    /**
     * ピンのスタイルを更新
     * @param {maplibregl.Map} map - MapLibre GLマップインスタンス
     * @param {string} category - 検索カテゴリー
     */
    updatePinStyle(map, category) {
        const config = this.categoryConfig[category];
        
        map.setPaintProperty('search-pins', 'circle-color', config.color);
        map.setLayoutProperty('search-labels', 'text-field', config.icon);
    },
    
    /**
     * 検索結果をUIに表示
     * @param {number} count - 検索結果数
     * @param {string} category - 検索カテゴリー
     * @param {string} error - エラーメッセージ
     */
    updateSearchResults(count, category, error = '') {
        const resultsDiv = document.getElementById('search-results');
        if (error) {
            resultsDiv.textContent = error;
            resultsDiv.style.color = '#dc3545';
        } else {
            const categoryName = this.categoryConfig[category].name;
            resultsDiv.textContent = `${categoryName}: ${count}件見つかりました`;
            resultsDiv.style.color = '#666';
        }
    },
    
    /**
     * 検索範囲の可視化を更新
     * @param {maplibregl.Map} map - MapLibre GLマップインスタンス
     */
    updateSearchArea(map) {
        const currentZoom = map.getZoom();
        const center = map.getCenter();
        
        if (currentZoom >= 8 && this.currentCategory) {
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
    
    /**
     * 検索範囲フィーチャーを作成
     * @param {maplibregl.LngLat} center - 中心座標
     * @param {number} range - 検索範囲（度数）
     * @returns {Object} GeoJSONフィーチャー
     */
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
                description: '検索範囲'
            }
        };
    },
    
    /**
     * デバウンス機能付きの検索実行
     * @param {maplibregl.Map} map - MapLibre GLマップインスタンス
     * @param {maplibregl.LngLat} center - 中心座標
     * @param {number} currentZoom - 現在のズームレベル
     */
    debounceSearch(map, center, currentZoom) {
        const currentCenter = `${center.lat.toFixed(6)},${center.lng.toFixed(6)}`;
        if (currentCenter !== this.lastSearchCenter && this.currentCategory) {
            this.lastSearchCenter = currentCenter;
            
            // 前のタイマーをクリア
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }
            
            // 500ms後に検索実行（連続操作時のAPI過負荷を防ぐ）
            this.searchTimeout = setTimeout(() => {
                if (currentZoom > 10) {
                    console.log('検索範囲変更により検索データを再取得します');
                    this.loadSearchResults(map, this.currentCategory, this.currentCuisine);
                }
            }, 500);
        }
    },
    
    /**
     * ズームアウト時に検索データをクリア
     * @param {maplibregl.Map} map - MapLibre GLマップインスタンス
     */
    clearSearchData(map) {
        console.log('ズームアウト - 検索データをクリアします');
        map.getSource('search-pins').setData({
            type: 'FeatureCollection',
            features: []
        });
        this.searchDataLoaded = false;
        this.lastSearchCenter = null;
        
        // UIもクリア
        const resultsDiv = document.getElementById('search-results');
        resultsDiv.textContent = '';
    }
};