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

const PLANT_CATEGORIES = [
  { key: 'fruits',      label: 'Fruits',      color: '#E91E63' },
  { key: 'vegetables',  label: 'Vegetables',  color: '#4CAF50' },
  { key: 'herbs',       label: 'Herbs',       color: '#8BC34A' },
  { key: 'ornamentals', label: 'Ornamentals', color: '#9C27B0' },
];

const PLANT_EMOJIS = {
  fruits: [
    { emoji: '🍎', name: 'Apple' }, { emoji: '🍊', name: 'Orange' },
    { emoji: '🍋', name: 'Lemon' }, { emoji: '🍇', name: 'Grapes' },
    { emoji: '🍓', name: 'Strawberry' }, { emoji: '🍑', name: 'Peach' },
    { emoji: '🍒', name: 'Cherry' }, { emoji: '🥭', name: 'Mango' },
    { emoji: '🍍', name: 'Pineapple' }, { emoji: '🥝', name: 'Kiwi' },
    { emoji: '🍌', name: 'Banana' }, { emoji: '🍉', name: 'Watermelon' },
    { emoji: '🍐', name: 'Pear' }, { emoji: '🫐', name: 'Blueberry' },
    { emoji: '🍅', name: 'Tomato' }, { emoji: '🥥', name: 'Coconut' },
    { emoji: '🍈', name: 'Melon' }, { emoji: '🫒', name: 'Olive' },
  ],
  vegetables: [
    { emoji: '🥦', name: 'Broccoli' }, { emoji: '🥕', name: 'Carrot' },
    { emoji: '🌽', name: 'Corn' }, { emoji: '🥒', name: 'Cucumber' },
    { emoji: '🧅', name: 'Onion' }, { emoji: '🧄', name: 'Garlic' },
    { emoji: '🥔', name: 'Potato' }, { emoji: '🍠', name: 'Sweet Potato' },
    { emoji: '🥬', name: 'Lettuce' }, { emoji: '🥑', name: 'Avocado' },
    { emoji: '🫑', name: 'Bell Pepper' }, { emoji: '🌶️', name: 'Chili' },
    { emoji: '🍆', name: 'Eggplant' }, { emoji: '🫛', name: 'Pea Pod' },
    { emoji: '🥜', name: 'Peanut' }, { emoji: '🫘', name: 'Beans' },
    { emoji: '🌰', name: 'Chestnut' }, { emoji: '🥗', name: 'Greens' },
  ],
  herbs: [
    { emoji: '🌿', name: 'Basil' }, { emoji: '🍃', name: 'Mint' },
    { emoji: '🌱', name: 'Sprout' }, { emoji: '🪴', name: 'Potted Plant' },
    { emoji: '🎋', name: 'Bamboo' }, { emoji: '🍀', name: 'Clover' },
    { emoji: '☘️', name: 'Shamrock' }, { emoji: '🌾', name: 'Wheat' },
    { emoji: '🫚', name: 'Olive Oil' }, { emoji: '🧂', name: 'Salt Plant' },
  ],
  ornamentals: [
    { emoji: '🌸', name: 'Cherry Blossom' }, { emoji: '🌺', name: 'Hibiscus' },
    { emoji: '🌻', name: 'Sunflower' }, { emoji: '🌹', name: 'Rose' },
    { emoji: '🌷', name: 'Tulip' }, { emoji: '💐', name: 'Bouquet' },
    { emoji: '🌼', name: 'Daisy' }, { emoji: '🪷', name: 'Lotus' },
    { emoji: '🏵️', name: 'Rosette' }, { emoji: '🌵', name: 'Cactus' },
    { emoji: '🎍', name: 'Pine Deco' }, { emoji: '🍁', name: 'Maple' },
  ],
};

const STATUS_COLORS = { good: '#4CAF50', fair: '#FF9800', poor: '#F44336' };

const GRID_COLS = 8;
const GRID_ROWS = 6;

// ── Gemini helpers ────────────────────────────────────────────────────────────
async function geminiText(prompt) {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response.';
}

async function geminiEmoji(plantName) {
  try {
    const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `Give me one emoji for a ${plantName} plant. Reply with only the emoji, nothing else.` }] }] }),
      }
    );
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return raw.trim().split(/\s/)[0] || '🌱';
  } catch {
    return '🌱';
  }
}

async function geminiVision(base64, mimeType) {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: 'Look at this plant photo. Rate its health as exactly one of: good, fair, or poor. Then give a one-sentence reason. Format: "Health: <rating>. <reason>"' },
            { inline_data: { mime_type: mimeType, data: base64 } },
          ],
        }],
      }),
    }
  );
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}
// ─────────────────────────────────────────────────────────────────────────────

export default function ManageGardenScreen() {
  const [gardens, setGardens]           = useState([]);
  const [selectedGarden, setSelectedGarden] = useState(null);
  const [plants, setPlants]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [tab, setTab]                   = useState('planner'); // 'planner' | 'plants' | 'schedule'

  // Garden planner state
  const [plotCells, setPlotCells]       = useState(new Set()); // "r-c" strings
  const [hydroCells, setHydroCells]     = useState(new Set()); // "r-c" strings
  const [plantCells, setPlantCells]     = useState({});        // "r-c" → plant object
  const [plannerMode, setPlannerMode]   = useState('view');    // 'add-plot' | 'add-hydro' | 'add-plant' | 'view'
  const [selectedPlantForGrid, setSelectedPlantForGrid] = useState(null); // {id, name, emoji}
  const [trayPlants, setTrayPlants] = useState([]); // [{id, name, emoji}] — local only
  const [selectedCategory, setSelectedCategory] = useState('vegetable');
  const [selectedPlotCell, setSelectedPlotCell] = useState(null);

  // Add plant modal
  const [addPlantModal, setAddPlantModal] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState('fruits');
  const [customPlantName, setCustomPlantName] = useState('');
  const [plantStatus, setPlantStatus]   = useState('good');
  const [botSuggestion, setBotSuggestion] = useState('');
  const [botLoading, setBotLoading]     = useState(false);

  // Add plot modal
  const [addPlotModal, setAddPlotModal] = useState(false);
  const [plotName, setPlotName]         = useState('');
  const [plotDesc, setPlotDesc]         = useState('');

  // Vision
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

  // ── Garden planner cell tap ────────────────────────────────────────────────
  const onCellPress = (r, c) => {
    const key = `${r}-${c}`;
    if (plannerMode === 'add-plot') {
      setPlotCells(prev => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
          setPlantCells(p => { const n = { ...p }; delete n[key]; return n; });
        } else next.add(key);
        return next;
      });
      setHydroCells(prev => { const next = new Set(prev); next.delete(key); return next; });
    } else if (plannerMode === 'add-hydro') {
      setHydroCells(prev => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
          setPlantCells(p => { const n = { ...p }; delete n[key]; return n; });
        } else next.add(key);
        return next;
      });
      setPlotCells(prev => { const next = new Set(prev); next.delete(key); return next; });
    } else if (plannerMode === 'add-plant') {
      if (!plotCells.has(key) && !hydroCells.has(key)) { Alert.alert('Select a plot first', 'Tap a soil or hydro cell to place a plant.'); return; }
      if (!selectedPlantForGrid) { Alert.alert('Select a plant', 'Tap a plant in the tray to select it first.'); return; }
      setPlantCells(prev => ({ ...prev, [key]: selectedPlantForGrid }));
    }
  };

  // ── Add plant to DB ────────────────────────────────────────────────────────
  const addPlantFromEmoji = async ({ emoji, name }) => {
    setTrayPlants(prev => {
      if (prev.some(p => p.name.toLowerCase() === name.toLowerCase())) return prev;
      return [...prev, { id: `plant-${Date.now()}`, name, emoji }];
    });
    setAddPlantModal(false);
    await supabase.from('plants').insert({
      garden_id: selectedGarden?.id,
      name,
      status: 'good',
      category: emojiCategory,
    });
    refreshPlants();
  };

  // ── Add plot (new garden) ──────────────────────────────────────────────────
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

  // ── Gemini plant bot ───────────────────────────────────────────────────────
  const getAISuggestion = async () => {
    setBotLoading(true); setBotSuggestion('');
    const plantList = plants.map(p => `${p.name} (${p.category || 'plant'})`).join(', ') || 'none yet';
    const text = await geminiText(
      `You are a community garden assistant for Chicago, IL (zone 6a). The garden has: ${plantList}. The gardener wants to add a ${plantCategory}. Suggest 2-3 specific plants that grow well together and briefly explain placement. Be concise.`
    );
    setBotSuggestion(text);
    setBotLoading(false);
  };

  // ── Gemini vision plant health ─────────────────────────────────────────────
  const pickAndAnalyze = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo access to analyze plant health.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true, quality: 0.6,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setVisionImage(asset.uri);
    setVisionLoading(true); setVisionResult('');
    const text = await geminiVision(asset.base64, asset.mimeType || 'image/jpeg');
    setVisionResult(text);
    setVisionLoading(false);
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
      {/* Garden picker */}
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

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setAddPlantModal(true)}>
          <Ionicons name="leaf-outline" size={15} color="#fff" />
          <Text style={styles.actionBtnText}>Add Plant</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {[['planner','grid','Planner'], ['schedule','calendar','Schedule']].map(([key, icon, label]) => (
          <TouchableOpacity key={key} style={[styles.tab, tab === key && styles.tabActive]} onPress={() => setTab(key)}>
            <Ionicons name={icon} size={15} color={tab === key ? COLORS.primary : COLORS.subtext} />
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>

        {/* ── GARDEN PLANNER ─────────────────────────────────────────────── */}
        {tab === 'planner' && (
          <View style={styles.plannerContainer}>
            <Text style={styles.plannerHint}>
              {plannerMode === 'add-plot' ? '🟫 Tap cells to mark as soil beds' :
               plannerMode === 'add-hydro' ? '🟦 Tap cells to mark as hydroponic beds' :
               plannerMode === 'add-plant' ? `Tap a plot cell to place ${selectedPlantForGrid?.emoji ?? '🌱'} ${selectedPlantForGrid?.name ?? ''}` :
               'Select a plot type or plant below'}
            </Text>

            {/* Mode controls */}
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeBtn, plannerMode === 'add-plot' && { backgroundColor: '#8B5E3C' }]}
                onPress={() => setPlannerMode(plannerMode === 'add-plot' ? 'view' : 'add-plot')}>
                <Text style={[styles.modeBtnText, plannerMode === 'add-plot' && { color: '#fff' }]}>🟫 Soil</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeBtn, plannerMode === 'add-hydro' && { backgroundColor: '#1565C0' }]}
                onPress={() => setPlannerMode(plannerMode === 'add-hydro' ? 'view' : 'add-hydro')}>
                <Text style={[styles.modeBtnText, plannerMode === 'add-hydro' && { color: '#fff' }]}>🟦 Hydro</Text>
              </TouchableOpacity>
            </View>

            {/* Plant tray — tap to select, then tap a cell to place */}
            {trayPlants.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={styles.plantTray} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
                {trayPlants.map(plant => {
                  const isSelected = selectedPlantForGrid?.id === plant.id;
                  return (
                    <TouchableOpacity key={plant.id}
                      style={[styles.trayItem, isSelected && styles.trayItemSelected]}
                      onPress={() => {
                        setSelectedPlantForGrid(plant);
                        setPlannerMode('add-plant');
                      }}>
                      <Text style={styles.trayEmoji}>{plant.emoji}</Text>
                      <Text style={styles.trayLabel} numberOfLines={1}>{plant.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
            {trayPlants.length === 0 && (
              <Text style={styles.trayEmpty}>Add plants using the button above, then place them here</Text>
            )}

            {/* Garden grid */}
            <View style={styles.gardenGrid}>
              {Array.from({ length: GRID_ROWS }).map((_, r) => (
                <View key={r} style={styles.gridRow}>
                  {Array.from({ length: GRID_COLS }).map((_, c) => {
                    const key = `${r}-${c}`;
                    const isPlot = plotCells.has(key);
                    const isHydro = hydroCells.has(key);
                    const plant = plantCells[key];
                    return (
                      <TouchableOpacity
                        key={c}
                        style={[styles.gridCell, isPlot && styles.plotCell, isHydro && styles.hydroCell]}
                        onPress={() => onCellPress(r, c)}>
                        {plant && <Text style={styles.plantEmoji}>{plant.emoji}</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* Vision health check */}
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

        {/* ── PLANTS LIST ────────────────────────────────────────────────── */}
        {tab === 'plants' && (
          <View style={{ padding: 12 }}>
            {/* Category filter */}
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

        {/* ── SCHEDULE ──────────────────────────────────────────────────── */}
        {tab === 'schedule' && (
          <GardenCalendar gardenId={selectedGarden?.id} />
        )}
      </ScrollView>

      {/* ── Add Plant modal — emoji picker ───────────────────────────────────── */}
      <Modal visible={addPlantModal} transparent animationType="slide"
        onRequestClose={() => setAddPlantModal(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setAddPlantModal(false)} />
          <View style={[styles.sheet, { paddingBottom: 32 }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add a Plant</Text>
              <TouchableOpacity onPress={() => setAddPlantModal(false)}>
                <Ionicons name="close" size={22} color={COLORS.subtext} />
              </TouchableOpacity>
            </View>

            {/* Category tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
              {PLANT_CATEGORIES.map(cat => (
                <TouchableOpacity key={cat.key}
                  style={[styles.catPickBtn, emojiCategory === cat.key && { backgroundColor: cat.color }]}
                  onPress={() => setEmojiCategory(cat.key)}>
                  <Text style={[styles.catPickBtnText, emojiCategory === cat.key && { color: '#fff' }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Emoji grid — tap one to add to tray and close */}
            <ScrollView style={{ maxHeight: 260 }}>
              <View style={styles.emojiGrid}>
                {PLANT_EMOJIS[emojiCategory].map(item => (
                  <TouchableOpacity key={item.name} style={styles.emojiItem}
                    onPress={() => addPlantFromEmoji(item)}>
                    <Text style={styles.emojiPickerIcon}>{item.emoji}</Text>
                    <Text style={styles.emojiPickerName}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Custom plant name */}
            <View style={styles.customPlantRow}>
              <Text style={styles.trayEmoji}>🌱</Text>
              <TextInput
                style={styles.customPlantInput}
                placeholder="Or type a custom plant name..."
                placeholderTextColor={COLORS.subtext}
                value={customPlantName}
                onChangeText={setCustomPlantName}
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (customPlantName.trim()) {
                    addPlantFromEmoji({ emoji: '🌱', name: customPlantName.trim() });
                    setCustomPlantName('');
                  }
                }}
              />
              <TouchableOpacity
                style={[styles.customPlantBtn, !customPlantName.trim() && { opacity: 0.4 }]}
                onPress={() => {
                  if (customPlantName.trim()) {
                    addPlantFromEmoji({ emoji: '🌱', name: customPlantName.trim() });
                    setCustomPlantName('');
                  }
                }}
                disabled={!customPlantName.trim()}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Add Plot modal ───────────────────────────────────────────────────── */}
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

  // Planner
  plannerContainer: { padding: 12 },
  plannerHint:    { fontSize: 13, color: COLORS.subtext, textAlign: 'center', marginBottom: 10, fontStyle: 'italic' },
  modeRow:        { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  modeBtn:        { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#EEE' },
  modeBtnText:    { fontSize: 13, fontWeight: '600', color: COLORS.subtext },
  gardenGrid:     { backgroundColor: '#C8E6C9', borderRadius: 12, padding: 6, borderWidth: 2, borderColor: '#81C784' },
  gridRow:        { flexDirection: 'row' },
  gridCell:       { flex: 1, aspectRatio: 1, margin: 2, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  plotCell:       { backgroundColor: '#8B5E3C' },
  hydroCell:      { backgroundColor: '#1565C0' },
  plantEmoji:     { fontSize: 14 },

  customPlantRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 14 },
  customPlantInput:{ flex: 1, backgroundColor: COLORS.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  customPlantBtn:  { backgroundColor: COLORS.primary, borderRadius: 8, padding: 10 },
  emojiGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiItem:      { width: '22%', alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.background },
  emojiPickerIcon:{ fontSize: 28 },
  emojiPickerName:{ fontSize: 10, color: COLORS.subtext, marginTop: 3, textAlign: 'center' },
  plantTray:      { maxHeight: 88, marginBottom: 10 },
  trayItem:       { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: '#EEE', minWidth: 60 },
  trayItemSelected: { backgroundColor: '#C8E6C9', borderWidth: 2, borderColor: COLORS.primary },
  trayEmoji:      { fontSize: 26 },
  trayLabel:      { fontSize: 10, color: COLORS.subtext, marginTop: 3, maxWidth: 56, textAlign: 'center' },
  trayEmpty:      { fontSize: 12, color: COLORS.subtext, fontStyle: 'italic', textAlign: 'center', marginBottom: 10 },
  visionSection:  { marginTop: 16, backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  sectionTitle:   { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  visionBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EFF7EE', padding: 12, borderRadius: 10 },
  visionBtnText:  { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  visionPreview:  { width: '100%', height: 160, borderRadius: 10, marginTop: 10, resizeMode: 'cover' },
  visionResult:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#F8FFF8', borderRadius: 10, padding: 12, marginTop: 8, borderLeftWidth: 3 },
  visionResultText: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 19 },

  // Plants list
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

  // Modals
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
