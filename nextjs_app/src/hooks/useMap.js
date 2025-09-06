/**
 * マップ管理カスタムフック
 */
import { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import MapConfig from '../services/mapConfig';
import useMapStyle from './useMapStyle';

export default function useMap(containerId) {
    const [map, setMap] = useState(null);
    const [zoom, setZoom] = useState(5);
    const [center, setCenter] = useState([138.2529, 36.2048]);
    const [isLoaded, setIsLoaded] = useState(false);
    const protocolRef = useRef(null);
    const pmtilesRef = useRef(null);
    
    // 宣言的スタイル管理フック
    const {
        mapStyle,
        toggleLayer,
        addCustomLayer,
        removeCustomLayer,
        updateSearchPins,
        layerVisibility,
        dynamicLayers
    } = useMapStyle(MapConfig.PMTILES_URL);

    useEffect(() => {
        if (!containerId) return;

        const initializeMap = async () => {
            try {
                // PMTiles プロトコルを設定
                const protocol = new Protocol();
                maplibregl.addProtocol('pmtiles', protocol.tile);
                protocolRef.current = protocol;

                // PMTiles データソースを初期化
                const { PMTiles } = await import('pmtiles');
                console.log('🔄 Loading PMTiles from:', MapConfig.PMTILES_URL);
                const pmtiles = new PMTiles(MapConfig.PMTILES_URL);
                protocol.add(pmtiles);
                pmtilesRef.current = pmtiles;


                // マップを作成
                const mapInstance = new maplibregl.Map({
                    container: containerId,
                    style: MapConfig.getMapStyle(MapConfig.PMTILES_URL),
                    center: MapConfig.mapOptions.center,
                    zoom: MapConfig.mapOptions.zoom
                });

                // ロードイベントを設定
                mapInstance.on('load', () => {
                    console.log('Map loaded successfully');
                    
                    // デバッグ用にupdateSearchPinsをmapオブジェクトに追加
                    mapInstance._updateSearchPins = updateSearchPins;
                    
                    setIsLoaded(true);
                });

                mapInstance.on('error', (e) => {
                    console.error('Map error:', e);
                });

                // ズーム・移動イベントを設定
                mapInstance.on('zoom', () => {
                    setZoom(mapInstance.getZoom());
                });

                mapInstance.on('move', () => {
                    const newCenter = mapInstance.getCenter();
                    setCenter([newCenter.lng, newCenter.lat]);
                });

                setMap(mapInstance);

                // PMTiles メタデータを読み込み
                try {
                    const header = await pmtiles.getHeader();
                    console.log('✅ PMTiles loaded successfully!');
                    console.log('📁 File URL:', MapConfig.PMTILES_URL);
                    console.log('📊 PMTiles header:', header);
                    
                    const metadata = await pmtiles.getMetadata();
                    console.log('📋 PMTiles metadata:', metadata);
                    
                    if (metadata && metadata.vector_layers) {
                        console.log('🗂️ Available vector layers:', metadata.vector_layers.length);
                        metadata.vector_layers.forEach(layer => {
                            console.log(`📍 Layer: ${layer.id}`);
                            console.log(`  🏷️ Fields (${Object.keys(layer.fields).length}):`, Object.keys(layer.fields).join(', '));
                        });
                    }
                } catch (err) {
                    console.error('❌ Metadata error:', err);
                }

            } catch (error) {
                console.error('Failed to initialize map:', error);
            }
        };

        initializeMap();

        // クリーンアップ
        return () => {
            if (map) {
                map.remove();
            }
            if (protocolRef.current) {
                maplibregl.removeProtocol('pmtiles');
            }
        };
    }, [containerId]);

    // 宣言的スタイル更新エフェクト
    useEffect(() => {
        if (!map || !isLoaded) return;
        
        console.log('🎨 宣言的スタイル更新を実行');
        map.setStyle(mapStyle);
    }, [map, isLoaded, mapStyle]);

    return {
        map,
        zoom,
        center,
        isLoaded,
        // スタイル管理関数をエクスポート
        toggleLayer,
        addCustomLayer,
        removeCustomLayer,
        updateSearchPins,
        layerVisibility,
        dynamicLayers
    };
}