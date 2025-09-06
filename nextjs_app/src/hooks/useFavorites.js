/**
 * お気に入りピン管理カスタムフック
 * LocalStorageを使用してお気に入りピンを永続化
 */
import { useState, useCallback, useEffect } from 'react';

// LocalStorageのキー
const FAVORITES_STORAGE_KEY = 'mapnest-favorites';
const CURRENT_VERSION = '1.0.0';

// UUIDv4生成（簡易版）
const generateId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// お気に入りピンデータの正規化
const normalizePinData = (pinData, userMemo = '') => {
    const coordinates = pinData.geometry?.coordinates || [0, 0];
    const properties = pinData.properties || {};
    
    return {
        id: generateId(),
        name: properties.name || 'Unknown Location',
        category: properties.category || 'unknown',
        coordinates: coordinates,
        address: properties.address || '',
        phone: properties.phone || '',
        website: properties.website || '',
        cuisine: properties.cuisine || '',
        addedAt: Date.now(),
        userMemo: userMemo,
        originalData: pinData
    };
};

// LocalStorageからデータを読み込み
const loadFavoritesFromStorage = () => {
    try {
        const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
        if (!stored) {
            return {
                pins: [],
                lastUpdated: Date.now(),
                version: CURRENT_VERSION
            };
        }
        
        const parsed = JSON.parse(stored);
        
        // バージョンチェック（将来のマイグレーション用）
        if (parsed.version !== CURRENT_VERSION) {
            console.log(`🔄 お気に入りデータのバージョンを${parsed.version || '未設定'}から${CURRENT_VERSION}に更新`);
            parsed.version = CURRENT_VERSION;
        }
        
        return {
            pins: parsed.pins || [],
            lastUpdated: parsed.lastUpdated || Date.now(),
            version: CURRENT_VERSION
        };
    } catch (error) {
        console.error('❌ お気に入りデータの読み込みエラー:', error);
        return {
            pins: [],
            lastUpdated: Date.now(),
            version: CURRENT_VERSION
        };
    }
};

// LocalStorageにデータを保存
const saveFavoritesToStorage = (favoritesData) => {
    try {
        const dataToSave = {
            ...favoritesData,
            lastUpdated: Date.now()
        };
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(dataToSave));
        console.log(`💾 お気に入り${favoritesData.pins.length}件をLocalStorageに保存`);
    } catch (error) {
        console.error('❌ お気に入りデータの保存エラー:', error);
        
        // 容量制限の場合は古いデータを削除
        if (error.name === 'QuotaExceededError') {
            console.log('📦 LocalStorage容量不足のため、古いお気に入りを削除します');
            try {
                const sortedPins = favoritesData.pins
                    .sort((a, b) => b.addedAt - a.addedAt)
                    .slice(0, Math.floor(favoritesData.pins.length * 0.8)); // 20%削減
                
                const reducedData = {
                    ...favoritesData,
                    pins: sortedPins,
                    lastUpdated: Date.now()
                };
                
                localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(reducedData));
                console.log(`🗂️ 古いお気に入りを削除し、${sortedPins.length}件に削減しました`);
            } catch (retryError) {
                console.error('❌ 容量削減後も保存できませんでした:', retryError);
            }
        }
    }
};

export default function useFavorites() {
    const [favoritesData, setFavoritesData] = useState(loadFavoritesFromStorage);
    
    // 初期化時にLocalStorageから読み込み
    useEffect(() => {
        const data = loadFavoritesFromStorage();
        setFavoritesData(data);
        console.log(`📌 お気に入り${data.pins.length}件を読み込みました`);
    }, []);
    
    // データ変更時にLocalStorageに自動保存
    useEffect(() => {
        if (favoritesData.pins.length > 0 || favoritesData.lastUpdated) {
            saveFavoritesToStorage(favoritesData);
        }
    }, [favoritesData]);

    
    // お気に入りに追加
    const addFavorite = useCallback((pinData, userMemo = '') => {
        if (!pinData) {
            console.error('❌ addFavorite: pinDataが未定義です');
            return null;
        }
        
        const normalizedPin = normalizePinData(pinData, userMemo);
        
        // 重複チェック（同じ座標のピンが既に存在するか）
        const isDuplicate = favoritesData.pins.some(existingPin => {
            const [existingLng, existingLat] = existingPin.coordinates;
            const [newLng, newLat] = normalizedPin.coordinates;
            
            // 座標の差が0.0001度（約10m）以内なら重複とみなす
            const threshold = 0.0001;
            return Math.abs(existingLng - newLng) < threshold && 
                   Math.abs(existingLat - newLat) < threshold;
        });
        
        if (isDuplicate) {
            console.log(`⚠️ 同じ場所のピンが既にお気に入りに登録されています: ${normalizedPin.name}`);
            return null;
        }
        
        setFavoritesData(prev => ({
            ...prev,
            pins: [...prev.pins, normalizedPin]
        }));
        
        console.log(`⭐ お気に入りに追加: ${normalizedPin.name} (${normalizedPin.category})`);
        return normalizedPin.id;
    }, [favoritesData.pins]);
    
    // お気に入りから削除
    const removeFavorite = useCallback((id) => {
        if (!id) {
            console.error('❌ removeFavorite: idが未定義です');
            return false;
        }
        
        const targetPin = favoritesData.pins.find(pin => pin.id === id);
        if (!targetPin) {
            console.error(`❌ 削除対象のお気に入りが見つかりません: ${id}`);
            return false;
        }
        
        setFavoritesData(prev => ({
            ...prev,
            pins: prev.pins.filter(pin => pin.id !== id)
        }));
        
        console.log(`🗑️ お気に入りから削除: ${targetPin.name}`);
        return true;
    }, [favoritesData.pins]);
    
    // IDでお気に入りを取得
    const getFavoriteById = useCallback((id) => {
        return favoritesData.pins.find(pin => pin.id === id) || null;
    }, [favoritesData.pins]);
    
    // ピンデータがお気に入りに登録済みかチェック
    const isFavorite = useCallback((pinData) => {
        if (!pinData || !pinData.geometry?.coordinates) {
            return false;
        }
        
        const [targetLng, targetLat] = pinData.geometry.coordinates;
        const threshold = 0.0001;
        
        return favoritesData.pins.some(favoritePin => {
            const [favLng, favLat] = favoritePin.coordinates;
            return Math.abs(favLng - targetLng) < threshold && 
                   Math.abs(favLat - targetLat) < threshold;
        });
    }, [favoritesData.pins]);
    
    // お気に入りピンをGeoJSON形式で取得
    const getFavoritesAsGeoJSON = useCallback(() => {
        const features = favoritesData.pins.map(pin => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: pin.coordinates
            },
            properties: {
                id: pin.id,
                name: pin.name,
                category: pin.category,
                address: pin.address,
                phone: pin.phone,
                website: pin.website,
                cuisine: pin.cuisine,
                addedAt: pin.addedAt,
                userMemo: pin.userMemo,
                isFavorite: true
            }
        }));
        
        return {
            type: 'FeatureCollection',
            features: features
        };
    }, [favoritesData.pins]);
    
    // お気に入りをカテゴリー別にグループ化
    const getFavoritesByCategory = useCallback(() => {
        const grouped = {};
        
        favoritesData.pins.forEach(pin => {
            const category = pin.category || 'unknown';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(pin);
        });
        
        // 各カテゴリーを追加日時順（新しい順）でソート
        Object.keys(grouped).forEach(category => {
            grouped[category].sort((a, b) => b.addedAt - a.addedAt);
        });
        
        return grouped;
    }, [favoritesData.pins]);
    
    // お気に入り全削除
    const clearAllFavorites = useCallback(() => {
        const count = favoritesData.pins.length;
        setFavoritesData(prev => ({
            ...prev,
            pins: []
        }));
        console.log(`🗑️ お気に入り${count}件をすべて削除しました`);
        return count;
    }, [favoritesData.pins]);
    
    // エクスポート用データ取得
    const exportFavorites = useCallback(() => {
        const exportData = {
            ...favoritesData,
            exportedAt: Date.now(),
            appVersion: CURRENT_VERSION
        };
        return JSON.stringify(exportData, null, 2);
    }, [favoritesData]);
    
    // インポートデータ処理
    const importFavorites = useCallback((importData, mergeMode = false) => {
        try {
            const parsed = typeof importData === 'string' ? JSON.parse(importData) : importData;
            
            if (!parsed.pins || !Array.isArray(parsed.pins)) {
                throw new Error('Invalid favorites data format');
            }
            
            const importedPins = parsed.pins.filter(pin => 
                pin.id && pin.name && pin.coordinates && Array.isArray(pin.coordinates)
            );
            
            if (mergeMode) {
                // 重複を避けてマージ
                const existingIds = new Set(favoritesData.pins.map(pin => pin.id));
                const newPins = importedPins.filter(pin => !existingIds.has(pin.id));
                
                setFavoritesData(prev => ({
                    ...prev,
                    pins: [...prev.pins, ...newPins]
                }));
                
                console.log(`📥 お気に入り${newPins.length}件を追加インポートしました`);
                return newPins.length;
            } else {
                // 完全置換
                setFavoritesData(prev => ({
                    ...prev,
                    pins: importedPins
                }));
                
                console.log(`📥 お気に入り${importedPins.length}件を置換インポートしました`);
                return importedPins.length;
            }
        } catch (error) {
            console.error('❌ インポートエラー:', error);
            throw error;
        }
    }, [favoritesData.pins]);
    
    return {
        // データ
        favorites: favoritesData.pins,
        favoritesCount: favoritesData.pins.length,
        lastUpdated: favoritesData.lastUpdated,
        
        // 基本操作
        addFavorite,
        removeFavorite,
        getFavoriteById,
        isFavorite,
        
        // データ取得
        getFavoritesAsGeoJSON,
        getFavoritesByCategory,
        
        // 管理操作
        clearAllFavorites,
        exportFavorites,
        importFavorites
    };
}