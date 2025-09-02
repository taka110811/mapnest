/**
 * Overpass API サービス
 * OpenStreetMap Overpass APIとの通信を管理
 */

/**
 * カテゴリーの設定定義
 */
export const categoryConfig = {
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
};

/**
 * ズームレベルに基づいて検索範囲を計算
 * @param {number} zoom - 現在のズームレベル
 * @returns {number} 検索範囲（度数）
 */
export function getSearchRange(zoom) {
    if (zoom >= 12) return 0.015; // 約1.5km
    if (zoom >= 10) return 0.03;  // 約3km
    if (zoom >= 9) return 0.05;   // 約5km
    return 0.07;                  // 約7km
}

/**
 * Overpass APIクエリを構築（座標ベース）
 * @param {string} category - 検索カテゴリー
 * @param {string} cuisine - 料理ジャンル
 * @param {number} south - 南端座標
 * @param {number} west - 西端座標
 * @param {number} north - 北端座標
 * @param {number} east - 東端座標
 * @returns {string} Overpass APIクエリ文字列
 */
export function buildOverpassQuery(category, cuisine, south, west, north, east) {
    const config = categoryConfig[category];
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
}

/**
 * 市区町村エリアベースのOverpass APIクエリを構築
 * @param {string} category - 検索カテゴリー
 * @param {string} prefectureName - 都道府県名
 * @param {string} municipalityName - 市区町村名
 * @param {string} cuisine - 料理ジャンル（オプション）
 * @returns {string} Overpass APIクエリ文字列
 */
export function buildAreaBasedQuery(category, prefectureName, municipalityName, cuisine = '') {
    const config = categoryConfig[category];
    
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
        [out:json][timeout:30];
        // 都道府県エリアを取得
        area["ISO3166-1"="JP"][admin_level=4][name="${prefectureName}"]->.prefecture;
        // 市区町村エリアを取得
        (
          area[admin_level=7][name="${municipalityName}"](area.prefecture);
          area[admin_level=8][name="${municipalityName}"](area.prefecture);
        )->.city;
        (
          node${filterString}(area.city);
          way${filterString}(area.city);
          relation${filterString}(area.city);
        );
        out center;
    `.trim();
}

/**
 * Overpass APIにクエリを送信
 * @param {string} query - 実行するOverpassクエリ
 * @returns {Promise<Object>} APIレスポンスデータ
 */
export async function queryOverpassAPI(query) {
    console.log('Overpass APIクエリ実行中...');
    console.log('実際のクエリ:', query);
    
    const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query)
    });
    
    const data = await response.json();
    console.log('Overpass API レスポンス:', data);
    return data;
}

/**
 * 要素が有効な座標を持っているかチェック
 * @param {Object} element - OSM要素オブジェクト
 * @returns {boolean} 有効な座標を持つかどうか
 */
export function isValidElement(element) {
    if (element.type === 'node' && element.lat && element.lon) {
        return true;
    }
    if (element.type === 'way' && element.center && element.center.lat && element.center.lon) {
        return true;
    }
    return false;
}

/**
 * OSM要素をGeoJSONフィーチャーに変換
 * @param {Object} element - OSM要素オブジェクト
 * @param {Object} config - カテゴリー設定
 * @returns {Object} GeoJSONフィーチャー
 */
export function elementToFeature(element, config) {
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
}