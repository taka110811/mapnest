'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// MapLibreGL は SSR に対応していないため動的インポート
const MapContainer = dynamic(
  () => import('../components/Map/MapContainer'),
  { 
    ssr: false,
    loading: () => (
      <div style={{ 
        width: '100%', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f0f0f0'
      }}>
        <div>マップを読み込み中...</div>
      </div>
    )
  }
);

const SearchPanel = dynamic(
  () => import('../components/Search/SearchPanel'),
  { ssr: false }
);

const ControlPanel = dynamic(
  () => import('../components/UI/ControlPanel'),
  { ssr: false }
);


export default function Home() {
  const [zoom, setZoom] = useState(5);
  const [map, setMap] = useState(null);
  const [searchCount, setSearchCount] = useState(0);
  const [searchHook, setSearchHook] = useState(null);
  const [municipalitySelectionHandler, setMunicipalitySelectionHandler] = useState(null);
  const [updateFavoritesPins, setUpdateFavoritesPins] = useState(null);
  const [toggleLayer, setToggleLayer] = useState(null);
  const [layerVisibility, setLayerVisibility] = useState(null);

  const handleMunicipalitySelectionHandlerReady = (handler) => {
    setMunicipalitySelectionHandler(() => handler);
  };

  const handleUpdateFavoritesPinsReady = (updateFunc) => {
    setUpdateFavoritesPins(() => updateFunc);
  };

  const handleToggleLayerReady = (toggleFunc) => {
    setToggleLayer(() => toggleFunc);
  };

  const handleLayerVisibilityReady = (visibility) => {
    setLayerVisibility(visibility);
  };

  return (
    <main style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <title>Japan Administrative Hierarchy Map</title>
      <MapContainer 
        onZoomChange={setZoom}
        onMapLoad={setMap}
        onSearchHookReady={setSearchHook}
        municipalitySelectionHandler={municipalitySelectionHandler}
        onUpdateFavoritesPinsReady={handleUpdateFavoritesPinsReady}
        onToggleLayerReady={handleToggleLayerReady}
        onLayerVisibilityReady={handleLayerVisibilityReady}
      />
      {map && (
        <ControlPanel 
          map={map}
          zoom={zoom} 
          searchCount={searchCount}
          toggleLayer={toggleLayer}
          layerVisibility={layerVisibility}
        />
      )}
      {map && (
        <SearchPanel 
          map={map}
          onSearchComplete={setSearchCount}
          searchHook={searchHook}
          onMunicipalitySelectionHandlerReady={handleMunicipalitySelectionHandlerReady}
          updateFavoritesPins={updateFavoritesPins}
        />
      )}
    </main>
  );
}
