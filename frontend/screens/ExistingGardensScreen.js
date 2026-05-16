import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, TouchableOpacity, RefreshControl,
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

export default function ExistingGardensScreen() {
  const [gardens, setGardens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(null);

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

  const renderGarden = ({ item }) => {
    const isOpen = expanded === item.id;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setExpanded(isOpen ? null : item.id)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <Ionicons name="leaf" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.cardTitle}>
            <Text style={styles.gardenName}>{item.name}</Text>
            <Text style={styles.gardenAddress} numberOfLines={1}>
              {item.address || 'Chicago, IL'}
            </Text>
          </View>
          <Ionicons
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={COLORS.subtext}
          />
        </View>
        {isOpen && (
          <View style={styles.cardBody}>
            {item.description ? (
              <Text style={styles.description}>{item.description}</Text>
            ) : null}
            {item.lat && item.lng ? (
              <View style={styles.coordRow}>
                <Ionicons name="location-outline" size={14} color={COLORS.subtext} />
                <Text style={styles.coordText}>
                  {Number(item.lat).toFixed(4)}, {Number(item.lng).toFixed(4)}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.statsBar}>
        <Ionicons name="leaf" size={16} color={COLORS.accent} />
        <Text style={styles.statsText}>{gardens.length} gardens in Chicago</Text>
      </View>
      <FlatList
        data={gardens}
        keyExtractor={(item) => item.id}
        renderItem={renderGarden}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchGardens(); }}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No gardens found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
  },
  statsText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF7EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { flex: 1 },
  gardenName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  gardenAddress: { fontSize: 12, color: COLORS.subtext, marginTop: 2 },
  cardBody: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0EDE6' },
  description: { fontSize: 13, color: COLORS.subtext, lineHeight: 19, marginBottom: 8 },
  coordRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  coordText: { fontSize: 12, color: COLORS.subtext },
  emptyText: { color: COLORS.subtext, fontSize: 15 },
});
