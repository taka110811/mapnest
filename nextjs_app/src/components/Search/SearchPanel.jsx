'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import useSearch from '../../hooks/useSearch';
import useFavorites from '../../hooks/useFavorites';
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

export default function SearchPanel({ map, onSearchComplete, searchHook, onMunicipalitySelectionHandlerReady, updateFavoritesPins }) {
    const [selectedCategory, setSelectedCategory] = useState('restaurant'); // デフォルトでレストランを選択
    const [selectedCuisine, setSelectedCuisine] = useState('');
    const [selectedMunicipality, setSelectedMunicipality] = useState(null); // { prefecture: "東京都", municipality: "渋谷区" }
    const [isVisible, setIsVisible] = useState(false); // デフォルトで非表示状態
    const [activeTab, setActiveTab] = useState('search'); // 'search', 'favorites'
    const [favoritesQuery, setFavoritesQuery] = useState('');
    
    // MapContainerから渡されたsearchHookを使用、フォールバック用にローカルのuseSearchも保持
    const localSearch = useSearch();
    const { searchState, executeAreaSearch, clearSearchData } = searchHook || localSearch;
    
    // お気に入り機能
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
    
    console.log('🔍 SearchPanel: searchHook状態', { 
        hasSearchHook: !!searchHook,
        hasExecuteAreaSearch: !!executeAreaSearch,
        searchStateCategory: searchState?.currentCategory
    });

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
        console.log('🔍 executeAreaSearch状態:', { 
            hasExecuteAreaSearch: !!executeAreaSearch,
            selectedCategory,
            prefecture: municipalitySelection.prefecture,
            municipality: municipalitySelection.municipality,
            selectedCuisine
        });
        
        // 市区町村ベース検索を実行
        if (executeAreaSearch) {
            executeAreaSearch(
                map,
                selectedCategory,
                municipalitySelection.prefecture,
                municipalitySelection.municipality,
                selectedCuisine
            );
        } else {
            console.error('❌ executeAreaSearchが利用できません');
        }
        
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
        // propsの安全性チェック
        if (!props) {
            console.error('❌ 市区町村選択: propsがありません', { feature, props });
            return false;
        }
        
        if (!props.prefecture_jp || !props.municipality_jp) {
            console.error('❌ 市区町村選択: prefecture_jpまたはmunicipality_jpがありません', props);
            return false;
        }
        
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
    const handlerNotifiedRef = useRef(false);
    useEffect(() => {
        if (map && handleMunicipalitySelection) {
            map._municipalitySelectionHandler = handleMunicipalitySelection;
            
            // 親にもhandleMunicipalitySelectionを通知（一度だけ）
            if (onMunicipalitySelectionHandlerReady && !handlerNotifiedRef.current) {
                onMunicipalitySelectionHandlerReady(handleMunicipalitySelection);
                handlerNotifiedRef.current = true;
                console.log('🏛️ MunicipalitySelectionHandler通知完了');
            }
        }
        return () => {
            if (map && map._municipalitySelectionHandler) {
                delete map._municipalitySelectionHandler;
            }
        };
    }, [map, handleMunicipalitySelection, onMunicipalitySelectionHandlerReady]);


    const showCuisineSelect = selectedCategory === 'restaurant' || selectedCategory === 'cafe';

    return (
        <div className={styles.searchPanel}>
            <div className={styles.header}>
                <div className={styles.tabContainer}>
                    <button
                        className={`${styles.tab} ${activeTab === 'search' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('search')}
                        type="button"
                    >
                        🔍 検索
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'favorites' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('favorites')}
                        type="button"
                    >
                        ⭐ お気に入り {favoritesCount > 0 && <span className={styles.count}>({favoritesCount})</span>}
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
                <div className={styles.categoryText}>
                    {activeTab === 'search' 
                        ? (selectedCategory 
                            ? `${categoryConfig[selectedCategory]?.icon} ${categoryConfig[selectedCategory]?.name}` 
                            : 'カテゴリー未選択')
                        : `⭐ お気に入り ${favoritesCount}件`
                    }
                </div>
            )}
            
            {isVisible && (
            <div className={styles.content}>
                {activeTab === 'search' ? (
                    // 検索タブのコンテンツ
                    <>
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
                        : '市区町村を選択して検索してください'}
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
                    </>
                ) : (
                    // お気に入りタブのコンテンツ
                    <div className={styles.favoritesContent}>
                        {favoritesCount === 0 ? (
                            <div className={styles.emptyState}>
                                <p>まだお気に入りがありません</p>
                                <small>検索結果からピンをクリックして「お気に入りに追加」してください</small>
                            </div>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    placeholder="お気に入りを検索..."
                                    value={favoritesQuery}
                                    onChange={(e) => setFavoritesQuery(e.target.value)}
                                    className={styles.searchInput}
                                />
                                <div className={styles.favoritesList}>
                                    {favorites
                                        .filter(fav => 
                                            fav.name.toLowerCase().includes(favoritesQuery.toLowerCase()) ||
                                            fav.address.toLowerCase().includes(favoritesQuery.toLowerCase())
                                        )
                                        .map(favorite => (
                                            <div
                                                key={favorite.id}
                                                className={styles.favoriteItem}
                                                onClick={() => {
                                                    if (map) {
                                                        map.easeTo({
                                                            center: favorite.coordinates,
                                                            zoom: Math.max(map.getZoom(), 15),
                                                            duration: 1000
                                                        });
                                                    }
                                                }}
                                            >
                                                <div className={styles.favoriteHeader}>
                                                    <span className={styles.favoriteName}>
                                                        {categoryConfig[favorite.category]?.icon || '📍'} {favorite.name}
                                                    </span>
                                                    <button
                                                        className={styles.deleteButton}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm('このお気に入りを削除しますか？')) {
                                                                removeFavorite(favorite.id);
                                                            }
                                                        }}
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
                                            </div>
                                        ))
                                    }
                                </div>
                                <div className={styles.favoritesActions}>
                                    <button
                                        onClick={() => {
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
                                            } catch (error) {
                                                console.error('エクスポートエラー:', error);
                                                alert('エクスポートに失敗しました');
                                            }
                                        }}
                                        className={styles.actionButton}
                                    >
                                        📥 エクスポート
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm(`お気に入り${favoritesCount}件をすべて削除しますか？`)) {
                                                clearAllFavorites();
                                            }
                                        }}
                                        className={styles.actionButton}
                                    >
                                        🗑️ 全削除
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
            )}
        </div>
    );
}