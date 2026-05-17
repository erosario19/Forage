import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, RefreshControl, TextInput, Modal,
  Linking, Platform, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

const COLORS = {
  primary: '#2D5A27',
  accent: '#7CB87A',
  background: '#F5F0E8',
  text: '#1C2B1A',
  subtext: '#5A7A58',
  card: '#FFFFFF',
};

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ExistingGardensScreen() {
  const { width } = useWindowDimensions();
  const isWide = width > 700;
  const numCols = isWide ? 2 : 1;

  const [gardens, setGardens]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [search, setSearch]         = useState('');
  const [selected, setSelected]     = useState(null);
  const [joinModal, setJoinModal]   = useState(false);
  const [joinName, setJoinName]     = useState('');
  const [joinEmail, setJoinEmail]   = useState('');
  const [joining, setJoining]       = useState(false);
  const [joinedIds, setJoinedIds]   = useState(new Set());

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    })();
  }, []);

  const fetchGardens = async () => {
    const { data, error } = await supabase
      .from('gardens')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setGardens(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchGardens(); }, []);

  const sorted = useMemo(() => {
    let list = gardens;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(g =>
        g.name?.toLowerCase().includes(q) ||
        g.address?.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q)
      );
    }
    if (!userCoords) return list;
    return [...list].sort((a, b) => {
      const da = (a.lat && a.lng) ? haversine(userCoords.lat, userCoords.lng, a.lat, a.lng) : 9999;
      const db = (b.lat && b.lng) ? haversine(userCoords.lat, userCoords.lng, b.lat, b.lng) : 9999;
      return da - db;
    });
  }, [gardens, search, userCoords]);

  const openMap = (garden) => {
    if (!garden.lat || !garden.lng) return;
    const url = Platform.OS === 'web'
      ? `https://maps.google.com/?q=${garden.lat},${garden.lng}`
      : `https://maps.apple.com/?ll=${garden.lat},${garden.lng}&q=${encodeURIComponent(garden.name)}`;
    Linking.openURL(url);
  };

  const handleJoin = async () => {
    if (!joinName.trim()) return;
    setJoining(true);
    await supabase.from('volunteers').insert({
      garden_id: selected.id,
      volunteer_name: joinName.trim(),
      volunteer_email: joinEmail.trim() || null,
    });
    setJoining(false);
    setJoinedIds(prev => new Set([...prev, selected.id]));
    setJoinModal(false);
    setJoinName('');
    setJoinEmail('');
  };

  const distLabel = (garden) => {
    if (!userCoords || !garden.lat || !garden.lng) return null;
    const d = haversine(userCoords.lat, userCoords.lng, garden.lat, garden.lng);
    return d < 1 ? `${(d * 1000).toFixed(0)}m away` : `${d.toFixed(1)}km away`;
  };

  const renderGarden = ({ item }) => {
    const dist = distLabel(item);
    const hasLocation = item.lat && item.lng;
    const joined = joinedIds.has(item.id);

    return (
      <TouchableOpacity
        style={[styles.card, isWide && styles.cardWide]}
        onPress={() => setSelected(item)}
        activeOpacity={0.85}
      >
        {/* Colored header strip */}
        <View style={styles.cardStrip}>
          <View style={styles.iconCircle}>
            <Ionicons name="leaf" size={20} color={COLORS.primary} />
          </View>
          {dist && (
            <View style={styles.distBadge}>
              <Ionicons name="navigate" size={11} color={COLORS.primary} />
              <Text style={styles.distText}>{dist}</Text>
            </View>
          )}
          {!hasLocation && (
            <View style={[styles.distBadge, { backgroundColor: '#FFF0E0' }]}>
              <Ionicons name="location-outline" size={11} color="#CC7700" />
              <Text style={[styles.distText, { color: '#CC7700' }]}>Location unknown</Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.gardenName} numberOfLines={2}>{item.name}</Text>
          {item.address ? (
            <Text style={styles.gardenAddress} numberOfLines={1}>{item.address}</Text>
          ) : null}
          {item.description ? (
            <Text style={styles.gardenDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}

          <View style={styles.cardActions}>
            {hasLocation && (
              <TouchableOpacity style={styles.mapBtn} onPress={() => openMap(item)}>
                <Ionicons name="map-outline" size={14} color={COLORS.primary} />
                <Text style={styles.mapBtnText}>View Map</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.joinBtn, joined && styles.joinBtnDone]}
              onPress={() => { setSelected(item); setJoinModal(true); }}
              disabled={joined}
            >
              <Ionicons name={joined ? 'checkmark-circle' : 'people'} size={14} color="#fff" />
              <Text style={styles.joinBtnText}>{joined ? 'Joined!' : 'Join Community'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Search bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={COLORS.subtext} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search gardens..."
            placeholderTextColor={COLORS.subtext}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.subtext} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <Ionicons name="leaf" size={14} color={COLORS.accent} />
        <Text style={styles.statsText}>
          {sorted.length} garden{sorted.length !== 1 ? 's' : ''}
          {userCoords ? ' · sorted by distance' : ''}
        </Text>
      </View>

      <FlatList
        data={sorted}
        key={numCols}
        keyExtractor={i => i.id}
        numColumns={numCols}
        columnWrapperStyle={numCols > 1 ? { gap: 12, paddingHorizontal: 12 } : null}
        renderItem={renderGarden}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchGardens(); }} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>No gardens found</Text></View>}
      />

      {/* Garden detail modal */}
      <Modal visible={!!selected && !joinModal} transparent animationType="slide"
        onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{selected?.name}</Text>
            {selected?.address ? <Text style={styles.sheetSub}>{selected.address}</Text> : null}
            {selected?.description ? <Text style={styles.sheetDesc}>{selected.description}</Text> : null}

            {selected?.lat && selected?.lng ? (
              <View style={styles.coordRow}>
                <Ionicons name="location" size={14} color={COLORS.subtext} />
                <Text style={styles.coordText}>
                  {Number(selected.lat).toFixed(5)}, {Number(selected.lng).toFixed(5)}
                </Text>
              </View>
            ) : (
              <View style={[styles.coordRow, { backgroundColor: '#FFF0E0', borderRadius: 8, padding: 8 }]}>
                <Ionicons name="location-outline" size={14} color="#CC7700" />
                <Text style={[styles.coordText, { color: '#CC7700' }]}>Location not available</Text>
              </View>
            )}

            <View style={styles.sheetActions}>
              {selected?.lat && selected?.lng && (
                <TouchableOpacity style={styles.mapBtn} onPress={() => openMap(selected)}>
                  <Ionicons name="map" size={15} color={COLORS.primary} />
                  <Text style={styles.mapBtnText}>Open in Maps</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.joinBtn, joinedIds.has(selected?.id) && styles.joinBtnDone, { flex: 1 }]}
                onPress={() => setJoinModal(true)}
                disabled={joinedIds.has(selected?.id)}
              >
                <Ionicons name={joinedIds.has(selected?.id) ? 'checkmark-circle' : 'people'} size={15} color="#fff" />
                <Text style={styles.joinBtnText}>{joinedIds.has(selected?.id) ? 'Joined!' : 'Join Community'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Join modal */}
      <Modal visible={joinModal} transparent animationType="slide"
        onRequestClose={() => setJoinModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setJoinModal(false)}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Join {selected?.name}</Text>
            <Text style={styles.sheetSub}>We'll connect you with the garden team</Text>

            <Text style={styles.formLabel}>Your name *</Text>
            <TextInput style={styles.formInput} placeholder="Jane Smith"
              placeholderTextColor={COLORS.subtext} value={joinName} onChangeText={setJoinName} />

            <Text style={styles.formLabel}>Email (optional)</Text>
            <TextInput style={styles.formInput} placeholder="jane@email.com"
              placeholderTextColor={COLORS.subtext} value={joinEmail} onChangeText={setJoinEmail}
              keyboardType="email-address" autoCapitalize="none" />

            <TouchableOpacity
              style={[styles.joinBtn, { marginTop: 16, paddingVertical: 14 }, joining && { opacity: 0.6 }]}
              onPress={handleJoin} disabled={joining}
            >
              <Ionicons name="people" size={16} color="#fff" />
              <Text style={styles.joinBtnText}>{joining ? 'Joining...' : 'Join Community Garden'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText:    { color: COLORS.subtext, fontSize: 15 },
  searchWrap:   { alignItems: 'center', paddingVertical: 10, backgroundColor: COLORS.primary },
  searchBar:    {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', width: '80%', maxWidth: 480,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 30,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  searchInput:  { flex: 1, fontSize: 14, color: COLORS.text },
  statsBar:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.primary },
  statsText:    { color: '#fff', fontSize: 12, fontWeight: '600' },
  list:         { padding: 12, gap: 12, paddingBottom: 32 },
  card:         { backgroundColor: COLORS.card, borderRadius: 16, overflow: 'hidden', flex: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardWide:     { maxWidth: '49%' },
  cardStrip:    { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#EFF7EE' },
  iconCircle:   { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  distBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D8F0D8', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  distText:     { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  cardBody:     { padding: 14 },
  gardenName:   { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 3 },
  gardenAddress:{ fontSize: 12, color: COLORS.subtext, marginBottom: 4 },
  gardenDesc:   { fontSize: 12, color: COLORS.subtext, lineHeight: 17, marginBottom: 10 },
  cardActions:  { flexDirection: 'row', gap: 8, marginTop: 8 },
  mapBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EFF7EE', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  mapBtnText:   { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  joinBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: COLORS.primary, paddingVertical: 8, borderRadius: 10 },
  joinBtnDone:  { backgroundColor: COLORS.accent },
  joinBtnText:  { color: '#fff', fontSize: 12, fontWeight: '700' },
  overlay:      { flex: 1, justifyContent: 'flex-end' },
  sheet:        { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 10 },
  handle:       { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:   { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  sheetSub:     { fontSize: 13, color: COLORS.subtext, marginBottom: 8 },
  sheetDesc:    { fontSize: 13, color: COLORS.subtext, lineHeight: 19, marginBottom: 12 },
  coordRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  coordText:    { fontSize: 12, color: COLORS.subtext },
  sheetActions: { flexDirection: 'row', gap: 10 },
  formLabel:    { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6, marginTop: 10 },
  formInput:    { backgroundColor: COLORS.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text },
});
