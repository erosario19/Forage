import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

const STATUS_COLORS = { good: '#4CAF50', fair: '#FF9800', poor: '#F44336' };

export default function ManageGardenScreen() {
  const [gardens, setGardens] = useState([]);
  const [selectedGarden, setSelectedGarden] = useState(null);
  const [plants, setPlants] = useState([]);
  const [needs, setNeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('plants');

  // form state
  const [plantName, setPlantName] = useState('');
  const [plantStatus, setPlantStatus] = useState('good');
  const [needItem, setNeedItem] = useState('');

  useEffect(() => {
    supabase.from('gardens').select('id, name').then(({ data }) => {
      if (data?.length) { setGardens(data); setSelectedGarden(data[0]); }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedGarden) return;
    supabase.from('plants').select('*').eq('garden_id', selectedGarden.id)
      .order('planted_at', { ascending: false })
      .then(({ data }) => setPlants(data || []));
    supabase.from('needs').select('*').eq('garden_id', selectedGarden.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setNeeds(data || []));
  }, [selectedGarden]);

  const addPlant = async () => {
    if (!plantName.trim()) return;
    const { data, error } = await supabase.from('plants').insert({
      garden_id: selectedGarden.id,
      name: plantName.trim(),
      status: plantStatus,
    }).select().single();
    if (!error) { setPlants([data, ...plants]); setPlantName(''); }
    else Alert.alert('Error', error.message);
  };

  const addNeed = async () => {
    if (!needItem.trim()) return;
    const { data, error } = await supabase.from('needs').insert({
      garden_id: selectedGarden.id,
      item: needItem.trim(),
    }).select().single();
    if (!error) { setNeeds([data, ...needs]); setNeedItem(''); }
    else Alert.alert('Error', error.message);
  };

  const claimNeed = async (need) => {
    await supabase.from('needs').update({ claimed_by: 'me' }).eq('id', need.id);
    setNeeds(needs.map(n => n.id === need.id ? { ...n, claimed_by: 'me' } : n));
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  if (!selectedGarden) {
    return (
      <View style={styles.center}>
        <Ionicons name="leaf-outline" size={48} color={COLORS.subtext} />
        <Text style={styles.emptyText}>No gardens found</Text>
        <Text style={styles.emptySubtext}>Add a garden to get started</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Garden picker */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}
          contentContainerStyle={styles.pickerContent}>
          {gardens.map(g => (
            <TouchableOpacity
              key={g.id}
              style={[styles.pickerChip, selectedGarden.id === g.id && styles.pickerChipActive]}
              onPress={() => setSelectedGarden(g)}
            >
              <Text style={[styles.pickerChipText, selectedGarden.id === g.id && styles.pickerChipTextActive]}>
                {g.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'plants' && styles.tabActive]}
            onPress={() => setTab('plants')}
          >
            <Ionicons name="leaf" size={16} color={tab === 'plants' ? COLORS.primary : COLORS.subtext} />
            <Text style={[styles.tabText, tab === 'plants' && styles.tabTextActive]}>
              Plants ({plants.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'needs' && styles.tabActive]}
            onPress={() => setTab('needs')}
          >
            <Ionicons name="list" size={16} color={tab === 'needs' ? COLORS.primary : COLORS.subtext} />
            <Text style={[styles.tabText, tab === 'needs' && styles.tabTextActive]}>
              Needs ({needs.length})
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'plants' ? (
          <FlatList
            data={plants}
            keyExtractor={i => i.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <View style={styles.form}>
                <TextInput
                  style={styles.input}
                  placeholder="Plant name (e.g. Tomatoes)"
                  value={plantName}
                  onChangeText={setPlantName}
                  placeholderTextColor={COLORS.subtext}
                />
                <View style={styles.statusRow}>
                  {['good', 'fair', 'poor'].map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.statusBtn, plantStatus === s && { backgroundColor: STATUS_COLORS[s] }]}
                      onPress={() => setPlantStatus(s)}
                    >
                      <Text style={[styles.statusBtnText, plantStatus === s && { color: '#fff' }]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={styles.addBtn} onPress={addPlant}>
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] || '#ccc' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <Text style={styles.cardSub}>{item.status} · {new Date(item.planted_at).toLocaleDateString()}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyList}>No plants yet — add one above</Text>}
          />
        ) : (
          <FlatList
            data={needs}
            keyExtractor={i => i.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <View style={styles.form}>
                <View style={styles.statusRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="What does this garden need?"
                    value={needItem}
                    onChangeText={setNeedItem}
                    placeholderTextColor={COLORS.subtext}
                  />
                  <TouchableOpacity style={styles.addBtn} onPress={addNeed}>
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Ionicons
                  name={item.claimed_by ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={item.claimed_by ? COLORS.accent : COLORS.subtext}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardName, item.claimed_by && { textDecorationLine: 'line-through', color: COLORS.subtext }]}>
                    {item.item}
                  </Text>
                  {item.claimed_by && <Text style={styles.cardSub}>Claimed</Text>}
                </View>
                {!item.claimed_by && (
                  <TouchableOpacity style={styles.claimBtn} onPress={() => claimNeed(item)}>
                    <Text style={styles.claimBtnText}>I'll bring it</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyList}>No needs listed yet</Text>}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  emptyText: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 12 },
  emptySubtext: { fontSize: 14, color: COLORS.subtext, marginTop: 4 },
  pickerRow: { maxHeight: 54, backgroundColor: COLORS.primary },
  pickerContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  pickerChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)',
  },
  pickerChipActive: { backgroundColor: COLORS.accent },
  pickerChipText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  pickerChipTextActive: { color: COLORS.primary },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.subtext },
  tabTextActive: { color: COLORS.primary },
  list: { padding: 16, gap: 10 },
  form: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 4 },
  input: {
    backgroundColor: COLORS.background, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: COLORS.text, marginBottom: 10,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#EEE', alignItems: 'center',
  },
  statusBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.subtext },
  addBtn: {
    backgroundColor: COLORS.primary, width: 40, height: 40,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  card: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  cardName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  cardSub: { fontSize: 12, color: COLORS.subtext, marginTop: 2 },
  claimBtn: {
    backgroundColor: '#EFF7EE', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 8,
  },
  claimBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  emptyList: { textAlign: 'center', color: COLORS.subtext, fontSize: 14, marginTop: 24 },
});
