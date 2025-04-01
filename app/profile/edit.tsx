import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { UserProfile } from '@/types/dashboard.types';

const API_URL = Constants.expoConfig?.extra?.API_URL;

export default function EditProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/');
        return;
      }

      const response = await fetch(`${API_URL}/api/profile`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setEditedProfile(data);
      } else {
        Alert.alert('Erro', 'Não foi possível carregar o perfil');
        router.back();
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao carregar o perfil');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editedProfile) return;

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/');
        return;
      }

      const response = await fetch(`${API_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editedProfile),
      });

      if (response.ok) {
        Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
        setProfile(editedProfile);
        router.back();
      } else {
        Alert.alert('Erro', 'Não foi possível atualizar o perfil');
      }
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar o perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!profile || !editedProfile) {
    return null;
  }

  return (
    <LinearGradient colors={['#005BB5', '#007AFF']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>
          Editar Perfil
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Nome</ThemedText>
            <TextInput
              style={styles.input}
              value={editedProfile.name}
              onChangeText={(text) =>
                setEditedProfile({ ...editedProfile, name: text })
              }
              placeholder="Seu nome"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Email</ThemedText>
            <TextInput
              style={styles.input}
              value={editedProfile.email}
              onChangeText={(text) =>
                setEditedProfile({ ...editedProfile, email: text })
              }
              placeholder="Seu email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Curso</ThemedText>
            <TextInput
              style={styles.input}
              value={editedProfile.curso}
              onChangeText={(text) =>
                setEditedProfile({ ...editedProfile, curso: text })
              }
              placeholder="Seu curso"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Semestre</ThemedText>
            <TextInput
              style={styles.input}
              value={editedProfile.semestre.toString()}
              onChangeText={(text) =>
                setEditedProfile({
                  ...editedProfile,
                  semestre: parseInt(text) || 0,
                })
              }
              placeholder="Seu semestre"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>
              Interesses (separados por vírgula)
            </ThemedText>
            <TextInput
              style={styles.input}
              value={editedProfile.interesses.join(', ')}
              onChangeText={(text) =>
                setEditedProfile({
                  ...editedProfile,
                  interesses: text.split(',').map((i) => i.trim()),
                })
              }
              placeholder="Seus interesses"
              placeholderTextColor="#999"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>
                Salvar Alterações
              </ThemedText>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#005BB5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 24,
    color: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: '#005BB5',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
