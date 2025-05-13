import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { ThemedText } from '../ThemedText';
import type { Group } from '../../types/dashboard.types';

interface GroupsSectionProps {
  groups: Group[];
}

export function GroupsSection({ groups }: GroupsSectionProps) {
  return (
    <View style={styles.container}>
      <FlatList
        data={groups}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={() => (
          <ThemedText type="title" style={styles.sectionTitle}>
            Grupos de Estudo
          </ThemedText>
        )}
        renderItem={({ item: group }) => (
          <View style={styles.itemCard}>
            <ThemedText type="defaultSemiBold" style={styles.itemTitle}>
              {group.nome}
            </ThemedText>
            <ThemedText style={styles.itemDescription}>
              {group.descricao}
            </ThemedText>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
