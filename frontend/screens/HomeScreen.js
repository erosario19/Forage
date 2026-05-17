import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ImageBackground, Platform, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const GARDEN_IMAGE = require('../assets/garden.jpg');

const COLORS = {
  primary: '#2D5A27', accent: '#7CB87A',
  background: '#F5F0E8', text: '#1C2B1A', subtext: '#5A7A58',
};

const NAV_BUTTONS = [
  { label: 'Start\nInitiative', icon: 'flag',   tab: 'Find Space', color: '#2D5A27' },
  { label: 'Find a\nGarden',   icon: 'search',  tab: 'Gardens',    color: '#52945A' },
  { label: 'My\nGardens',      icon: 'leaf',    tab: 'My Garden',  color: '#7CB87A' },
];

export default function HomeScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const heroHeight = Math.min(width * 0.55, 500);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const id = 'dancing-script-font';
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id; link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap';
        document.head.appendChild(link);
      }
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Hero */}
      <View style={[styles.heroWrap, { height: heroHeight }]}>
        <ImageBackground source={GARDEN_IMAGE} style={styles.hero} imageStyle={{ resizeMode: 'cover', height: '180%', top: undefined, bottom: 0 }}>
          <View style={styles.heroDim} />

          <Text style={[styles.brandText, Platform.OS === 'web' && { fontFamily: "'Dancing Script', cursive" }]}>
            forage
          </Text>
          <Text style={styles.tagline}>grow together</Text>
        </ImageBackground>
      </View>

      {/* Nav circles */}
      <View style={styles.navRow}>
        {NAV_BUTTONS.map(btn => (
          <TouchableOpacity key={btn.tab} style={styles.navBtn}
            onPress={() => navigation.navigate(btn.tab)} activeOpacity={0.8}>
            <View style={[styles.navCircle, { backgroundColor: btn.color }]}>
              <Ionicons name={btn.icon} size={26} color="#fff" />
            </View>
            <Text style={styles.navLabel}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Info cards */}
      <View style={styles.cards}>
        {[
          { icon: 'location',  title: 'Find vacant land',    sub: 'AI-powered GIS analysis of underutilized urban space' },
          { icon: 'people',    title: 'Join a community',    sub: 'Connect with local gardeners and coordinate tasks' },
          { icon: 'sparkles',  title: 'AI garden assistant', sub: 'Plant suggestions, harvest detection, watering schedules' },
        ].map(card => (
          <View key={card.title} style={styles.card}>
            <Ionicons name={card.icon} size={20} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardSub}>{card.sub}</Text>
            </View>
          </View>
        ))}
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.background },
  heroWrap:        { width: '100%', overflow: 'hidden' },
  hero:            { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroDim:         { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,50,15,0.45)' },
  brandText:       { fontSize: 76, fontWeight: '700', color: '#fff', fontStyle: 'italic', letterSpacing: -1, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  tagline:         { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 6, letterSpacing: 3 },
  navRow:          { flexDirection: 'row', justifyContent: 'center', gap: 28, marginTop: -34, paddingHorizontal: 24, zIndex: 10 },
  navBtn:          { alignItems: 'center', gap: 8 },
  navCircle:       { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  navLabel:        { fontSize: 12, fontWeight: '700', color: COLORS.text, textAlign: 'center', lineHeight: 16 },
  cards:           { flex: 1, padding: 18, gap: 10, marginTop: 16 },
  card:            { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  cardTitle:       { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  cardSub:         { fontSize: 12, color: COLORS.subtext, lineHeight: 17 },
});
