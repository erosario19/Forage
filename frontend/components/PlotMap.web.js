import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';

const CITY_PLANNING_URL =
  'https://www.chicago.gov/city/en/depts/dcd/provdrs/small_biz/svcs/apply-for-a-city-owned-land-for-community-gardens.html';
const PROPOSE_EMAIL = 'DPD.CommunityGardens@cityofchicago.org';

const saplingIcon = (lat, lng) => L.divIcon({
  html: '<span style="font-size:22px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4))">🌱</span>',
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -14],
});

function getCoords(plot) {
  if (!plot.geometry) return null;
  try {
    const geo = typeof plot.geometry === 'string' ? JSON.parse(plot.geometry) : plot.geometry;
    const [lng, lat] = geo.coordinates;
    return [lat, lng];
  } catch { return null; }
}

// Flies to first result when filtered list becomes small enough
function ZoomEffect({ plots }) {
  const map = useMap();
  useEffect(() => {
    if (plots.length > 0 && plots.length <= 30) {
      const coords = getCoords(plots[0]);
      if (coords) map.flyTo(coords, 15, { animate: true, duration: 1 });
    } else if (plots.length > 30) {
      map.flyTo([41.83, -87.73], 11, { animate: true, duration: 0.8 });
    }
  }, [plots.length]);
  return null;
}

export default function PlotMap({ plots, onSelectPlot }) {
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
      <ZoomEffect plots={plots} />
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
                    onClick={() => window.open(CITY_PLANNING_URL, '_blank')}
                  >
                    🌐 Propose on City Website
                  </button>
                  <button
                    style={{ width: '100%', padding: '8px', background: '#52945A', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
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
