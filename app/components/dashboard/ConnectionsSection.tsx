import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Connection } from '@/types/dashboard';

interface ConnectionsSectionProps {
  connections: Connection[];
}

export function ConnectionsSection({ connections }: ConnectionsSectionProps) {
  return (
    <>
      <ThemedText type="title" style={styles.sectionTitle}>
        Conexões
      </ThemedText>
      {connections.map((conn) => (
        <View key={conn.conexaoId} style={styles.itemCard}>
          <ThemedText type="defaultSemiBold" style={styles.itemTitle}>
            {conn.name}
          </ThemedText>
          <ThemedText style={styles.itemDescription}>
            Curso: {conn.curso}
          </ThemedText>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  itemTitle: { fontSize: 18, marginBottom: 5, color: '#007AFF' },
  itemDescription: { fontSize: 14, color: '#555' },
});
