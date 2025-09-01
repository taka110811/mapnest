'use client';

import { useState, useCallback } from 'react';
import useSearch from '../../hooks/useSearch';
import { categoryConfig } from '../../services/overpassApi';
import styles from './SearchPanel.module.css';

export default function SearchPanel({ map, currentZoom, onSearchComplete }) {
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedCuisine, setSelectedCuisine] = useState('');
    const { searchState, executeSearch, clearSearchData } = useSearch();

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

    const handleSearchClick = useCallback(async () => {
        if (!selectedCategory || !map) return;
        
        if (currentZoom <= 10) {
            alert('検索を実行するには、ズームレベル11以上まで拡大してください。');
            return;
        }
        
        await executeSearch(map, selectedCategory, selectedCuisine);
        
        if (onSearchComplete) {
            onSearchComplete(searchState.results.length);
        }
    }, [selectedCategory, selectedCuisine, map, currentZoom, executeSearch, onSearchComplete, searchState.results.length]);

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