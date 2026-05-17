import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TextInput, TouchableOpacity, Modal, Linking, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import PlotMap from '../components/PlotMap';

const CITY_URL = 'https://www.chicagoparkdistrict.com/facilities/community-gardens';
const PROPOSE_EMAIL = 'communitygardens@chicagoparkdistrict.com';

const COLORS = {
  primary: '#2D5A27',
  accent: '#7CB87A',
  background: '#F5F0E8',
  subtext: '#5A7A58',
  card: '#FFFFFF',
};

export default function FindSpaceScreen() {
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [focusCoords, setFocusCoords] = useState(null);
  const [geocoding, setGeocoding] = useState(false);

  const geocodeAddress = async (query) => {
    if (!query.trim()) return;
    setGeocoding(true);
    try {
      const q = encodeURIComponent(query + ', Chicago, IL');
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=us`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'ForageApp/1.0' } }
      );
      const data = await res.json();
      if (data.length > 0) {
        setFocusCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
      }
    } catch {}
    setGeocoding(false);
  };

  useEffect(() => {
    supabase
      .from('candidate_plots')
      .select('id, address, owner_name, source, geometry')
      .limit(1000)
      .then(({ data, error }) => {
        if (!error) setPlots(data);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return plots;
    const q = search.toLowerCase();
    return plots.filter(p =>
      p.address?.toLowerCase().includes(q) ||
      p.owner_name?.toLowerCase().includes(q)
    );
  }, [plots, search]);

  const openWebsite = () => Linking.openURL(CITY_URL);

  const openEmail = () => {
    const subject = encodeURIComponent(`Garden Proposal - ${selected?.address}`);
    const body = encodeURIComponent(`I would like to propose a community garden at ${selected?.address}.`);
    Linking.openURL(`mailto:${PROPOSE_EMAIL}?subject=${subject}&body=${body}`);
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
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color={COLORS.subtext} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search address or ward..."
            placeholderTextColor={COLORS.subtext}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => geocodeAddress(search)}
            returnKeyType="search"
            clearButtonMode="never"
          />
          {geocoding
            ? <ActivityIndicator size="small" color={COLORS.subtext} />
            : search.length > 0
              ? <TouchableOpacity onPress={() => { setSearch(''); setFocusCoords(null); }}>
                  <Ionicons name="close-circle" size={17} color={COLORS.subtext} />
                </TouchableOpacity>
              : <TouchableOpacity onPress={() => geocodeAddress(search)}>
                  <Ionicons name="arrow-forward-circle" size={17} color={COLORS.subtext} />
                </TouchableOpacity>
          }
        </View>
      </View>

      <PlotMap plots={plots} onSelectPlot={setSelected} focusCoords={focusCoords} />

      <View style={styles.badge}>
        <Ionicons name="location" size={14} color="#fff" />
        <Text style={styles.badgeText}>{plots.length} vacant spaces</Text>
      </View>

      {/* Plot detail bottom sheet */}
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Vacant Land</Text>
            <Text style={styles.sheetAddress}>{selected?.address}</Text>
            <View style={styles.sheetRow}>
              <Ionicons name="business-outline" size={15} color={COLORS.subtext} />
              <Text style={styles.sheetMeta}><Text style={{ fontWeight: '700' }}>Owner: </Text>{selected?.owner_name}</Text>
            </View>
            <View style={styles.approvalBox}>
              <Text style={styles.approvalText}>
                Starting a garden here requires approval from the{' '}
                <Text style={{ fontWeight: '700' }}>City of Chicago Dept of Planning & Development</Text>
              </Text>
            </View>

            <TouchableOpacity style={styles.initiativeBtn} onPress={openWebsite}>
              <Ionicons name="globe-outline" size={16} color="#fff" />
              <Text style={styles.initiativeBtnText}>Propose on City Website</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.initiativeBtn, styles.emailBtn]} onPress={openEmail}>
              <Ionicons name="mail-outline" size={16} color="#fff" />
              <Text style={styles.initiativeBtnText}>Email City Planners</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 12, color: COLORS.subtext, fontSize: 14 },
  searchWrap: {
    alignItems: 'center',
    paddingVertical: 10,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    width: '70%',
    maxWidth: 400,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1C2B1A' },
  badge: {
    position: 'absolute',
    bottom: 24,
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
  overlay: { flex: 1, justifyContent: 'flex-end' },
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
  handle: { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#1C2B1A', marginBottom: 4 },
  sheetAddress: { fontSize: 14, color: COLORS.subtext, marginBottom: 14 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sheetMeta: { fontSize: 14, color: COLORS.subtext },
  approvalBox: { backgroundColor: '#FFF8EC', borderRadius: 10, padding: 12, marginTop: 8, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#F4A835' },
  approvalText: { fontSize: 13, color: '#7A5C1E', lineHeight: 19 },
  initiativeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, marginBottom: 10 },
  emailBtn: { backgroundColor: '#52945A' },
  initiativeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
