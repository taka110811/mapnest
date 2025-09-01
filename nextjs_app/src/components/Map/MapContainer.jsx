'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import useMap from '../../hooks/useMap';
import useSearch from '../../hooks/useSearch';
import { getZoomBehavior, createAdministrativePopup } from '../../utils/mapUtils';
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
            const features = map.queryRenderedFeatures(e.point);
            if (features.length > 0) {
                handleFeatureClick(map, e, features[0]);
            }
        };

        // 検索結果ピンクリックハンドラー
        const handleSearchPinClick = (e) => {
            const feature = e.features[0];
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
                .setLngLat(e.lngLat)
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

        // イベントリスナーを追加
        map.on('click', handleMapClick);
        map.on('click', 'search-pins', handleSearchPinClick);
        map.on('mouseenter', MapConfig.interactiveLayers, handleMouseEnter);
        map.on('mouseleave', MapConfig.interactiveLayers, handleMouseLeave);
        map.on('zoom', handleZoom);
        map.on('move', handleMove);

        // クリーンアップ
        return () => {
            map.off('click', handleMapClick);
            map.off('click', 'search-pins', handleSearchPinClick);
            map.off('mouseenter', MapConfig.interactiveLayers, handleMouseEnter);
            map.off('mouseleave', MapConfig.interactiveLayers, handleMouseLeave);
            map.off('zoom', handleZoom);
            map.off('move', handleMove);
        };
    }, [map, isLoaded, updateSearchArea]);

    const handleFeatureClick = (map, e, feature) => {
        const props = feature.properties;
        const currentZoom = map.getZoom();
        const zoomBehavior = getZoomBehavior(props, currentZoom);
        
        if (zoomBehavior.shouldZoom) {
            // クリック位置を中心にズームイン
            map.easeTo({
                center: e.lngLat,
                zoom: zoomBehavior.targetZoom,
                duration: 300
            });
        } else {
            // 詳細情報ポップアップ表示
            const content = createAdministrativePopup(props);
            new maplibregl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(content)
                .addTo(map);
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