// Web: uses react-leaflet
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';

const COLORS = { primary: '#2D5A27', accent: '#7CB87A' };

export default function PlotMap({ plots }) {
  const [leafletReady, setLeafletReady] = useState(false);

  useEffect(() => {
    // Inject Leaflet CSS dynamically
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    setLeafletReady(true);
  }, []);

  if (!leafletReady) return null;

  const getCoords = (plot) => {
    if (!plot.geometry) return null;
    try {
      const geo = typeof plot.geometry === 'string' ? JSON.parse(plot.geometry) : plot.geometry;
      const [lng, lat] = geo.coordinates;
      return [lat, lng];
    } catch { return null; }
  };

  return (
    <MapContainer
      center={[41.83, -87.73]}
      zoom={11}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
      />
      {plots.map((plot) => {
        const coords = getCoords(plot);
        if (!coords) return null;
        return (
          <CircleMarker
            key={plot.id}
            center={coords}
            radius={6}
            pathOptions={{ fillColor: COLORS.primary, color: '#fff', weight: 1.5, fillOpacity: 0.9 }}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <strong style={{ color: COLORS.primary }}>Vacant Land</strong><br />
                <span style={{ fontSize: 12, color: '#666' }}>{plot.address}</span><br /><br />
                <span style={{ fontSize: 12 }}><b>Owner:</b> {plot.owner_name}</span><br />
                <div style={{ marginTop: 8, padding: 8, background: '#FFF8EC', borderRadius: 6, fontSize: 12, borderLeft: '3px solid #F4A835' }}>
                  Submit a request to the <b>City of Chicago Dept of Planning & Development</b> to start a garden here.
                </div>
                <button
                  style={{ marginTop: 8, width: '100%', padding: '8px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}
                  onClick={() => alert('Propose garden feature coming soon!')}
                >
                  Propose Garden Here
                </button>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
