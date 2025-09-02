'use client';

import { useState, useCallback, useEffect } from 'react';
import useSearch from '../../hooks/useSearch';
import { categoryConfig } from '../../services/overpassApi';
import styles from './SearchPanel.module.css';

// ポリゴンの重心を計算するヘルパー関数
const calculatePolygonCenter = (coordinates) => {
    if (!coordinates || coordinates.length === 0) return null;
    
    let totalLat = 0;
    let totalLng = 0;
    let pointCount = 0;
    
    coordinates.forEach(coord => {
        if (Array.isArray(coord) && coord.length >= 2) {
            totalLng += coord[0];
            totalLat += coord[1];
            pointCount++;
        }
    });
    
    if (pointCount === 0) return null;
    
    return [totalLng / pointCount, totalLat / pointCount];
};

export default function SearchPanel({ map, onSearchComplete }) {
    const [selectedCategory, setSelectedCategory] = useState('restaurant'); // デフォルトでレストランを選択
    const [selectedCuisine, setSelectedCuisine] = useState('');
    const [selectedMunicipality, setSelectedMunicipality] = useState(null); // { prefecture: "東京都", municipality: "渋谷区" }
    const [isVisible, setIsVisible] = useState(false); // デフォルトで非表示状態
    const { searchState, executeAreaSearch, clearSearchData } = useSearch();

    const handleCategoryChange = useCallback((e) => {
        const category = e.target.value;
        setSelectedCategory(category);
        
        // レストラン/カフェ以外の場合は料理ジャンルをクリア
        if (category !== 'restaurant' && category !== 'cafe') {
            setSelectedCuisine('');
        }
        
        // 既存の検索結果をクリア
        if (map && category !== searchState.currentCategory) {
            clearSearchData(map);
        }
    }, [map, searchState.currentCategory, clearSearchData]);

    const handleCuisineChange = useCallback((e) => {
        setSelectedCuisine(e.target.value);
        
        // 既存の検索結果をクリア
        if (map) {
            clearSearchData(map);
        }
    }, [map, clearSearchData]);

    // 自動検索をトリガーする関数
    const triggerAutoSearch = useCallback((municipalitySelection) => {
        // カテゴリーが選択されていない場合は検索しない
        if (!selectedCategory) {
            console.log('⚠️ カテゴリーが未選択のため検索をスキップ');
            return;
        }
        
        if (!map) {
            console.log('⚠️ マップが未初期化のため検索をスキップ');
            return;
        }
        
        console.log(`🔍 自動検索実行: ${municipalitySelection.prefecture}${municipalitySelection.municipality} - ${categoryConfig[selectedCategory]?.name}`);
        
        // 市区町村ベース検索を実行
        executeAreaSearch(
            map,
            selectedCategory,
            municipalitySelection.prefecture,
            municipalitySelection.municipality,
            selectedCuisine
        );
        
        if (onSearchComplete) {
            // 検索完了コールバック（結果数は後で更新される）
            setTimeout(() => {
                if (onSearchComplete && searchState.results) {
                    onSearchComplete(searchState.results.length);
                }
            }, 1000);
        }
    }, [selectedCategory, selectedCuisine, map, executeAreaSearch, onSearchComplete, searchState.results]);

    // 市区町村選択処理（MapContainer経由で呼び出される）
    const handleMunicipalitySelection = useCallback((feature, props, map) => {
        const newSelection = {
            prefecture: props.prefecture_jp,
            municipality: props.municipality_jp
        };
        
        // 同じ市区町村を再クリックした場合は何もしない（選択維持）
        if (selectedMunicipality && 
            selectedMunicipality.prefecture === newSelection.prefecture && 
            selectedMunicipality.municipality === newSelection.municipality) {
            console.log(`📍 ${newSelection.prefecture}${newSelection.municipality}は既に選択済み`);
            return false; // 処理をスキップ
        }
        
        // 市区町村の中心座標を計算してカメラを移動
        const geometry = feature.geometry;
        
        if (geometry && geometry.coordinates) {
            let center;
            
            // ジオメトリタイプに応じて中心点を計算
            if (geometry.type === 'Point') {
                center = geometry.coordinates;
            } else if (geometry.type === 'Polygon') {
                // ポリゴンの重心を計算
                center = calculatePolygonCenter(geometry.coordinates[0]);
            } else if (geometry.type === 'MultiPolygon') {
                // 最大のポリゴンの重心を計算
                const largestPolygon = geometry.coordinates.reduce((largest, current) => 
                    current[0].length > largest[0].length ? current : largest
                );
                center = calculatePolygonCenter(largestPolygon[0]);
            }
            
            if (center) {
                console.log(`🎯 ${newSelection.prefecture}${newSelection.municipality}の中心に移動:`, center);
                
                // 市区町村が適切に表示されるズームレベル（12程度）
                const targetZoom = Math.max(map.getZoom(), 12);
                
                map.easeTo({
                    center: [center[0], center[1]],
                    zoom: targetZoom,
                    duration: 1000 // 1秒かけてスムーズに移動
                });
            }
        }
        
        // 新しい市区町村を選択または切り替え
        setSelectedMunicipality(newSelection);
        if (selectedMunicipality) {
            console.log(`🔄 ${selectedMunicipality.prefecture}${selectedMunicipality.municipality} → ${newSelection.prefecture}${newSelection.municipality}に切り替えました`);
        } else {
            console.log(`📍 ${newSelection.prefecture}${newSelection.municipality}を選択しました`);
        }
        
        // 自動検索実行
        triggerAutoSearch(newSelection);
        
        return true; // 処理成功
    }, [selectedMunicipality, triggerAutoSearch]);


    // 市区町村選択関数をMapContainerで利用できるよう登録
    useEffect(() => {
        if (map && handleMunicipalitySelection) {
            map._municipalitySelectionHandler = handleMunicipalitySelection;
        }
        return () => {
            if (map && map._municipalitySelectionHandler) {
                delete map._municipalitySelectionHandler;
            }
        };
    }, [map, handleMunicipalitySelection]);


    const showCuisineSelect = selectedCategory === 'restaurant' || selectedCategory === 'cafe';

    return (
        <div className={styles.searchPanel}>
            <div className={styles.header}>
                <h3 className={styles.title}>🔍 検索</h3>
                <button 
                    className={styles.toggleButton}
                    onClick={() => setIsVisible(!isVisible)}
                    type="button"
                >
                    {isVisible ? '−' : '+'}
                </button>
            </div>
            
            {/* 表示時はカテゴリー選択、非表示時はテキスト表示 */}
            {isVisible ? (
                <select 
                    value={selectedCategory} 
                    onChange={handleCategoryChange}
                    className={styles.select}
                >
                    <option value="">カテゴリーを選択</option>
                    {Object.entries(categoryConfig).map(([key, config]) => (
                        <option key={key} value={key}>
                            {config.icon} {config.name}
                        </option>
                    ))}
                </select>
            ) : (
                <div className={styles.categoryText}>
                    {selectedCategory 
                        ? `${categoryConfig[selectedCategory]?.icon} ${categoryConfig[selectedCategory]?.name}` 
                        : 'カテゴリー未選択'}
                </div>
            )}
            
            {isVisible && (
            <div className={styles.content}>

            {showCuisineSelect && (
                <select 
                    value={selectedCuisine} 
                    onChange={handleCuisineChange}
                    className={styles.select}
                >
                    <option value="">料理ジャンル（任意）</option>
                    <option value="japanese">和食</option>
                    <option value="chinese">中華</option>
                    <option value="italian">イタリアン</option>
                    <option value="french">フレンチ</option>
                    <option value="yakiniku">焼肉</option>
                    <option value="ramen">ラーメン</option>
                    <option value="sushi">寿司</option>
                    <option value="pizza">ピザ</option>
                    <option value="korean">韓国料理</option>
                </select>
            )}

            <div className={styles.searchModeSection}>
                <div className={styles.searchModeTitle}>📍 検索範囲</div>
                
                {selectedMunicipality ? (
                    <div className={styles.selectedMunicipality}>
                        <div className={styles.selectedText}>
                            {selectedMunicipality.prefecture} {selectedMunicipality.municipality}
                        </div>
                        <button 
                            onClick={() => setSelectedMunicipality(null)}
                            className={`${styles.button} ${styles.clearButton}`}
                            type="button"
                        >
                            ×
                        </button>
                    </div>
                ) : (
                    <div className={styles.noSelection}>
                        地図上の市区町村をクリックして選択
                    </div>
                )}
                
                <div className={styles.searchModeInfo}>
                    {selectedMunicipality 
                        ? `${selectedMunicipality.municipality}全体で検索します` 
                        : '現在の表示範囲で検索します（ズーム11以上必要）'}
                </div>
            </div>

            {/* 自動検索のため、検索実行ボタンは削除 */}

            <div className={styles.results}>
                {searchState.error && (
                    <div className={styles.error}>{searchState.error}</div>
                )}
                {searchState.results.length > 0 && !searchState.error && (
                    <div className={styles.success}>
                        {categoryConfig[selectedCategory]?.name}: {searchState.results.length}件見つかりました
                    </div>
                )}
            </div>
            
            </div>
            )}
        </div>
    );
}