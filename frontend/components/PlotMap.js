import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

const CHICAGO = { latitude: 41.83, longitude: -87.73, latitudeDelta: 0.3, longitudeDelta: 0.3 };

function getCoords(plot) {
  if (!plot.geometry) return null;
  try {
    const geo = typeof plot.geometry === 'string' ? JSON.parse(plot.geometry) : plot.geometry;
    const [lng, lat] = geo.coordinates;
    return { latitude: lat, longitude: lng };
  } catch { return null; }
}

function SaplingPin() {
  return (
    <View style={styles.pin}>
      <Text style={styles.pinEmoji}>🌱</Text>
    </View>
  );
}

export default function PlotMap({ plots, onSelectPlot, focusCoords }) {
  const mapRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (focusCoords) {
      mapRef.current.animateToRegion({
        latitude: focusCoords.lat,
        longitude: focusCoords.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 800);
    } else if (plots.length > 0 && plots.length <= 30) {
      const coords = getCoords(plots[0]);
      if (coords) {
        mapRef.current.animateToRegion({
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }, 800);
      }
    } else if (plots.length > 30) {
      mapRef.current.animateToRegion({ ...CHICAGO }, 600);
    }
  }, [plots.length, focusCoords]);

  return (
    <MapView ref={mapRef} style={{ flex: 1 }} initialRegion={CHICAGO}>
      {plots.map((plot) => {
        const coords = getCoords(plot);
        if (!coords) return null;
        return (
          <Marker
            key={plot.id}
            coordinate={coords}
            onPress={() => onSelectPlot?.({ ...plot, _lat: coords.latitude, _lng: coords.longitude })}
          >
            <SaplingPin />
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1B4332',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  pinEmoji: { fontSize: 15 },
});
