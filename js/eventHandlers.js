/**
 * マップインタラクションのイベントハンドラー
 * マップのズーム、クリック、マウスイベントの管理
 * @namespace EventHandlers
 */
const EventHandlers = {
    /**
     * すべてのマップイベントリスナーを設定
     * @param {maplibregl.Map} map - MapLibre GLマップインスタンス
     */
    setupEventListeners(map) {
        this.setupZoomHandler(map);
        this.setupMoveHandler(map);
        this.setupClickHandlers(map);
        this.setupMouseHandlers(map);
        this.setupErrorHandler(map);
    },
    
    /**
     * ズームイベントハンドラーを設定
     * @param {maplibregl.Map} map - MapLibre GLマップインスタンス
     */
    setupZoomHandler(map) {
        map.on('zoom', () => {
            const currentZoom = map.getZoom();
            UIUtils.updateLayerInfo(currentZoom);
            YakinikuSearch.updateSearchArea(map);
            
            // ズームアウトしたら焼肉店データをクリア
            if (currentZoom <= 10 && YakinikuSearch.yakinikuDataLoaded) {
                YakinikuSearch.clearYakinikuData(map);
            }
        });
    },
    
    /**
     * 移動イベントハンドラーを設定
     * @param {maplibregl.Map} map - MapLibre GLマップインスタンス
     */
    setupMoveHandler(map) {
        map.on('move', () => {
            YakinikuSearch.updateSearchArea(map);
        });
    },
    
    /**
     * クリックイベントハンドラーを設定
     * @param {maplibregl.Map} map - MapLibre GLマップインスタンス
     */
    setupClickHandlers(map) {
        // General map click handler
        map.on('click', (e) => {
            const features = map.queryRenderedFeatures(e.point);
            if (features.length > 0) {
                this.handleFeatureClick(map, e, features[0]);
            }
        });
        
        // Yakiniku pin click handler
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
    },
    
    /**
     * フィーチャークリックの処理（行政区域）
     * @param {maplibregl.Map} map - MapLibre GLマップインスタンス
     * @param {maplibregl.MapMouseEvent} e - マウスイベント
     * @param {Object} feature - クリックされたフィーチャー
     */
    handleFeatureClick(map, e, feature) {
        const props = feature.properties;
        const currentZoom = map.getZoom();
        const zoomBehavior = UIUtils.getZoomBehavior(props, currentZoom);
        
        if (zoomBehavior.shouldZoom) {
            // クリック位置を中心にズームイン
            map.easeTo({
                center: e.lngLat,
                zoom: zoomBehavior.targetZoom,
                duration: 300
            });
        } else {
            // 詳細情報ポップアップ表示
            const content = UIUtils.createAdministrativePopup(props);
            new maplibregl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(content)
                .addTo(map);
        }
    },
    
    /**
     * マウスイベントハンドラーを設定
     * @param {maplibregl.Map} map - MapLibre GLマップインスタンス
     */
    setupMouseHandlers(map) {
        // Mouse enter handler
        map.on('mouseenter', MapConfig.interactiveLayers, () => {
            UIUtils.setCursor(map, 'pointer');
        });
        
        // Mouse leave handler
        map.on('mouseleave', MapConfig.interactiveLayers, () => {
            UIUtils.setCursor(map, '');
        });
    },
    
    /**
     * エラーイベントハンドラーを設定
     * @param {maplibregl.Map} map - MapLibre GLマップインスタンス
     */
    setupErrorHandler(map) {
        map.on('error', (e) => {
            console.error('Map error:', e);
        });
    },
    
    /**
     * ロードイベントハンドラーを設定
     * @param {maplibregl.Map} map - MapLibre GLマップインスタンス
     */
    setupLoadHandlers(map) {
        map.on('load', () => {
            console.log('Map loaded successfully');
            this.debugMapFeatures(map);
            UIUtils.updateLayerInfo(map.getZoom());
        });
    },
    
    /**
     * マップフィーチャーのデバッグ（開発用）
     * @param {maplibregl.Map} map - MapLibre GLマップインスタンス
     */
    debugMapFeatures(map) {
        const source = map.getSource('pmtiles_source');
        console.log('Source:', source);
        
        // 利用可能なレイヤーを確認
        setTimeout(() => {
            try {
                const allFeatures = map.querySourceFeatures('pmtiles_source');
                console.log('All features found:', allFeatures.length);
                
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
    }
};