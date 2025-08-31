// Event handlers for map interactions
const EventHandlers = {
    // Setup all map event listeners
    setupEventListeners(map) {
        this.setupZoomHandler(map);
        this.setupMoveHandler(map);
        this.setupClickHandlers(map);
        this.setupMouseHandlers(map);
        this.setupErrorHandler(map);
    },
    
    // Zoom event handler
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
    
    // Move event handler
    setupMoveHandler(map) {
        map.on('move', () => {
            YakinikuSearch.updateSearchArea(map);
        });
    },
    
    // Click event handlers
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
            this.handleYakinikuClick(e);
        });
    },
    
    // Handle feature click (administrative areas)
    handleFeatureClick(map, e, feature) {
        const props = feature.properties;
        const currentZoom = map.getZoom();
        const zoomBehavior = UIUtils.getZoomBehavior(props, currentZoom);
        
        if (zoomBehavior.shouldZoom) {
            // ズームインアニメーション
            const bounds = UIUtils.calculateFeatureBounds(feature);
            map.fitBounds(bounds, {
                padding: 50,
                maxZoom: zoomBehavior.targetZoom,
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
    
    // Handle yakiniku pin click
    handleYakinikuClick(e) {
        const feature = e.features[0];
        const props = feature.properties;
        const content = UIUtils.createYakinikuPopup(props);
        
        new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(content)
            .addTo(map);
    },
    
    // Mouse event handlers
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
    
    // Error event handler
    setupErrorHandler(map) {
        map.on('error', (e) => {
            console.error('Map error:', e);
        });
    },
    
    // Setup load event handlers
    setupLoadHandlers(map) {
        map.on('load', () => {
            console.log('Map loaded successfully');
            this.debugMapFeatures(map);
            UIUtils.updateLayerInfo(map.getZoom());
        });
    },
    
    // Debug map features (for development)
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