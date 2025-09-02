'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import useMap from '../../hooks/useMap';
import useSearch from '../../hooks/useSearch';
import { getZoomBehavior } from '../../utils/mapUtils';
import MapConfig from '../../services/mapConfig';

import 'maplibre-gl/dist/maplibre-gl.css';

export default function MapContainer({ onZoomChange, onMapLoad }) {
    const mapContainerRef = useRef(null);
    const { map, zoom, isLoaded } = useMap('map');
    const { updateSearchArea } = useSearch();

    // ズーム変更を親に通知
    useEffect(() => {
        if (onZoomChange) {
            onZoomChange(zoom);
        }
    }, [zoom, onZoomChange]);

    // マップロード完了を親に通知
    useEffect(() => {
        if (isLoaded && onMapLoad) {
            onMapLoad(map);
        }
    }, [isLoaded, map, onMapLoad]);

    // イベントハンドラーを設定
    useEffect(() => {
        if (!map || !isLoaded) return;

        // クリックイベントハンドラー
        const handleMapClick = (e) => {
            console.log('🖱️ マップクリック座標:', e.point);
            
            // すべてのレイヤーから特徴を取得
            const allFeatures = map.queryRenderedFeatures(e.point);
            console.log('🎯 クリック位置の全フィーチャー:', allFeatures.map(f => ({
                layer: f.layer.id,
                properties: f.properties
            })));
            
            // クラスターレイヤーを優先的にチェック
            const clusterFeatures = map.queryRenderedFeatures(e.point, {
                layers: ['search-clusters', 'search-cluster-count']
            });
            
            if (clusterFeatures.length > 0) {
                console.log('🔍 クラスター検出:', clusterFeatures[0].properties);
                handleClusterClick(e);
                return; // クラスターの場合は他の処理をスキップ
            }
            
            // 検索ピンをチェック
            const searchPinFeatures = map.queryRenderedFeatures(e.point, {
                layers: ['search-pins']
            });
            
            if (searchPinFeatures.length > 0) {
                console.log('📍 検索ピン検出:', searchPinFeatures[0].properties);
                handleSearchPinClick(e);
                return;
            }
            
            // 通常のフィーチャーをチェック
            const features = map.queryRenderedFeatures(e.point);
            if (features.length > 0) {
                handleFeatureClick(map, e, features[0]);
            }
        };

        // 検索結果ピンクリックハンドラー
        const handleSearchPinClick = (e) => {
            const features = map.queryRenderedFeatures(e.point, {
                layers: ['search-pins']
            });
            if (features.length === 0) return;
            
            const feature = features[0];
            const props = feature.properties;
            
            let content = `<div style="font-family: Arial, sans-serif;">`;
            content += `<h3 style="margin: 0 0 8px 0; color: #333;">${props.icon} ${props.name}</h3>`;
            if (props.category) content += `<p style="margin: 2px 0;"><strong>カテゴリー:</strong> ${props.category}</p>`;
            if (props.cuisine) content += `<p style="margin: 2px 0;"><strong>料理:</strong> ${props.cuisine}</p>`;
            if (props.address) content += `<p style="margin: 2px 0;"><strong>住所:</strong> ${props.address}</p>`;
            if (props.phone) content += `<p style="margin: 2px 0;"><strong>電話:</strong> ${props.phone}</p>`;
            if (props.website) content += `<p style="margin: 2px 0;"><a href="${props.website}" target="_blank">ウェブサイト</a></p>`;
            content += `</div>`;
            
            new maplibregl.Popup()
                .setLngLat(feature.geometry.coordinates)
                .setHTML(content)
                .addTo(map);
        };

        // マウスイベントハンドラー
        const handleMouseEnter = () => {
            map.getCanvas().style.cursor = 'pointer';
        };

        const handleMouseLeave = () => {
            map.getCanvas().style.cursor = '';
        };

        // ズーム・移動イベントハンドラー
        const handleZoom = () => {
            updateSearchArea(map);
        };

        const handleMove = () => {
            updateSearchArea(map);
        };

        // クラスタークリックハンドラー
        const handleClusterClick = (e) => {
            // クラスター円と数値の両方のレイヤーから検索
            const features = map.queryRenderedFeatures(e.point, {
                layers: ['search-clusters', 'search-cluster-count']
            });
            
            if (features.length > 0) {
                const clusterId = features[0].properties.cluster_id;
                const pointCount = features[0].properties.point_count;
                const coordinates = features[0].geometry.coordinates.slice();
                
                console.log(`🔍 クラスターをクリック: ${pointCount}件のピン (ID: ${clusterId})`);
                
                // ソースが存在することを確認
                const source = map.getSource('search-pins');
                if (!source) {
                    console.error('❌ search-pinsソースが見つかりません');
                    return;
                }
                
                console.log('🎯 手動ズーム計算を実行');
                
                // ポイント数に基づくスマートズーム計算
                const currentZoom = map.getZoom();
                let targetZoom;
                
                if (pointCount >= 100) {
                    targetZoom = currentZoom + 4; // 大クラスター: +4
                } else if (pointCount >= 50) {
                    targetZoom = currentZoom + 3; // 中クラスター: +3
                } else if (pointCount >= 10) {
                    targetZoom = currentZoom + 2; // 小クラスター: +2
                } else {
                    targetZoom = currentZoom + 1; // 極小クラスター: +1
                }
                
                // 最大ズーム18まで制限
                targetZoom = Math.min(targetZoom, 18);
                
                console.log(`📍 手動ズーム: ${currentZoom} → ${targetZoom} (${pointCount}件のピン)`);
                
                // coordinates配列が正しい形式か確認
                while (Math.abs(coordinates[0]) > 180) {
                    coordinates[0] += coordinates[0] > 180 ? -360 : 360;
                }
                
                map.easeTo({
                    center: coordinates,
                    zoom: targetZoom,
                    duration: 500
                });
                
                console.log('✅ 手動ズーム実行完了');
            }
        };

        // イベントリスナーを追加
        map.on('click', handleMapClick);
        map.on('mouseenter', MapConfig.interactiveLayers, handleMouseEnter);
        map.on('mouseleave', MapConfig.interactiveLayers, handleMouseLeave);
        map.on('mouseenter', 'search-clusters', handleMouseEnter);
        map.on('mouseleave', 'search-clusters', handleMouseLeave);
        map.on('mouseenter', 'search-cluster-count', handleMouseEnter);
        map.on('mouseleave', 'search-cluster-count', handleMouseLeave);
        map.on('zoom', handleZoom);
        map.on('move', handleMove);

        // クリーンアップ
        return () => {
            map.off('click', handleMapClick);
            map.off('mouseenter', MapConfig.interactiveLayers, handleMouseEnter);
            map.off('mouseleave', MapConfig.interactiveLayers, handleMouseLeave);
            map.off('mouseenter', 'search-clusters', handleMouseEnter);
            map.off('mouseleave', 'search-clusters', handleMouseLeave);
            map.off('mouseenter', 'search-cluster-count', handleMouseEnter);
            map.off('mouseleave', 'search-cluster-count', handleMouseLeave);
            map.off('zoom', handleZoom);
            map.off('move', handleMove);
        };
    }, [map, isLoaded, updateSearchArea]);

    const handleFeatureClick = (map, e, feature) => {
        const props = feature.properties;
        const currentZoom = map.getZoom();
        
        console.log(`🎯 フィーチャークリック: ${props.level}, 現在ズーム: ${currentZoom}`);
        
        // ズームレベル11以上かつ市区町村の場合: SearchPanelの市区町村選択機能が責任を持つ
        if (currentZoom >= 11 && props.level === 'municipality') {
            console.log('📍 ズーム11以上: 市区町村選択機能が担当');
            
            if (map._municipalitySelectionHandler) {
                const handled = map._municipalitySelectionHandler(feature, props, map);
                if (handled) {
                    return; // 処理完了
                }
            }
        }
        
        // ズームレベル11未満または他の行政レベル: 階層的ズーム機能が責任を持つ
        console.log('🔍 階層的ズーム機能が担当');
        
        const zoomBehavior = getZoomBehavior(props, currentZoom);
        
        if (zoomBehavior.shouldZoom) {
            console.log(`⬆️ 階層ズーム実行: ${props.level} → ズーム${zoomBehavior.targetZoom}`);
            
            // クリック位置を中心にズームイン
            map.easeTo({
                center: e.lngLat,
                zoom: zoomBehavior.targetZoom,
                duration: 500
            });
        } else {
            console.log('ℹ️ 最大ズームレベル到達 - ポップアップは表示しない');
            // ポップアップは表示しない
        }
    };

    return (
        <div 
            ref={mapContainerRef}
            id="map" 
            style={{ 
                width: '100%', 
                height: '100vh',
                position: 'relative'
            }} 
        />
    );
}