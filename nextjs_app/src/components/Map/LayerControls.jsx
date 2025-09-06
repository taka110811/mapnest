/**
 * レイヤー制御コンポーネント
 * 宣言的レイヤー管理のデモンストレーションを提供
 */
'use client';

import { useEffect, useState } from 'react';

export default function LayerControls({ map, toggleLayer, layerVisibility }) {
    const [isVisible, setIsVisible] = useState(false);

    const layerConfig = [
        { id: 'regions', label: '地方' },
        { id: 'prefectures', label: '都道府県' },
        { id: 'municipalities', label: '市区町村' },
        { id: 'searchPins', label: '検索ピン' },
        { id: 'searchClusters', label: 'クラスター' },
        { id: 'osmTiles', label: 'ベースマップ' }
    ];

    const handleLayerToggle = (layerId) => {
        if (toggleLayer) {
            toggleLayer(layerId);
            console.log(`🎛️ レイヤー切り替え: ${layerId} → ${!layerVisibility[layerId]}`);
        }
    };

    // テスト用検索ピンを追加する関数
    const addTestPins = () => {
        if (map && map._updateSearchPins) {
            const testPins = [
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [139.7671, 35.6812] // 東京駅
                    },
                    properties: {
                        name: 'テストピン1',
                        category: 'restaurant'
                    }
                },
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [139.7758, 35.6794] // 銀座
                    },
                    properties: {
                        name: 'テストピン2',
                        category: 'restaurant'
                    }
                }
            ];
            map._updateSearchPins(testPins, 'restaurant');
            console.log('🧪 テスト検索ピンを追加しました');
        }
    };

    if (!map) return null;

    return (
        <div 
            style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                padding: '10px',
                borderRadius: '5px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                zIndex: 1000,
                minWidth: '160px'
            }}
        >
            <button
                onClick={() => setIsVisible(!isVisible)}
                style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#007cba',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    marginBottom: isVisible ? '10px' : '0'
                }}
            >
                レイヤー制御 {isVisible ? '▼' : '▶'}
            </button>
            
            {isVisible && (
                <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                        宣言的レイヤー管理
                    </div>
                    {layerConfig.map(layer => (
                        <div key={layer.id} style={{ marginBottom: '5px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={layerVisibility[layer.id] || false}
                                    onChange={() => handleLayerToggle(layer.id)}
                                    style={{ marginRight: '8px' }}
                                />
                                <span style={{ fontSize: '14px' }}>{layer.label}</span>
                            </label>
                        </div>
                    ))}
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #ddd' }}>
                        <button
                            onClick={addTestPins}
                            style={{
                                width: '100%',
                                padding: '5px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            🧪 テストピン追加
                        </button>
                        <button
                            onClick={() => {
                                console.log('🔍 現在のlayerVisibility:', layerVisibility);
                                console.log('🔍 マップのソース:', map.getStyle().sources);
                                console.log('🔍 マップのレイヤー:', map.getStyle().layers.map(l => l.id));
                            }}
                            style={{
                                width: '100%',
                                padding: '5px',
                                backgroundColor: '#17a2b8',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                marginTop: '5px'
                            }}
                        >
                            🔍 デバッグ情報
                        </button>
                        <button
                            onClick={() => {
                                // 市区町村選択のテスト
                                if (map && map._municipalitySelectionHandler) {
                                    const testFeature = {
                                        geometry: {
                                            type: 'Point',
                                            coordinates: [139.7671, 35.6812] // 東京駅
                                        }
                                    };
                                    const testProps = {
                                        prefecture_jp: '東京都',
                                        municipality_jp: '千代田区'
                                    };
                                    map._municipalitySelectionHandler(testFeature, testProps, map);
                                    console.log('🏛️ テスト市区町村選択実行: 東京都千代田区');
                                } else {
                                    console.error('❌ 市区町村選択ハンドラーが見つかりません');
                                }
                            }}
                            style={{
                                width: '100%',
                                padding: '5px',
                                backgroundColor: '#6f42c1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                marginTop: '5px'
                            }}
                        >
                            🏛️ テスト市区町村選択
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}