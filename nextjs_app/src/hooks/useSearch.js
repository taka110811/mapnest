/**
 * 検索機能カスタムフック
 */
import { useState, useCallback, useRef, useMemo } from 'react';
import { 
    categoryConfig
} from '../services/overpassApi';

export default function useSearch(updateSearchPins) {
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

            // マップに結果を表示（宣言的、カテゴリー情報も含む）
            if (updateSearchPins) {
                updateSearchPins(features, category);
            }

        } catch (error) {
            console.error('市区町村ベース検索エラー:', error);
            setSearchState(prev => ({
                ...prev,
                isLoading: false,
                error: error.message || 'Search failed'
            }));
        }
    }, [updateSearchPins]);

    const clearSearchData = useCallback((map) => {
        console.log('検索データをクリアします');
        
        // 宣言的にデータをクリア
        if (updateSearchPins) {
            updateSearchPins([], '');
        }
        
        setSearchState(prev => ({
            ...prev,
            results: [],
            searchDataLoaded: false,
            currentCategory: '',
            currentCuisine: ''
        }));
        
        lastSearchCenter.current = null;
    }, [updateSearchPins]);



    return useMemo(() => ({
        searchState,
        executeAreaSearch,
        clearSearchData
    }), [searchState, executeAreaSearch, clearSearchData]);
}

