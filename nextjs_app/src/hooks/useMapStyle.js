/**
 * マップスタイル管理カスタムフック
 * 宣言的なレイヤー管理を提供し、MapLibre GL JSのsetStyleを使用して
 * 効率的な差分更新を行います
 */
import { useState, useCallback, useMemo } from 'react';
import MapConfig from '../services/mapConfig';
import { categoryConfig } from '../services/overpassApi';

export default function useMapStyle(pmtilesUrl) {
    // ベースマップスタイルの状態
    const [mapStyle, setMapStyle] = useState(() => {
        return MapConfig.getMapStyle(pmtilesUrl);
    });

    // レイヤーの可視性状態を管理
    const [layerVisibility, setLayerVisibility] = useState({
        // 行政区域レイヤー
        regions: true,
        prefectures: true,
        municipalities: true,
        // 検索関連レイヤー
        searchPins: true,
        searchClusters: true,
        // お気に入りレイヤー
        favorites: true,
        favoritesLabels: true,
        // ベースマップ
        osmTiles: true
    });

    // 動的レイヤーの状態（検索結果など）
    const [dynamicLayers, setDynamicLayers] = useState({
        searchPins: [],
        favoritesPins: [],
        currentCategory: ''
    });

    // レイヤー可視性を変更する関数
    const toggleLayer = useCallback((layerId, visible = null) => {
        setLayerVisibility(prev => ({
            ...prev,
            [layerId]: visible !== null ? visible : !prev[layerId]
        }));
    }, []);

    // 検索ピンを更新する関数
    const updateSearchPins = useCallback((pins, category = '') => {
        setDynamicLayers(prev => ({
            ...prev,
            searchPins: pins,
            currentCategory: category
        }));
    }, []);

    // お気に入りピンを更新する関数
    const updateFavoritesPins = useCallback((favoritesGeoJSON) => {
        const features = favoritesGeoJSON?.features || [];
        setDynamicLayers(prev => ({
            ...prev,
            favoritesPins: features
        }));
        console.log(`⭐ お気に入りピン${features.length}件を地図に反映`);
    }, []);


    // 現在のマップスタイルを計算（宣言的）
    const currentMapStyle = useMemo(() => {
        try {
            // 現在のカテゴリーの色を取得（dynamicLayersから取得）
            const activeCategory = dynamicLayers.currentCategory;
            const categoryColor = activeCategory && categoryConfig[activeCategory] 
                ? categoryConfig[activeCategory].color 
                : '#FF4500';
            
            console.log('🎨 宣言的スタイル計算中:', { 
                activeCategory, 
                categoryColor, 
                pinsCount: dynamicLayers.searchPins?.length || 0 
            });

        // ベーススタイルをコピー
        const newStyle = {
            ...mapStyle,
            sources: {
                ...mapStyle.sources,
                // 動的ソースを更新
                'search-pins': {
                    ...mapStyle.sources['search-pins'],
                    data: {
                        type: 'FeatureCollection',
                        features: dynamicLayers.searchPins || []
                    }
                },
                'favorites-pins': {
                    ...mapStyle.sources['favorites-pins'],
                    data: {
                        type: 'FeatureCollection',
                        features: dynamicLayers.favoritesPins || []
                    }
                }
            },
            layers: mapStyle.layers
                .filter(layer => {
                    // レイヤーの可視性に基づいてフィルタリング
                    if (layer.id.startsWith('regions-') && !layerVisibility.regions) return false;
                    if (layer.id.startsWith('prefectures-') && !layerVisibility.prefectures) return false;
                    if (layer.id.startsWith('municipalities-') && !layerVisibility.municipalities) return false;
                    if (layer.id === 'search-pins' && !layerVisibility.searchPins) return false;
                    if (layer.id.startsWith('search-cluster') && !layerVisibility.searchClusters) return false;
                    if (layer.id === 'favorites-pins' && !layerVisibility.favorites) return false;
                    if (layer.id === 'favorites-labels' && !layerVisibility.favoritesLabels) return false;
                    if (layer.id === 'osm-tiles' && !layerVisibility.osmTiles) return false;
                    
                    return true;
                })
                .map(layer => {
                    // 検索ピンレイヤーの色を動的に変更
                    if (layer.id === 'search-pins' && activeCategory) {
                        return {
                            ...layer,
                            paint: {
                                ...layer.paint,
                                'circle-color': categoryColor
                            }
                        };
                    }
                    return layer;
                })
        };

            return newStyle;
        } catch (error) {
            console.error('❌ useMapStyle エラー:', error);
            return mapStyle; // フォールバック
        }
    }, [mapStyle, layerVisibility, dynamicLayers]);

    // カスタムレイヤーを追加する関数
    const addCustomLayer = useCallback((layerId, layerConfig, sourceId = null, sourceConfig = null) => {
        setMapStyle(prevStyle => {
            const newStyle = { ...prevStyle };
            
            // ソースが指定されていれば追加
            if (sourceId && sourceConfig) {
                newStyle.sources = {
                    ...newStyle.sources,
                    [sourceId]: sourceConfig
                };
            }
            
            // レイヤーを追加
            newStyle.layers = [...newStyle.layers, { id: layerId, ...layerConfig }];
            
            return newStyle;
        });
    }, []);

    // カスタムレイヤーを削除する関数
    const removeCustomLayer = useCallback((layerId, sourceId = null) => {
        setMapStyle(prevStyle => {
            const newStyle = { ...prevStyle };
            
            // レイヤーを削除
            newStyle.layers = newStyle.layers.filter(layer => layer.id !== layerId);
            
            // ソースが指定されていれば削除
            if (sourceId) {
                const { [sourceId]: removedSource, ...remainingSources } = newStyle.sources;
                newStyle.sources = remainingSources;
            }
            
            return newStyle;
        });
    }, []);

    return {
        // 現在のマップスタイル（宣言的に定義されたもの）
        mapStyle: currentMapStyle,
        
        // レイヤー管理関数
        toggleLayer,
        addCustomLayer,
        removeCustomLayer,
        
        // 動的データ更新関数
        updateSearchPins,
        updateFavoritesPins,
        
        // 状態参照
        layerVisibility,
        dynamicLayers
    };
}