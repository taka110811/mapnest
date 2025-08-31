
/**
 * メインアプリケーションの初期化
 * アプリケーションのライフサイクルとPMTilesマップの初期化を管理
 * @namespace App
 */
const App = {
    /** @type {maplibregl.Map|null} MapLibre GLマップインスタンス */
    map: null,
    /** @type {pmtiles.Protocol|null} PMTilesプロトコルインスタンス */
    protocol: null,
    /** @type {pmtiles.PMTiles|null} PMTilesデータソースインスタンス */
    pmtiles: null,
    
    /**
     * アプリケーションを初期化
     * @returns {Promise<void>}
     */
    async init() {
        try {
            await this.setupPMTiles();
            await this.createMap();
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to initialize application:', error);
        }
    },
    
    /**
     * PMTilesプロトコルとデータソースを設定
     * @returns {Promise<void>}
     */
    async setupPMTiles() {
        // Add PMTiles protocol
        this.protocol = new pmtiles.Protocol();
        maplibregl.addProtocol('pmtiles', this.protocol.tile);
        
        // Initialize PMTiles source
        this.pmtiles = new pmtiles.PMTiles(MapConfig.PMTILES_URL);
        this.protocol.add(this.pmtiles);
        
        // Load and log metadata
        await this.loadPMTilesMetadata();
    },
    
    /**
     * PMTilesメタデータを読み込み
     * @returns {Promise<void>}
     */
    async loadPMTilesMetadata() {
        try {
            const header = await this.pmtiles.getHeader();
            console.log('PMTiles header:', header);
            
            const metadata = await this.pmtiles.getMetadata();
            console.log('PMTiles metadata:', metadata);
            
            if (metadata && metadata.vector_layers) {
                console.log('Available vector layers:', metadata.vector_layers);
                metadata.vector_layers.forEach(layer => {
                    console.log(`Layer: ${layer.id}, Fields:`, layer.fields);
                });
            }
        } catch (err) {
            console.error('Metadata error:', err);
        }
    },
    
    /**
     * マップを作成して設定
     * @returns {Promise<maplibregl.Map>} 初期化されたマップインスタンス
     */
    async createMap() {
        const mapStyle = MapConfig.getMapStyle(MapConfig.PMTILES_URL);
        
        this.map = new maplibregl.Map({
            ...MapConfig.mapOptions,
            style: mapStyle
        });
        
        // Wait for map to load
        return new Promise((resolve, reject) => {
            this.map.on('load', () => {
                resolve(this.map);
            });
            
            this.map.on('error', (e) => {
                reject(e);
            });
        });
    },
    
    /**
     * すべてのイベントリスナーを設定
     */
    setupEventListeners() {
        EventHandlers.setupEventListeners(this.map);
        EventHandlers.setupLoadHandlers(this.map);
        SearchUI.init(this.map);
    }
};

/**
 * DOMの読み込みが完了したらアプリケーションを初期化
 */
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});