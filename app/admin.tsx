import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdminScreen() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const isAdmin = await AsyncStorage.getItem('is_admin');
      if (isAdmin !== 'true') {
        Alert.alert('Acesso Negado', 'Somente administradores podem acessar esta tela.');
        router.replace('/dashboard'); // Redireciona para o dashboard se não for admin
      } else {
        setIsAdmin(true);
        setLoading(false);
      }
    };
    checkAdmin();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Painel de Administração</Text>

      {/* Botão para Gerenciar Usuários */}
      <TouchableOpacity
        style={styles.button}
        // onPress={() => router.push('/manage-users')} // Rota para gerenciar usuários
      >
        <Text style={styles.buttonText}>Gerenciar Usuários</Text>
      </TouchableOpacity>

      {/* Botão para Gerenciar Cursos */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/course')} // Rota para a tela de cursos
      >
        <Text style={styles.buttonText}>Gerenciar Cursos</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});