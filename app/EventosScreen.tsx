import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.API_URL;

interface EventoDetalhado {
  id: number;
  nome: string;
  descricao: string;
  data: string;
  curso: string;
  localizacao: string;
  limite_participantes: number;
  criador_id: string;
  total_participantes: number;
  observacoes_adicionais: string;
  evento_participantes?: { usuario_id: string }[];
}

export default function EventoDetalhesScreen() {
  const { id } = useLocalSearchParams();
  const [evento, setEvento] = useState<EventoDetalhado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchEvento = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/eventos/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Evento não encontrado');
        }

        const data = await response.json();
        setEvento(data);
      } catch (err) {
         //setError(err.message || 'Erro ao carregar evento');
      } finally {
        setLoading(false);
      }
    };

    fetchEvento();
  }, [id]);

  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText type="subtitle" style={styles.errorText}>
          {error}
        </ThemedText>
      </ThemedView>
    );
  }

  if (!evento) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText type="subtitle">
          Evento não encontrado
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={styles.card}>
        <ThemedText type="title" style={styles.title}>
          {evento.nome}
        </ThemedText>
        
        <View style={styles.detailSection}>
          <ThemedText type="defaultSemiBold">Data e Hora:</ThemedText>
          <ThemedText>{formatarData(evento.data)}</ThemedText>
        </View>

        <View style={styles.detailSection}>
          <ThemedText type="defaultSemiBold">Localização:</ThemedText>
          <ThemedText>{evento.localizacao}</ThemedText>
        </View>

        <View style={styles.detailSection}>
          <ThemedText type="defaultSemiBold">Curso:</ThemedText>
          <ThemedText>{evento.curso}</ThemedText>
        </View>

        <View style={styles.detailSection}>
          <ThemedText type="defaultSemiBold">Participantes:</ThemedText>
          <ThemedText>
            {evento.total_participantes} / {evento.limite_participantes || 'Sem limite'}
          </ThemedText>
        </View>

        <View style={styles.detailSection}>
          <ThemedText type="defaultSemiBold">Descrição:</ThemedText>
          <ThemedText style={styles.descriptionText}>
            {evento.descricao}
          </ThemedText>
        </View>

        {evento.observacoes_adicionais && (
          <View style={styles.detailSection}>
            <ThemedText type="defaultSemiBold">Observações:</ThemedText>
            <ThemedText style={styles.notesText}>
              {evento.observacoes_adicionais}
            </ThemedText>
          </View>
        )}

        <TouchableOpacity 
          style={styles.button}
     //      onPress={() => router.push(`/eventos/${evento.id}/participar`)}
        >
          <ThemedText style={styles.buttonText}>Participar do Evento</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    marginBottom: 20,
    textAlign: 'center',
    color: '#007AFF',
  },
  detailSection: {
    marginBottom: 16,
  },
  descriptionText: {
    marginTop: 4,
    lineHeight: 22,
  },
  notesText: {
    marginTop: 4,
    fontStyle: 'italic',
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});