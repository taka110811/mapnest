/**
 * 検索UIの管理
 * 検索パネルのインタラクションとGenericSearchとの連携
 * @namespace SearchUI
 */
const SearchUI = {
    /**
     * 検索UIを初期化
     * @param {maplibregl.Map} map - MapLibre GLマップインスタンス
     */
    init(map) {
        this.setupEventListeners(map);
        console.log('SearchUI initialized');
    },
    
    /**
     * 検索UIのイベントリスナーを設定
     * @param {maplibregl.Map} map - MapLibre GLマップインスタンス
     */
    setupEventListeners(map) {
        const categorySelect = document.getElementById('category-select');
        const cuisineSelect = document.getElementById('cuisine-select');
        const searchButton = document.getElementById('search-button');
        
        // カテゴリー選択時
        categorySelect.addEventListener('change', (e) => {
            const category = e.target.value;
            
            if (category === 'restaurant' || category === 'cafe') {
                // レストラン/カフェの場合は料理ジャンル選択を表示
                cuisineSelect.style.display = 'block';
            } else {
                // その他の場合は料理ジャンル選択を非表示
                cuisineSelect.style.display = 'none';
                cuisineSelect.value = '';
            }
            
            // 検索ボタンの有効/無効切り替え
            searchButton.disabled = !category;
            
            // 既存の検索結果をクリア
            if (category !== GenericSearch.currentCategory) {
                this.clearSearchResults(map);
            }
            
        });
        
        // 料理ジャンル選択時
        cuisineSelect.addEventListener('change', () => {
            // 既存の検索結果をクリア（ジャンルが変わった場合）
            this.clearSearchResults(map);
        });
        
        // 検索ボタンクリック時
        searchButton.addEventListener('click', () => {
            const category = categorySelect.value;
            const cuisine = cuisineSelect.value;
            
            if (category) {
                const currentZoom = map.getZoom();
                if (currentZoom <= 10) {
                    alert('検索を実行するには、ズームレベル11以上まで拡大してください。');
                    return;
                }
                
                // 検索結果をクリアしてから新しい検索を実行
                this.clearSearchResults(map);
                GenericSearch.loadSearchResults(map, category, cuisine);
            }
        });
    },
    
    /**
     * 検索結果をクリア
     * @param {maplibregl.Map} map - MapLibre GLマップインスタンス
     */
    clearSearchResults(map) {
        // データをクリア
        map.getSource('search-pins').setData({
            type: 'FeatureCollection',
            features: []
        });
        
        // 検索状態をリセット
        GenericSearch.searchDataLoaded = false;
        GenericSearch.lastSearchCenter = null;
        GenericSearch.currentCategory = '';
        GenericSearch.currentCuisine = '';
        
        // UIをクリア
        const resultsDiv = document.getElementById('search-results');
        resultsDiv.textContent = '';
    },
    
    /**
     * 検索パネルの表示/非表示を切り替え
     */
    toggleSearchPanel() {
        const panel = document.querySelector('.search-panel');
        if (panel.style.display === 'none') {
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
        }
    }
};