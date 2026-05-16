import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, Modal, ScrollView,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const COLORS = {
  primary: '#2D5A27',
  accent: '#7CB87A',
  background: '#F5F0E8',
  text: '#1C2B1A',
  subtext: '#5A7A58',
  card: '#FFFFFF',
};

const CHICAGO = { latitude: 41.83, longitude: -87.73, latitudeDelta: 0.3, longitudeDelta: 0.3 };

export default function FindSpaceScreen() {
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const fetchPlots = async () => {
      const { data, error } = await supabase
        .from('candidate_plots')
        .select('id, address, owner_name, source, geometry')
        .limit(500);
      if (!error) setPlots(data);
      setLoading(false);
    };
    fetchPlots();
  }, []);

  const getCoords = (plot) => {
    if (!plot.geometry) return null;
    // geometry comes back as GeoJSON from PostGIS
    try {
      const geo = typeof plot.geometry === 'string'
        ? JSON.parse(plot.geometry)
        : plot.geometry;
      const [lng, lat] = geo.coordinates;
      return { latitude: lat, longitude: lng };
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading vacant spaces...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={CHICAGO}>
        {plots.map((plot) => {
          const coords = getCoords(plot);
          if (!coords) return null;
          return (
            <Marker
              key={plot.id}
              coordinate={coords}
              pinColor={COLORS.primary}
              onPress={() => setSelected(plot)}
            />
          );
        })}
      </MapView>

      <View style={styles.badge}>
        <Ionicons name="location" size={14} color="#fff" />
        <Text style={styles.badgeText}>{plots.length} vacant spaces</Text>
      </View>

      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelected(null)}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Vacant Land</Text>
            <Text style={styles.sheetAddress}>{selected?.address}</Text>
            <View style={styles.sheetRow}>
              <Ionicons name="person-outline" size={15} color={COLORS.subtext} />
              <Text style={styles.sheetMeta}>{selected?.owner_name}</Text>
            </View>
            <View style={styles.sheetRow}>
              <Ionicons name="document-text-outline" size={15} color={COLORS.subtext} />
              <Text style={styles.sheetMeta}>{selected?.source}</Text>
            </View>
            <View style={styles.approvalBox}>
              <Text style={styles.approvalText}>
                To start a garden here, submit a request to the{' '}
                <Text style={{ fontWeight: '700' }}>
                  City of Chicago Dept of Planning & Development
                </Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.proposeBtn}
              onPress={() => setSelected(null)}
            >
              <Ionicons name="leaf" size={16} color="#fff" />
              <Text style={styles.proposeBtnText}>Propose Garden Here</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 12, color: COLORS.subtext, fontSize: 14 },
  badge: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  badgeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: '#DDD',
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  sheetAddress: { fontSize: 14, color: COLORS.subtext, marginBottom: 14 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sheetMeta: { fontSize: 14, color: COLORS.subtext },
  approvalBox: {
    backgroundColor: '#FFF8EC',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#F4A835',
  },
  approvalText: { fontSize: 13, color: '#7A5C1E', lineHeight: 19 },
  proposeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  proposeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
