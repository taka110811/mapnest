/**
 * 検索機能カスタムフック
 */
import { useState, useCallback, useRef } from 'react';
import { 
    categoryConfig, 
    getSearchRange, 
    buildOverpassQuery, 
    queryOverpassAPI, 
    isValidElement, 
    elementToFeature 
} from '../services/overpassApi';
import { createSearchAreaFeature } from '../utils/mapUtils';

export default function useSearch() {
    const [searchState, setSearchState] = useState({
        isLoading: false,
        results: [],
        error: null,
        currentCategory: '',
        currentCuisine: '',
        searchDataLoaded: false
    });

    const lastSearchCenter = useRef(null);
    const searchTimeout = useRef(null);

    /**
     * 検索を実行
     */
    const executeSearch = useCallback(async (map, category, cuisine = '') => {
        if (!map || !categoryConfig[category]) {
            console.error(`未対応のカテゴリー: ${category}`);
            return;
        }

        setSearchState(prev => ({ 
            ...prev, 
            isLoading: true, 
            error: null,
            currentCategory: category,
            currentCuisine: cuisine
        }));

        const center = map.getCenter();
        const zoom = map.getZoom();
        const range = getSearchRange(zoom);
        
        const south = center.lat - range;
        const west = center.lng - range;
        const north = center.lat + range;
        const east = center.lng + range;
        
        console.log(`検索範囲: ${south.toFixed(4)}, ${west.toFixed(4)}, ${north.toFixed(4)}, ${east.toFixed(4)}`);
        
        try {
            const overpassQuery = buildOverpassQuery(category, cuisine, south, west, north, east);
            const response = await queryOverpassAPI(overpassQuery);
            const features = processOverpassResponse(response, category);
            
            // データをマップに追加
            if (map.getSource('search-pins')) {
                map.getSource('search-pins').setData({
                    type: 'FeatureCollection',
                    features: features
                });
            }
            
            // ピンの色を更新
            updatePinStyle(map, category);
            
            console.log(`${categoryConfig[category].name}を ${features.length}件発見しました`);
            
            setSearchState(prev => ({
                ...prev,
                isLoading: false,
                results: features,
                searchDataLoaded: true
            }));
            
        } catch (error) {
            console.error('検索エラー:', error);
            
            // エラー時は空のデータを表示
            if (map.getSource('search-pins')) {
                map.getSource('search-pins').setData({
                    type: 'FeatureCollection',
                    features: []
                });
            }
            
            setSearchState(prev => ({
                ...prev,
                isLoading: false,
                error: error.message,
                results: []
            }));
        }
    }, []);

    /**
     * 検索データをクリア
     */
    /**
     * 市区町村エリア検索を実行
     */
    const executeAreaSearch = useCallback(async (map, category, prefectureName, municipalityName, cuisine = '') => {
        if (!map || !categoryConfig[category] || !prefectureName || !municipalityName) {
            console.error(`市区町村検索に必要なパラメータが不足しています`);
            return;
        }

        setSearchState(prev => ({ 
            ...prev, 
            isLoading: true, 
            error: null,
            currentCategory: category,
            currentCuisine: cuisine
        }));

        try {
            console.log(`🏙️ ${prefectureName}${municipalityName}内での検索を開始: ${category}${cuisine ? ` (${cuisine})` : ''}`);
            
            const { buildAreaBasedQuery, queryOverpassAPI, isValidElement, elementToFeature } = 
                await import('../services/overpassApi');
            
            const query = buildAreaBasedQuery(category, prefectureName, municipalityName, cuisine);
            console.log('市区町村ベース検索クエリ:', query);
            
            const data = await queryOverpassAPI(query);
            
            if (!data || !data.elements) {
                throw new Error('Invalid API response');
            }

            const validElements = data.elements.filter(isValidElement);
            const features = validElements.map(elementToFeature);

            console.log(`✅ ${municipalityName}内で${features.length}件の${categoryConfig[category].name}を発見`);

            setSearchState(prev => ({
                ...prev,
                isLoading: false,
                results: features,
                searchDataLoaded: true
            }));

            // マップに結果を表示
            if (map.getSource('search-pins')) {
                map.getSource('search-pins').setData({
                    type: 'FeatureCollection',
                    features
                });
            }

        } catch (error) {
            console.error('市区町村ベース検索エラー:', error);
            setSearchState(prev => ({
                ...prev,
                isLoading: false,
                error: error.message || 'Search failed'
            }));
        }
    }, []);

    const clearSearchData = useCallback((map) => {
        console.log('検索データをクリアします');
        
        if (map && map.getSource('search-pins')) {
            map.getSource('search-pins').setData({
                type: 'FeatureCollection',
                features: []
            });
        }
        
        setSearchState(prev => ({
            ...prev,
            results: [],
            searchDataLoaded: false,
            currentCategory: '',
            currentCuisine: ''
        }));
        
        lastSearchCenter.current = null;
    }, []);

    /**
     * 検索範囲を更新
     */
    const updateSearchArea = useCallback((map) => {
        if (!map) return;

        const currentZoom = map.getZoom();
        const center = map.getCenter();
        
        if (currentZoom >= 8 && searchState.currentCategory) {
            const range = getSearchRange(currentZoom);
            const searchAreaFeature = createSearchAreaFeature(center, range);
            
            if (map.getSource('search-area')) {
                map.getSource('search-area').setData({
                    type: 'FeatureCollection',
                    features: [searchAreaFeature]
                });
            }
            
            // 検索範囲が変わったら検索を実行（デバウンス付き）
            debounceSearch(map, center, currentZoom);
        } else {
            // ズームレベルが範囲外なら検索範囲をクリア
            if (map.getSource('search-area')) {
                map.getSource('search-area').setData({
                    type: 'FeatureCollection',
                    features: []
                });
            }
            lastSearchCenter.current = null;
        }
        
        // ズームアウト時に検索データをクリア
        if (currentZoom <= 10 && searchState.searchDataLoaded) {
            clearSearchData(map);
        }
    }, [searchState.currentCategory, searchState.searchDataLoaded, clearSearchData]);

    /**
     * デバウンス機能付きの検索実行
     */
    const debounceSearch = useCallback((map, center, currentZoom) => {
        const currentCenter = `${center.lat.toFixed(6)},${center.lng.toFixed(6)}`;
        if (currentCenter !== lastSearchCenter.current && searchState.currentCategory) {
            lastSearchCenter.current = currentCenter;
            
            // 前のタイマーをクリア
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
            
            // 500ms後に検索実行
            searchTimeout.current = setTimeout(() => {
                if (currentZoom > 10) {
                    console.log('検索範囲変更により検索データを再取得します');
                    executeSearch(map, searchState.currentCategory, searchState.currentCuisine);
                }
            }, 500);
        }
    }, [searchState.currentCategory, searchState.currentCuisine, executeSearch]);

    return {
        searchState,
        executeSearch,
        executeAreaSearch,
        clearSearchData,
        updateSearchArea
    };
}

/**
 * Overpass APIレスポンスをGeoJSONフィーチャーに変換
 */
function processOverpassResponse(data, category) {
    if (!data.elements || data.elements.length === 0) {
        console.log('検索結果が見つかりませんでした');
        return [];
    }
    
    const config = categoryConfig[category];
    
    return data.elements
        .filter(element => isValidElement(element))
        .map(element => elementToFeature(element, config));
}

/**
 * ピンのスタイルを更新
 */
function updatePinStyle(map, category) {
    const config = categoryConfig[category];
    
    if (map.getLayer('search-pins')) {
        map.setPaintProperty('search-pins', 'circle-color', config.color);
    }
    if (map.getLayer('search-labels')) {
        map.setLayoutProperty('search-labels', 'text-field', config.icon);
    }
}