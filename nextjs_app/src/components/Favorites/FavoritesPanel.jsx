'use client';

import { useState, useCallback, useEffect } from 'react';
import useFavorites from '../../hooks/useFavorites';
import { categoryConfig } from '../../services/overpassApi';
import styles from './FavoritesPanel.module.css';

export default function FavoritesPanel({ map, onFavoriteClick, updateFavoritesPins }) {
    const [isVisible, setIsVisible] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    const {
        favorites,
        favoritesCount,
        addFavorite,
        removeFavorite,
        getFavoritesByCategory,
        getFavoritesAsGeoJSON,
        clearAllFavorites,
        exportFavorites
    } = useFavorites();
    
    // お気に入りが変更された時に地図に反映
    useEffect(() => {
        if (updateFavoritesPins) {
            const geoJSON = getFavoritesAsGeoJSON();
            updateFavoritesPins(geoJSON);
        }
    }, [favorites, updateFavoritesPins, getFavoritesAsGeoJSON]);

    // グローバルなお気に入り追加関数を設定
    useEffect(() => {
        window.addToFavorites = (name, category, coordinates, address = '', icon = '📍') => {
            const pinData = {
                geometry: {
                    coordinates: coordinates || [0, 0]
                },
                properties: {
                    name: name || '名称不明',
                    category: category || 'other',
                    address: address || '',
                    icon: icon || '📍'
                }
            };
            
            // useFavoritesのaddFavorite関数を直接使用
            const result = addFavorite(pinData, '');
            
            if (result) {
                console.log('⭐ お気に入りに追加完了:', name);
            } else {
                console.log('⚠️ お気に入り追加をスキップ（重複またはエラー）:', name);
            }
        };
        
        return () => {
            delete window.addToFavorites;
        };
    }, [addFavorite]);
    
    // カテゴリー別のお気に入りを取得
    const favoritesByCategory = getFavoritesByCategory();
    
    // フィルタリングされたお気に入りを取得
    const getFilteredFavorites = useCallback(() => {
        let filtered = favorites;
        
        // カテゴリーフィルター
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(fav => fav.category === selectedCategory);
        }
        
        // 検索フィルター
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(fav => 
                fav.name.toLowerCase().includes(query) ||
                fav.address.toLowerCase().includes(query) ||
                fav.userMemo.toLowerCase().includes(query)
            );
        }
        
        return filtered.sort((a, b) => b.addedAt - a.addedAt); // 新しい順
    }, [favorites, selectedCategory, searchQuery]);
    
    const filteredFavorites = getFilteredFavorites();
    
    // お気に入りアイテムをクリック
    const handleFavoriteItemClick = useCallback((favorite) => {
        if (map && favorite.coordinates) {
            // 地図をお気に入りの位置に移動
            map.easeTo({
                center: favorite.coordinates,
                zoom: Math.max(map.getZoom(), 15), // 最低ズーム15
                duration: 1000
            });
            
            console.log(`🎯 お気に入りに移動: ${favorite.name}`);
            
            // 親コンポーネントにも通知
            if (onFavoriteClick) {
                onFavoriteClick(favorite);
            }
        }
    }, [map, onFavoriteClick]);
    
    // お気に入り削除
    const handleRemoveFavorite = useCallback((e, favoriteId) => {
        e.stopPropagation(); // アイテムクリックイベントを防ぐ
        
        if (confirm('このお気に入りを削除しますか？')) {
            removeFavorite(favoriteId);
        }
    }, [removeFavorite]);
    
    // 全削除
    const handleClearAll = useCallback(() => {
        if (confirm(`お気に入り${favoritesCount}件をすべて削除しますか？\nこの操作は元に戻せません。`)) {
            clearAllFavorites();
        }
    }, [clearAllFavorites, favoritesCount]);
    
    // エクスポート
    const handleExport = useCallback(() => {
        try {
            const data = exportFavorites();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `mapnest-favorites-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('📥 お気に入りをエクスポートしました');
        } catch (error) {
            console.error('❌ エクスポートエラー:', error);
            alert('エクスポートに失敗しました');
        }
    }, [exportFavorites]);
    
    // カテゴリー一覧の取得
    const availableCategories = Object.keys(favoritesByCategory).filter(cat => favoritesByCategory[cat].length > 0);
    
    return (
        <div className={styles.favoritesPanel}>
            <div className={styles.header}>
                <h3 className={styles.title}>
                    ⭐ お気に入り 
                    {favoritesCount > 0 && <span className={styles.count}>({favoritesCount})</span>}
                </h3>
                <button 
                    className={styles.toggleButton}
                    onClick={() => setIsVisible(!isVisible)}
                    type="button"
                >
                    {isVisible ? '−' : '+'}
                </button>
            </div>
            
            {isVisible && (
                <div className={styles.content}>
                    {favoritesCount === 0 ? (
                        <div className={styles.emptyState}>
                            <p>まだお気に入りがありません</p>
                            <small>検索結果からピンをクリックして「お気に入りに追加」してください</small>
                        </div>
                    ) : (
                        <>
                            {/* フィルター・検索エリア */}
                            <div className={styles.filterSection}>
                                <div className={styles.categoryFilter}>
                                    <select 
                                        value={selectedCategory} 
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className={styles.select}
                                    >
                                        <option value="all">すべてのカテゴリー</option>
                                        {availableCategories.map(category => (
                                            <option key={category} value={category}>
                                                {categoryConfig[category]?.icon || '📍'} {categoryConfig[category]?.name || category}
                                                ({favoritesByCategory[category].length})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className={styles.searchFilter}>
                                    <input
                                        type="text"
                                        placeholder="お気に入りを検索..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className={styles.searchInput}
                                    />
                                </div>
                            </div>
                            
                            {/* お気に入りリスト */}
                            <div className={styles.favoritesList}>
                                {filteredFavorites.length === 0 ? (
                                    <div className={styles.noResults}>
                                        検索条件に一致するお気に入りがありません
                                    </div>
                                ) : (
                                    filteredFavorites.map(favorite => (
                                        <div
                                            key={favorite.id}
                                            className={styles.favoriteItem}
                                            onClick={() => handleFavoriteItemClick(favorite)}
                                        >
                                            <div className={styles.favoriteHeader}>
                                                <div className={styles.favoriteTitle}>
                                                    <span className={styles.categoryIcon}>
                                                        {categoryConfig[favorite.category]?.icon || '📍'}
                                                    </span>
                                                    <span className={styles.favoriteName}>
                                                        {favorite.name}
                                                    </span>
                                                </div>
                                                <button
                                                    className={styles.deleteButton}
                                                    onClick={(e) => handleRemoveFavorite(e, favorite.id)}
                                                    title="削除"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                            
                                            {favorite.address && (
                                                <div className={styles.favoriteAddress}>
                                                    📍 {favorite.address}
                                                </div>
                                            )}
                                            
                                            {favorite.userMemo && (
                                                <div className={styles.favoriteMemo}>
                                                    📝 {favorite.userMemo}
                                                </div>
                                            )}
                                            
                                            <div className={styles.favoriteFooter}>
                                                <span className={styles.categoryLabel}>
                                                    {categoryConfig[favorite.category]?.name || favorite.category}
                                                </span>
                                                <span className={styles.addedDate}>
                                                    {new Date(favorite.addedAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            
                            {/* アクションボタン */}
                            <div className={styles.actions}>
                                <button
                                    onClick={handleExport}
                                    className={`${styles.actionButton} ${styles.exportButton}`}
                                    disabled={favoritesCount === 0}
                                >
                                    📥 エクスポート
                                </button>
                                <button
                                    onClick={handleClearAll}
                                    className={`${styles.actionButton} ${styles.clearButton}`}
                                    disabled={favoritesCount === 0}
                                >
                                    🗑️ 全削除
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}