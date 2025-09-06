'use client';

import { useState, useEffect } from 'react';
import styles from './ControlPanel.module.css';

export default function ControlPanel({ map, zoom, searchCount, toggleLayer, layerVisibility }) {
    const [layerName, setLayerName] = useState('');
    const [activeTab, setActiveTab] = useState('info');
    const [isVisible, setIsVisible] = useState(false);

    // ズームレベルに応じたレイヤー名を設定
    useEffect(() => {
        let name = '';
        if (zoom >= 3 && zoom < 6) {
            name = '地方';
        } else if (zoom >= 6 && zoom < 8) {
            name = '都道府県';
        } else if (zoom >= 8 && zoom < 11) {
            name = '市区町村';
        } else if (zoom >= 11) {
            name = '詳細';
        }
        setLayerName(name);
    }, [zoom]);

    const layerConfig = [
        { id: 'regions', label: '地方' },
        { id: 'prefectures', label: '都道府県' },
        { id: 'municipalities', label: '市区町村' },
        { id: 'searchPins', label: '検索ピン' },
        { id: 'searchClusters', label: 'クラスター' },
        { id: 'favorites', label: 'お気に入り' },
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

    return (
        <div className={styles.controlPanel}>
            <div className={styles.header}>
                <div className={styles.tabContainer}>
                    <button
                        className={`${styles.tab} ${activeTab === 'info' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('info')}
                        type="button"
                    >
                        ℹ️ 情報
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'layers' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('layers')}
                        type="button"
                    >
                        🎛️ レイヤー
                    </button>
                </div>
                <button 
                    className={styles.toggleButton}
                    onClick={() => setIsVisible(!isVisible)}
                    type="button"
                >
                    {isVisible ? '−' : '+'}
                </button>
            </div>

            {/* 非表示時のヘッダー表示 */}
            {!isVisible && (
                <div className={styles.summaryText}>
                    {activeTab === 'info' 
                        ? `Zoom: ${zoom.toFixed(1)} | ${layerName}`
                        : 'レイヤー制御'
                    }
                </div>
            )}

            {isVisible && (
                <div className={styles.content}>
                    {activeTab === 'info' ? (
                        // 情報タブのコンテンツ
                        <div className={styles.infoContent}>
                            <div className={styles.zoomInfo}>
                                Zoom: <span className={styles.value}>{zoom.toFixed(1)}</span>
                            </div>
                            <div className={styles.layerInfo}>
                                Layer: <span className={styles.value}>{layerName}</span>
                            </div>
                            <div className={styles.clickableHint}>💡 クリックで次の階層へ</div>
                            {searchCount > 0 && (
                                <div className={styles.searchCount}>
                                    検索結果: <span className={styles.value}>{searchCount}件</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        // レイヤータブのコンテンツ
                        <div className={styles.layersContent}>
                            <div className={styles.sectionTitle}>宣言的レイヤー管理</div>
                            {layerConfig.map(layer => (
                                <div key={layer.id} className={styles.layerItem}>
                                    <label className={styles.layerLabel}>
                                        <input
                                            type="checkbox"
                                            checked={layerVisibility[layer.id] || false}
                                            onChange={() => handleLayerToggle(layer.id)}
                                            className={styles.layerCheckbox}
                                        />
                                        <span className={styles.layerName}>{layer.label}</span>
                                    </label>
                                </div>
                            ))}
                            <div className={styles.debugSection}>
                                <button
                                    onClick={addTestPins}
                                    className={`${styles.debugButton} ${styles.testButton}`}
                                >
                                    🧪 テストピン追加
                                </button>
                                <button
                                    onClick={() => {
                                        console.log('🔍 現在のlayerVisibility:', layerVisibility);
                                        console.log('🔍 マップのソース:', map?.getStyle()?.sources);
                                        console.log('🔍 マップのレイヤー:', map?.getStyle()?.layers?.map(l => l.id));
                                    }}
                                    className={`${styles.debugButton} ${styles.infoButton}`}
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
                                                    coordinates: [139.7671, 35.6812]
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
                                    className={`${styles.debugButton} ${styles.municipalityButton}`}
                                >
                                    🏛️ テスト市区町村選択
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}