// UI utilities and helper functions
const UIUtils = {
    // Update layer information in the info panel
    updateLayerInfo(zoom) {
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
    },
    
    // Create popup content for administrative areas
    createAdministrativePopup(props) {
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
        
        return content;
    },
    
    // Create popup content for yakiniku restaurants
    createYakinikuPopup(props) {
        let content = `<div style="font-family: Arial, sans-serif;">`;
        content += `<h3 style="margin: 0 0 8px 0; color: #FF4500;">🥩 ${props.name}</h3>`;
        
        if (props.address) {
            content += `<p style="margin: 2px 0;"><strong>住所:</strong> ${props.address}</p>`;
        }
        if (props.phone) {
            content += `<p style="margin: 2px 0;"><strong>電話:</strong> ${props.phone}</p>`;
        }
        if (props.cuisine && props.cuisine !== 'unknown') {
            content += `<p style="margin: 2px 0;"><strong>料理:</strong> ${props.cuisine}</p>`;
        }
        if (props.website) {
            content += `<p style="margin: 2px 0;"><a href="${props.website}" target="_blank">ウェブサイト</a></p>`;
        }
        
        content += `</div>`;
        return content;
    },
    
    // Calculate bounds for a feature geometry
    calculateFeatureBounds(feature) {
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
        
        return bounds;
    },
    
    // Determine zoom behavior for administrative levels
    getZoomBehavior(props, currentZoom) {
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
    },
    
    // Set cursor style for interactive elements
    setCursor(map, cursorType) {
        map.getCanvas().style.cursor = cursorType;
    }
};