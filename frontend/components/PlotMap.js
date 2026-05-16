// Mobile: uses react-native-maps
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#2D5A27',
  accent: '#7CB87A',
  card: '#FFFFFF',
  subtext: '#5A7A58',
};

const CHICAGO = { latitude: 41.83, longitude: -87.73, latitudeDelta: 0.3, longitudeDelta: 0.3 };

export default function PlotMap({ plots }) {
  const [selected, setSelected] = useState(null);

  const getCoords = (plot) => {
    if (!plot.geometry) return null;
    try {
      const geo = typeof plot.geometry === 'string' ? JSON.parse(plot.geometry) : plot.geometry;
      const [lng, lat] = geo.coordinates;
      return { latitude: lat, longitude: lng };
    } catch { return null; }
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView style={{ flex: 1 }} initialRegion={CHICAGO}>
        {plots.map((plot) => {
          const coords = getCoords(plot);
          if (!coords) return null;
          return (
            <Marker key={plot.id} coordinate={coords} pinColor={COLORS.primary}
              onPress={() => setSelected(plot)} />
          );
        })}
      </MapView>

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.title}>Vacant Land</Text>
            <Text style={styles.address}>{selected?.address}</Text>
            <View style={styles.row}>
              <Ionicons name="person-outline" size={15} color={COLORS.subtext} />
              <Text style={styles.meta}>{selected?.owner_name}</Text>
            </View>
            <View style={styles.approvalBox}>
              <Text style={styles.approvalText}>
                To start a garden here, submit a request to the{' '}
                <Text style={{ fontWeight: '700' }}>City of Chicago Dept of Planning & Development</Text>
              </Text>
            </View>
            <TouchableOpacity style={styles.btn} onPress={() => setSelected(null)}>
              <Ionicons name="leaf" size={16} color="#fff" />
              <Text style={styles.btnText}>Propose Garden Here</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: -4 },
  },
  handle: { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '800', color: '#1C2B1A', marginBottom: 4 },
  address: { fontSize: 14, color: COLORS.subtext, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  meta: { fontSize: 14, color: COLORS.subtext },
  approvalBox: { backgroundColor: '#FFF8EC', borderRadius: 10, padding: 12, marginTop: 8, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#F4A835' },
  approvalText: { fontSize: 13, color: '#7A5C1E', lineHeight: 19 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
