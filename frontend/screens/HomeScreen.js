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
  const { width, height } = useWindowDimensions();

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

      {/* Hero — takes up most of the screen */}
      <View style={[styles.heroWrap, { height: height * 0.78 }]}>
        <ImageBackground
          source={GARDEN_IMAGE}
          style={styles.hero}
          imageStyle={{ resizeMode: 'cover' }}
        >
          <View style={styles.heroDim} />
          <Text style={[
            styles.brandText,
            Platform.OS === 'web' && { fontFamily: "'Dancing Script', cursive" }
          ]}>
            forage
          </Text>
        </ImageBackground>
      </View>

      {/* Nav circles — bigger, more padding from bottom */}
      <View style={styles.navRow}>
        {NAV_BUTTONS.map(btn => (
          <TouchableOpacity
            key={btn.tab}
            style={styles.navBtn}
            onPress={() => navigation.navigate(btn.tab)}
            activeOpacity={0.8}
          >
            <View style={[styles.navCircle, { backgroundColor: btn.color }]}>
              <Ionicons name={btn.icon} size={30} color="#fff" />
            </View>
            <Text style={styles.navLabel}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.background },
  heroWrap:    { width: '100%', overflow: 'hidden' },
  hero:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroDim:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,50,15,0.35)' },
  brandText:   {
    fontSize: 96,
    fontWeight: '700',
    color: '#fff',
    fontStyle: 'italic',
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  navRow:      {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 36,
    paddingHorizontal: 24,
    paddingBottom: 16,
    marginTop: -44,
    zIndex: 10,
  },
  navBtn:      { alignItems: 'center', gap: 10 },
  navCircle:   {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  navLabel:    {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 17,
  },
});