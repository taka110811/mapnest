/**
 * マップユーティリティ関数
 * マップ関連の共通処理とヘルパー関数
 */

/**
 * 行政レベルに対するズーム動作を決定
 * @param {Object} props - フィーチャーのプロパティ
 * @param {number} currentZoom - 現在のズームレベル
 * @returns {Object} ズーム動作オブジェクト {shouldZoom, targetZoom}
 */
export function getZoomBehavior(props, currentZoom) {
    let targetZoom = currentZoom + 2;
    let shouldZoom = false;
    
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
    
    return { shouldZoom, targetZoom };
}


/**
 * 検索結果用のポップアップコンテンツを作成
 * @param {Object} props - 検索結果フィーチャーのプロパティ
 * @returns {string} HTML文字列のポップアップコンテンツ
 */
export function createSearchResultPopup(props) {
    let content = `<div style="font-family: Arial, sans-serif;">`;
    content += `<h3 style="margin: 0 0 8px 0; color: #333;">${props.icon} ${props.name}</h3>`;
    
    if (props.category) {
        content += `<p style="margin: 2px 0;"><strong>カテゴリー:</strong> ${props.category}</p>`;
    }
    if (props.cuisine) {
        content += `<p style="margin: 2px 0;"><strong>料理:</strong> ${props.cuisine}</p>`;
    }
    if (props.address) {
        content += `<p style="margin: 2px 0;"><strong>住所:</strong> ${props.address}</p>`;
    }
    if (props.phone) {
        content += `<p style="margin: 2px 0;"><strong>電話:</strong> ${props.phone}</p>`;
    }
    if (props.website) {
        content += `<p style="margin: 2px 0;"><a href="${props.website}" target="_blank">ウェブサイト</a></p>`;
    }
    
    content += `</div>`;
    return content;
}

/**
 * 検索範囲フィーチャーを作成
 * @param {Object} center - 中心座標 {lat, lng}
 * @param {number} range - 検索範囲（度数）
 * @returns {Object} GeoJSONフィーチャー
 */
export function createSearchAreaFeature(center, range) {
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
}