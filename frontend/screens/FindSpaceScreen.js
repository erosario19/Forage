import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TextInput, TouchableOpacity, Modal, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import PlotMap from '../components/PlotMap';

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
  const [initiativeModal, setInitiativeModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase
      .from('candidate_plots')
      .select('id, address, owner_name, source, geometry')
      .limit(500)
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

  const handleStartInitiative = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Missing info', 'Please enter your name and email.');
      return;
    }
    setSubmitting(true);
    // Create a garden record from this candidate plot
    const { error } = await supabase.from('gardens').insert({
      name: `Initiative at ${selected?.address}`,
      address: selected?.address,
      lat: selected?._lat,
      lng: selected?._lng,
      description: `Community garden initiative started at this location. Contact: ${name} (${email})`,
      plot_id: selected?.id,
    });
    setSubmitting(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setInitiativeModal(false);
    setSelected(null);
    Alert.alert('Initiative started! 🌱', 'Your initiative has been recorded. Share the app with neighbors to recruit volunteers.');
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
      {/* Aesthetic centered search bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color={COLORS.subtext} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search address or ward..."
            placeholderTextColor={COLORS.subtext}
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color={COLORS.subtext} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <PlotMap plots={filtered} onSelectPlot={setSelected} />

      <View style={styles.badge}>
        <Ionicons name="location" size={14} color="#fff" />
        <Text style={styles.badgeText}>
          {filtered.length}{filtered.length !== plots.length ? ` of ${plots.length}` : ''} vacant spaces
        </Text>
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
            <View style={styles.sheetRow}>
              <Ionicons name="document-text-outline" size={15} color={COLORS.subtext} />
              <Text style={styles.sheetMeta}>{selected?.source}</Text>
            </View>
            <View style={styles.approvalBox}>
              <Text style={styles.approvalText}>
                Starting a garden here requires approval from the{' '}
                <Text style={{ fontWeight: '700' }}>City of Chicago Dept of Planning & Development</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.initiativeBtn}
              onPress={() => setInitiativeModal(true)}
            >
              <Ionicons name="flag" size={16} color="#fff" />
              <Text style={styles.initiativeBtnText}>Start Initiative Here</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Start Initiative form */}
      <Modal
        visible={initiativeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setInitiativeModal(false)}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setInitiativeModal(false)}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Start an Initiative</Text>
            <Text style={styles.sheetAddress}>{selected?.address}</Text>
            <Text style={styles.formLabel}>Your name</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Jane Smith"
              placeholderTextColor={COLORS.subtext}
              value={name}
              onChangeText={setName}
            />
            <Text style={styles.formLabel}>Your email</Text>
            <TextInput
              style={styles.formInput}
              placeholder="jane@email.com"
              placeholderTextColor={COLORS.subtext}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.infoBox}>
              <Ionicons name="people-outline" size={16} color={COLORS.primary} />
              <Text style={styles.infoText}>
                We'll create a garden initiative at this location. Share the app to recruit neighbors as volunteers.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.initiativeBtn, submitting && { opacity: 0.6 }]}
              onPress={handleStartInitiative}
              disabled={submitting}
            >
              <Ionicons name="leaf" size={16} color="#fff" />
              <Text style={styles.initiativeBtnText}>
                {submitting ? 'Starting...' : 'Launch Initiative'}
              </Text>
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
  initiativeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12 },
  initiativeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#1C2B1A', marginBottom: 6, marginTop: 10 },
  formInput: { backgroundColor: COLORS.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1C2B1A' },
  infoBox: { flexDirection: 'row', gap: 8, backgroundColor: '#EFF7EE', borderRadius: 10, padding: 12, marginTop: 14, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 13, color: COLORS.primary, lineHeight: 18 },
});
