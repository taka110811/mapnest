'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import InfoPanel from '../components/UI/InfoPanel';

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

export default function Home() {
  const [zoom, setZoom] = useState(5);
  const [map, setMap] = useState(null);
  const [searchCount, setSearchCount] = useState(0);

  return (
    <main style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <title>Japan Administrative Hierarchy Map</title>
      <MapContainer 
        onZoomChange={setZoom}
        onMapLoad={setMap}
      />
      <InfoPanel 
        zoom={zoom} 
        searchCount={searchCount}
      />
      {map && (
        <SearchPanel 
          map={map}
          onSearchComplete={setSearchCount}
        />
      )}
    </main>
  );
}
