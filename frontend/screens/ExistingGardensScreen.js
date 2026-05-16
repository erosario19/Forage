import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

const COLORS = {
  primary: '#2D5A27',
  accent: '#7CB87A',
  background: '#F5F0E8',
  text: '#1C2B1A',
  subtext: '#5A7A58',
};

export default function ExistingGardensScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🗺️</Text>
        <Text style={styles.title}>Community Gardens</Text>
        <Text style={styles.subtitle}>
          Browse and connect with existing community gardens in your area.
        </Text>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Garden Listings & Map coming soon</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.subtext,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  placeholder: {
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 48,
    backgroundColor: '#EFF7EE',
  },
  placeholderText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});
