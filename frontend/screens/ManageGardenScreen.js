import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert, Modal,
  Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import GardenCalendar from '../components/GardenCalendar';

const COLORS = {
  primary: '#2D5A27', accent: '#7CB87A',
  background: '#F5F0E8', text: '#1C2B1A', subtext: '#5A7A58', card: '#FFFFFF',
};

const CATEGORIES = [
  { key: 'vegetable',  label: 'Veg',        emoji: '🥦', color: '#4CAF50' },
  { key: 'fruit',      label: 'Fruit',      emoji: '🍓', color: '#E91E63' },
  { key: 'herb',       label: 'Herb',       emoji: '🌿', color: '#8BC34A' },
  { key: 'ornamental', label: 'Ornamental', emoji: '🌸', color: '#9C27B0' },
];

const STATUS_COLORS = { good: '#4CAF50', fair: '#FF9800', poor: '#F44336' };

const GRID_COLS = 8;
const GRID_ROWS = 6;

// ── Hugging Face helpers ──────────────────────────────────────────────────────
async function hfText(prompt) {
  const res = await fetch(
    'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 200, return_full_text: false },
      }),
    }
  );
  const data = await res.json();
  console.log('HF text response:', JSON.stringify(data).slice(0, 200));
  return data?.[0]?.generated_text ?? 'No response.';
}

async function hfVision(base64, mimeType) {
  const byteCharacters = atob(base64);
  const byteNumbers = Array.from(byteCharacters).map(c => c.charCodeAt(0));
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });

  const res = await fetch(
    'https://api-inference.huggingface.co/models/google/vit-base-patch16-224',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_HF_TOKEN}`,
        'Content-Type': mimeType,
      },
      body: blob,
    }
  );
  const data = await res.json();
  console.log('HF vision response:', JSON.stringify(data).slice(0, 200));

  if (data?.error) return 'Health: fair. Unable to analyze image at this time.';
  if (Array.isArray(data) && data.length > 0) {
    const top = data[0]?.label?.toLowerCase() ?? '';
    if (top.includes('yellow') || top.includes('dead') || top.includes('dry')) {
      return 'Health: poor. The plant shows signs of stress or disease.';
    } else if (top.includes('green') || top.includes('plant') || top.includes('leaf')) {
      return 'Health: good. The plant appears healthy with vibrant foliage.';
    }
    return `Health: fair. Plant detected with label: ${data[0]?.label}.`;
  }
  return 'Health: fair. Could not determine plant health from image.';
}
// ─────────────────────────────────────────────────────────────────────────────

export default function ManageGardenScreen() {
  const [gardens, setGardens]           = useState([]);
  const [selectedGarden, setSelectedGarden] = useState(null);
  const [plants, setPlants]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [tab, setTab]                   = useState('planner');

  const [plotCells, setPlotCells]       = useState(new Set());
  const [plantCells, setPlantCells]     = useState({});
  const [plannerMode, setPlannerMode]   = useState('view');
  const [selectedCategory, setSelectedCategory] = useState('vegetable');
  const [selectedPlotCell, setSelectedPlotCell] = useState(null);

  const [addPlantModal, setAddPlantModal] = useState(false);
  const [plantName, setPlantName]       = useState('');
  const [plantCategory, setPlantCategory] = useState('vegetable');
  const [plantStatus, setPlantStatus]   = useState('good');
  const [botSuggestion, setBotSuggestion] = useState('');
  const [botLoading, setBotLoading]     = useState(false);

  const [addPlotModal, setAddPlotModal] = useState(false);
  const [plotName, setPlotName]         = useState('');
  const [plotDesc, setPlotDesc]         = useState('');

  const [visionImage, setVisionImage]   = useState(null);
  const [visionResult, setVisionResult] = useState('');
  const [visionLoading, setVisionLoading] = useState(false);

  const [submitting, setSubmitting]     = useState(false);

  useEffect(() => {
    supabase.from('gardens').select('id, name, address').then(({ data }) => {
      if (data?.length) { setGardens(data); setSelectedGarden(data[0]); }
      setLoading(false);
    });
  }, []);

  const refreshPlants = useCallback(async () => {
    if (!selectedGarden) return;
    const { data } = await supabase.from('plants').select('*')
      .eq('garden_id', selectedGarden.id)
      .order('planted_at', { ascending: false });
    setPlants(data || []);
  }, [selectedGarden]);

  useEffect(() => { refreshPlants(); }, [refreshPlants]);

  const onCellPress = (r, c) => {
    const key = `${r}-${c}`;
    if (plannerMode === 'add-plot') {
      setPlotCells(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
      });
    } else if (plannerMode === 'add-plant') {
      if (!plotCells.has(key)) { Alert.alert('Select a plot first', 'Tap a brown plot cell to place a plant.'); return; }
      const cat = CATEGORIES.find(c => c.key === selectedCategory);
      setPlantCells(prev => ({ ...prev, [key]: cat }));
    }
  };

  const submitPlant = async () => {
    if (!plantName.trim() || !selectedGarden) return;
    setSubmitting(true);
    const { error } = await supabase.from('plants').insert({
      garden_id: selectedGarden.id,
      name: plantName.trim(),
      status: plantStatus,
      category: plantCategory,
    });
    setSubmitting(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setPlantName(''); setBotSuggestion('');
    setAddPlantModal(false);
    refreshPlants();
  };

  const submitPlot = async () => {
    if (!plotName.trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase.from('gardens').insert({
      name: plotName.trim(), description: plotDesc.trim(), address: 'Chicago, IL',
    }).select().single();
    setSubmitting(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setGardens(prev => [...prev, data]);
    setSelectedGarden(data);
    setPlotName(''); setPlotDesc('');
    setAddPlotModal(false);
  };

  const getAISuggestion = async () => {
    setBotLoading(true); setBotSuggestion('');
    const plantList = plants.map(p => `${p.name} (${p.category || 'plant'})`).join(', ') || 'none yet';
    const text = await hfText(
      `[INST]You are a community garden assistant for Chicago, IL (zone 6a). The garden has: ${plantList}. The gardener wants to add a ${plantCategory}. Suggest 2-3 specific plants that grow well together and briefly explain placement. Be concise.[/INST]`
    );
    setBotSuggestion(text);
    setBotLoading(false);
  };

  const pickAndAnalyze = async () => {
    console.log('pickAndAnalyze called');
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Permission:', perm.status);
      if (perm.status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo access to analyze plant health.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.6,
      });
      console.log('Picker done, canceled:', result.canceled);
      if (result.canceled) return;
      const asset = result.assets[0];
      setVisionImage(asset.uri);
      setVisionLoading(true);
      setVisionResult('');
      console.log('Sending to HF...');
      const text = await hfVision(asset.base64, asset.mimeType || 'image/jpeg');
      console.log('HF says:', text);
      setVisionResult(text);
      setVisionLoading(false);
    } catch (e) {
      console.error('Error:', e.message);
      Alert.alert('Error', e.message);
    }
  };

  const parseStatus = (text) => {
    const lower = text.toLowerCase();
    if (lower.includes('health: good')) return 'good';
    if (lower.includes('health: fair')) return 'fair';
    if (lower.includes('health: poor')) return 'poor';
    return null;
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  if (!selectedGarden) return (
    <View style={styles.center}>
      <Ionicons name="leaf-outline" size={48} color={COLORS.subtext} />
      <Text style={styles.emptyText}>No gardens yet</Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={() => setAddPlotModal(true)}>
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={styles.primaryBtnText}>Add a Plot</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.pickerRow} contentContainerStyle={styles.pickerContent}>
        {gardens.map(g => (
          <TouchableOpacity key={g.id}
            style={[styles.chip, selectedGarden.id === g.id && styles.chipActive]}
            onPress={() => setSelectedGarden(g)}>
            <Text style={[styles.chipText, selectedGarden.id === g.id && styles.chipTextActive]}>{g.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setAddPlotModal(true)}>
          <Ionicons name="add-circle-outline" size={15} color="#fff" />
          <Text style={styles.actionBtnText}>Add Plot</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setAddPlantModal(true)}>
          <Ionicons name="leaf-outline" size={15} color="#fff" />
          <Text style={styles.actionBtnText}>Add Plant</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3A7D44' }]} onPress={() => setTab('schedule')}>
          <Ionicons name="calendar-outline" size={15} color="#fff" />
          <Text style={styles.actionBtnText}>Schedule</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {[['planner','grid','Planner'], ['plants','leaf','Plants'], ['schedule','calendar','Schedule']].map(([key, icon, label]) => (
          <TouchableOpacity key={key} style={[styles.tab, tab === key && styles.tabActive]} onPress={() => setTab(key)}>
            <Ionicons name={icon} size={15} color={tab === key ? COLORS.primary : COLORS.subtext} />
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>

        {tab === 'planner' && (
          <View style={styles.plannerContainer}>
            <Text style={styles.plannerHint}>
              {plannerMode === 'add-plot' ? '🟫 Tap cells to mark as plot beds' :
               plannerMode === 'add-plant' ? `${CATEGORIES.find(c => c.key === selectedCategory)?.emoji} Tap a brown plot to place plant` :
               'Tap "Add Plot" to start building your garden layout'}
            </Text>

            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeBtn, plannerMode === 'add-plot' && { backgroundColor: '#8B5E3C' }]}
                onPress={() => setPlannerMode(plannerMode === 'add-plot' ? 'view' : 'add-plot')}>
                <Text style={[styles.modeBtnText, plannerMode === 'add-plot' && { color: '#fff' }]}>🟫 Plot</Text>
              </TouchableOpacity>

              {CATEGORIES.map(cat => (
                <TouchableOpacity key={cat.key}
                  style={[styles.modeBtn, plannerMode === 'add-plant' && selectedCategory === cat.key && { backgroundColor: cat.color }]}
                  onPress={() => { setSelectedCategory(cat.key); setPlannerMode('add-plant'); }}>
                  <Text style={[styles.modeBtnText, plannerMode === 'add-plant' && selectedCategory === cat.key && { color: '#fff' }]}>
                    {cat.emoji}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.gardenGrid}>
              {Array.from({ length: GRID_ROWS }).map((_, r) => (
                <View key={r} style={styles.gridRow}>
                  {Array.from({ length: GRID_COLS }).map((_, c) => {
                    const key = `${r}-${c}`;
                    const isPlot = plotCells.has(key);
                    const plant = plantCells[key];
                    return (
                      <TouchableOpacity key={c} style={[styles.gridCell, isPlot && styles.plotCell]}
                        onPress={() => onCellPress(r, c)}>
                        {plant && <Text style={styles.plantEmoji}>{plant.emoji}</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={styles.visionSection}>
              <Text style={styles.sectionTitle}>AI Plant Health Check</Text>
              <TouchableOpacity style={styles.visionBtn} onPress={pickAndAnalyze} disabled={visionLoading}>
                <Ionicons name="camera" size={18} color={COLORS.primary} />
                <Text style={styles.visionBtnText}>{visionLoading ? 'Analyzing...' : 'Upload plant photo'}</Text>
              </TouchableOpacity>
              {visionLoading && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 8 }} />}
              {visionImage && <Image source={{ uri: visionImage }} style={styles.visionPreview} />}
              {visionResult ? (
                <View style={[styles.visionResult, { borderLeftColor: STATUS_COLORS[parseStatus(visionResult)] || COLORS.accent }]}>
                  <Ionicons name="sparkles" size={16} color={STATUS_COLORS[parseStatus(visionResult)] || COLORS.accent} />
                  <Text style={styles.visionResultText}>{visionResult}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {tab === 'plants' && (
          <View style={{ padding: 12 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
              <TouchableOpacity style={[styles.catChip, !selectedCategory && styles.catChipActive]}
                onPress={() => setSelectedCategory(null)}>
                <Text style={styles.catChipText}>All</Text>
              </TouchableOpacity>
              {CATEGORIES.map(cat => (
                <TouchableOpacity key={cat.key}
                  style={[styles.catChip, selectedCategory === cat.key && { backgroundColor: cat.color }]}
                  onPress={() => setSelectedCategory(cat.key)}>
                  <Text style={[styles.catChipText, selectedCategory === cat.key && { color: '#fff' }]}>
                    {cat.emoji} {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {plants
              .filter(p => !selectedCategory || p.category === selectedCategory)
              .map(plant => {
                const cat = CATEGORIES.find(c => c.key === plant.category);
                return (
                  <View key={plant.id} style={styles.plantRow}>
                    <Text style={styles.plantEmojiBig}>{cat?.emoji || '🌱'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.plantName}>{plant.name}</Text>
                      <Text style={styles.plantMeta}>{cat?.label || plant.category} · {plant.status}</Text>
                    </View>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[plant.status] || '#ccc' }]} />
                  </View>
                );
              })}
            {plants.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No plants yet</Text>
                <Text style={styles.emptySub}>Tap "Add Plant" above to get started</Text>
              </View>
            )}
          </View>
        )}

        {tab === 'schedule' && (
          <GardenCalendar gardenId={selectedGarden?.id} />
        )}
      </ScrollView>

      <Modal visible={addPlantModal} transparent animationType="slide"
        onRequestClose={() => setAddPlantModal(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setAddPlantModal(false)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add a Plant</Text>
              <TouchableOpacity onPress={() => setAddPlantModal(false)}>
                <Ionicons name="close" size={22} color={COLORS.subtext} />
              </TouchableOpacity>
            </View>

            <Text style={styles.formLabel}>Plant name</Text>
            <TextInput style={styles.formInput} placeholder="e.g. Cherry Tomatoes"
              placeholderTextColor={COLORS.subtext} value={plantName} onChangeText={setPlantName} />

            <Text style={styles.formLabel}>Category</Text>
            <View style={styles.catPickRow}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity key={cat.key}
                  style={[styles.catPickBtn, plantCategory === cat.key && { backgroundColor: cat.color }]}
                  onPress={() => setPlantCategory(cat.key)}>
                  <Text style={[styles.catPickBtnText, plantCategory === cat.key && { color: '#fff' }]}>
                    {cat.emoji} {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Health status</Text>
            <View style={styles.statusRow}>
              {['good','fair','poor'].map(s => (
                <TouchableOpacity key={s}
                  style={[styles.statusBtn, plantStatus === s && { backgroundColor: STATUS_COLORS[s] }]}
                  onPress={() => setPlantStatus(s)}>
                  <Text style={[styles.statusBtnText, plantStatus === s && { color: '#fff' }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.botBtn} onPress={getAISuggestion} disabled={botLoading}>
              <Ionicons name="sparkles" size={15} color={COLORS.primary} />
              <Text style={styles.botBtnText}>{botLoading ? 'Thinking...' : 'Ask AI for plant suggestions'}</Text>
            </TouchableOpacity>
            {botLoading && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 6 }} />}
            {botSuggestion ? (
              <View style={styles.botResult}>
                <Text style={styles.botResultText}>{botSuggestion}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 14 }, submitting && { opacity: 0.6 }]}
              onPress={submitPlant} disabled={submitting}>
              <Ionicons name="leaf" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>{submitting ? 'Adding...' : 'Add Plant'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={addPlotModal} transparent animationType="slide"
        onRequestClose={() => setAddPlotModal(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setAddPlotModal(false)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add a Plot</Text>
              <TouchableOpacity onPress={() => setAddPlotModal(false)}>
                <Ionicons name="close" size={22} color={COLORS.subtext} />
              </TouchableOpacity>
            </View>

            <Text style={styles.formLabel}>Garden name</Text>
            <TextInput style={styles.formInput} placeholder="e.g. Pilsen Community Plot"
              placeholderTextColor={COLORS.subtext} value={plotName} onChangeText={setPlotName} />

            <Text style={styles.formLabel}>Description (optional)</Text>
            <TextInput style={[styles.formInput, { height: 72, textAlignVertical: 'top' }]}
              placeholder="What will you grow here?"
              placeholderTextColor={COLORS.subtext} value={plotDesc} onChangeText={setPlotDesc}
              multiline numberOfLines={3} />

            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 14 }, submitting && { opacity: 0.6 }]}
              onPress={submitPlot} disabled={submitting}>
              <Ionicons name="add-circle" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>{submitting ? 'Creating...' : 'Create Plot'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, gap: 12 },
  emptyText:      { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptySub:       { fontSize: 13, color: COLORS.subtext },
  pickerRow:      { maxHeight: 48, backgroundColor: COLORS.primary },
  pickerContent:  { paddingHorizontal: 12, paddingVertical: 9, gap: 8, alignItems: 'center' },
  chip:           { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)' },
  chipActive:     { backgroundColor: COLORS.accent },
  chipText:       { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: COLORS.primary },
  actionRow:      { flexDirection: 'row', gap: 8, padding: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  actionBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: COLORS.primary, paddingVertical: 9, borderRadius: 10 },
  actionBtnText:  { color: '#fff', fontSize: 12, fontWeight: '700' },
  tabs:           { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  tab:            { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10 },
  tabActive:      { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText:        { fontSize: 13, fontWeight: '600', color: COLORS.subtext },
  tabTextActive:  { color: COLORS.primary },
  plannerContainer: { padding: 12 },
  plannerHint:    { fontSize: 13, color: COLORS.subtext, textAlign: 'center', marginBottom: 10, fontStyle: 'italic' },
  modeRow:        { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  modeBtn:        { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#EEE' },
  modeBtnText:    { fontSize: 13, fontWeight: '600', color: COLORS.subtext },
  gardenGrid:     { backgroundColor: '#C8E6C9', borderRadius: 12, padding: 6, borderWidth: 2, borderColor: '#81C784' },
  gridRow:        { flexDirection: 'row' },
  gridCell:       { flex: 1, aspectRatio: 1, margin: 2, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  plotCell:       { backgroundColor: '#8B5E3C' },
  plantEmoji:     { fontSize: 14 },
  visionSection:  { marginTop: 16, backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  sectionTitle:   { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  visionBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EFF7EE', padding: 12, borderRadius: 10 },
  visionBtnText:  { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  visionPreview:  { width: '100%', height: 160, borderRadius: 10, marginTop: 10, resizeMode: 'cover' },
  visionResult:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#F8FFF8', borderRadius: 10, padding: 12, marginTop: 8, borderLeftWidth: 3 },
  visionResultText: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 19 },
  catRow:         { marginBottom: 12 },
  catChip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#EEE' },
  catChipActive:  { backgroundColor: COLORS.primary },
  catChipText:    { fontSize: 12, fontWeight: '600', color: COLORS.subtext },
  plantRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8 },
  plantEmojiBig:  { fontSize: 28 },
  plantName:      { fontSize: 15, fontWeight: '700', color: COLORS.text },
  plantMeta:      { fontSize: 12, color: COLORS.subtext, marginTop: 2 },
  statusDot:      { width: 12, height: 12, borderRadius: 6 },
  emptyCard:      { alignItems: 'center', padding: 40 },
  overlay:        { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet:          { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44 },
  handle:         { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sheetTitle:     { fontSize: 20, fontWeight: '800', color: COLORS.text },
  formLabel:      { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6, marginTop: 12 },
  formInput:      { backgroundColor: COLORS.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  catPickRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  catPickBtn:     { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#EEE' },
  catPickBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.subtext },
  statusRow:      { flexDirection: 'row', gap: 8 },
  statusBtn:      { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: '#EEE', alignItems: 'center' },
  statusBtnText:  { fontSize: 13, fontWeight: '600', color: COLORS.subtext },
  botBtn:         { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EFF7EE', borderRadius: 10, padding: 12, marginTop: 12 },
  botBtnText:     { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  botResult:      { backgroundColor: '#F0F7FF', borderRadius: 10, padding: 12, marginTop: 8, borderLeftWidth: 3, borderLeftColor: COLORS.accent },
  botResultText:  { fontSize: 13, color: COLORS.text, lineHeight: 19 },
  primaryBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});