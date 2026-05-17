import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';

const CITY_PLANNING_URL = 'https://www.chicagoparkdistrict.com/facilities/community-gardens';
const PROPOSE_EMAIL = 'info@cmap.illinois.gov';

const saplingIcon = () => L.divIcon({
  html: `<div style="
    background:#1B4332;border-radius:50%;width:30px;height:30px;
    display:flex;align-items:center;justify-content:center;
    font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,0.5);
    border:2px solid #fff;
  ">🌱</div>`,
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -18],
});

function getCoords(plot) {
  if (!plot.geometry) return null;
  try {
    const geo = typeof plot.geometry === 'string' ? JSON.parse(plot.geometry) : plot.geometry;
    const [lng, lat] = geo.coordinates;
    return [lat, lng];
  } catch { return null; }
}

function ZoomEffect({ plots, focusCoords }) {
  const map = useMap();
  useEffect(() => {
    if (focusCoords) {
      map.flyTo([focusCoords.lat, focusCoords.lng], 15, { animate: true, duration: 1 });
    } else if (plots.length > 0 && plots.length <= 30) {
      const coords = getCoords(plots[0]);
      if (coords) map.flyTo(coords, 15, { animate: true, duration: 1 });
    } else if (plots.length > 30) {
      map.flyTo([41.83, -87.73], 11, { animate: true, duration: 0.8 });
    }
  }, [plots.length, focusCoords]);
  return null;
}

export default function PlotMap({ plots, onSelectPlot = () => {}, focusCoords }) {
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
  }, []);

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
      <ZoomEffect plots={plots} focusCoords={focusCoords} />
      <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
        {plots.map(plot => {
          const coords = getCoords(plot);
          if (!coords) return null;
          return (
            <Marker
              key={plot.id}
              position={coords}
              icon={saplingIcon()}
            >
              <Popup maxWidth={240}>
                <div style={{ fontFamily: 'sans-serif' }}>
                  <strong style={{ color: '#2D5A27', fontSize: 15 }}>Vacant Land</strong><br />
                  <span style={{ fontSize: 12, color: '#666' }}>{plot.address}</span><br /><br />
                  <span style={{ fontSize: 12 }}><b>Owner:</b> {plot.owner_name}</span><br />
                  <div style={{ margin: '10px 0', padding: 8, background: '#FFF8EC', borderRadius: 6, fontSize: 12, borderLeft: '3px solid #F4A835' }}>
                    Submit a request to the City of Chicago to start a garden here.
                  </div>
                  <button
                    style={{ width: '100%', padding: '8px', marginBottom: 6, background: '#2D5A27', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                    onClick={() => onSelectPlot(plot)}
                  >
                    🌱 Start Initiative Here
                  </button>
                  <button
                    style={{ width: '100%', padding: '8px', marginBottom: 6, background: '#52945A', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                    onClick={() => window.open(CITY_PLANNING_URL, '_blank')}
                  >
                    🌐 Propose on City Website
                  </button>
                  <button
                    style={{ width: '100%', padding: '8px', background: '#7CB87A', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                    onClick={() => window.open(`mailto:${PROPOSE_EMAIL}?subject=Garden Proposal - ${encodeURIComponent(plot.address)}&body=I would like to propose a community garden at ${encodeURIComponent(plot.address)}.`, '_blank')}
                  >
                    ✉️ Email City Planners
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
