'use client';

import { useState, useCallback, useEffect } from 'react';
import useSearch from '../../hooks/useSearch';
import { categoryConfig } from '../../services/overpassApi';
import styles from './SearchPanel.module.css';

export default function SearchPanel({ map, currentZoom, onSearchComplete }) {
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedCuisine, setSelectedCuisine] = useState('');
    const [selectedMunicipality, setSelectedMunicipality] = useState(null); // { prefecture: "東京都", municipality: "渋谷区" }
    const { searchState, executeSearch, executeAreaSearch, clearSearchData } = useSearch();

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

    // 市区町村自動選択処理
    const setupMunicipalityAutoSelection = useCallback(() => {
        if (!map) return;
        
        const clickHandler = (e) => {
            const features = map.queryRenderedFeatures(e.point, {
                layers: ['municipalities-fill']
            });
            
            if (features.length > 0) {
                const props = features[0].properties;
                const newSelection = {
                    prefecture: props.prefecture_jp,
                    municipality: props.municipality_jp
                };
                
                // 同じ市区町村を再クリックした場合は何もしない（選択維持）
                if (selectedMunicipality && 
                    selectedMunicipality.prefecture === newSelection.prefecture && 
                    selectedMunicipality.municipality === newSelection.municipality) {
                    console.log(`📍 ${newSelection.prefecture}${newSelection.municipality}は既に選択済み`);
                    return; // 何もしない
                }
                
                // 新しい市区町村を選択または切り替え
                setSelectedMunicipality(newSelection);
                if (selectedMunicipality) {
                    console.log(`🔄 ${selectedMunicipality.prefecture}${selectedMunicipality.municipality} → ${newSelection.prefecture}${newSelection.municipality}に切り替えました`);
                } else {
                    console.log(`📍 ${newSelection.prefecture}${newSelection.municipality}を選択しました`);
                }
            }
        };
        
        map.on('click', clickHandler);
        
        // クリーンアップ用の関数を返す
        return () => {
            map.off('click', clickHandler);
        };
    }, [map, selectedMunicipality]);

    const handleSearchClick = useCallback(async () => {
        if (!selectedCategory || !map) return;
        
        // 市区町村が選択されている場合は市区町村ベース検索
        if (selectedMunicipality) {
            await executeAreaSearch(
                map, 
                selectedCategory, 
                selectedMunicipality.prefecture, 
                selectedMunicipality.municipality, 
                selectedCuisine
            );
        } else {
            // 従来の座標ベース検索
            if (currentZoom <= 10) {
                alert('検索を実行するには、ズームレベル11以上まで拡大するか、市区町村を選択してください。');
                return;
            }
            await executeSearch(map, selectedCategory, selectedCuisine);
        }
        
        if (onSearchComplete) {
            onSearchComplete(searchState.results.length);
        }
    }, [selectedCategory, selectedCuisine, selectedMunicipality, map, currentZoom, executeSearch, executeAreaSearch, onSearchComplete, searchState.results.length]);

    // 市区町村クリックハンドラーの自動設定
    useEffect(() => {
        if (!map) return;
        
        const cleanup = setupMunicipalityAutoSelection();
        return cleanup;
    }, [map, setupMunicipalityAutoSelection]);

    const showCuisineSelect = selectedCategory === 'restaurant' || selectedCategory === 'cafe';

    return (
        <div className={styles.searchPanel}>
            <h3 className={styles.title}>🔍 検索</h3>
            
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

            <button 
                onClick={handleSearchClick}
                disabled={!selectedCategory || searchState.isLoading}
                className={styles.button}
            >
                {searchState.isLoading ? '検索中...' : '検索実行'}
            </button>

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
    );
}