
// Main application initialization
const App = {
    map: null,
    protocol: null,
    pmtiles: null,
    
    // Initialize the application
    async init() {
        try {
            await this.setupPMTiles();
            await this.createMap();
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to initialize application:', error);
        }
    },
    
    // Setup PMTiles protocol and data source
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
    
    // Load PMTiles metadata
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
    
    // Create and configure the map
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
    
    // Setup all event listeners
    setupEventListeners() {
        EventHandlers.setupEventListeners(this.map);
        EventHandlers.setupLoadHandlers(this.map);
    },
    
    // Get map instance (for external access)
    getMap() {
        return this.map;
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});