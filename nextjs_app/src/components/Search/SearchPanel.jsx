'use client';

import { useState, useCallback } from 'react';
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

    // 市区町村クリック処理を追加
    const handleMunicipalityClick = useCallback(() => {
        if (!map) return;
        
        // 一度だけクリックイベントを登録
        const clickHandler = (e) => {
            const features = map.queryRenderedFeatures(e.point, {
                layers: ['municipalities-fill']
            });
            
            if (features.length > 0) {
                const props = features[0].properties;
                setSelectedMunicipality({
                    prefecture: props.prefecture_jp,
                    municipality: props.municipality_jp
                });
                
                // クリックイベントを削除
                map.off('click', clickHandler);
                map.getCanvasContainer().style.cursor = '';
            }
        };
        
        alert('地図上の市区町村をクリックしてください');
        map.getCanvasContainer().style.cursor = 'crosshair';
        map.on('click', clickHandler);
    }, [map]);

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
                
                <button 
                    onClick={handleMunicipalityClick}
                    disabled={searchState.isLoading}
                    className={`${styles.button} ${styles.selectButton}`}
                    type="button"
                >
                    {selectedMunicipality 
                        ? `${selectedMunicipality.prefecture} ${selectedMunicipality.municipality}` 
                        : '市区町村を選択'}
                </button>
                
                {selectedMunicipality && (
                    <button 
                        onClick={() => setSelectedMunicipality(null)}
                        className={`${styles.button} ${styles.clearButton}`}
                        type="button"
                    >
                        選択解除
                    </button>
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