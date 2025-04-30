import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL;

interface Course {
  id: number;
  title: string;
}

export default function CoursesScreen() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [buttonScale] = useState(new Animated.Value(1));  // Para animação de botão
  const router = useRouter();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/courses`);
      const data: Course[] = await response.json();
      setCourses(data);
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Erro desconhecido');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'O título do curso é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const method = editingId ? 'PUT' : 'POST';
      const endpoint = editingId
        ? `${API_URL}/api/courses/${editingId}`
        : `${API_URL}/api/courses`;

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) throw new Error('Erro ao salvar curso');

      setTitle('');
      setEditingId(null);
      fetchCourses();
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Erro desconhecido');
    }
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`${API_URL}/api/courses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCourses();
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Erro desconhecido');
    }
    setLoading(false);
  };

  const handleButtonPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 1.1, // Aumenta o tamanho do botão
      friction: 3,
      tension: 100,
      useNativeDriver: true, // Adicionando useNativeDriver
    }).start();
  };
  
  const handleButtonPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1, // Retorna ao tamanho original
      friction: 3,
      tension: 100,
      useNativeDriver: true, // Adicionando useNativeDriver
    }).start();
  };
  

  return (
    <LinearGradient colors={['#005BB5', '#007AFF']} style={styles.container}>
      <Text style={styles.title}>Gerenciar Cursos</Text>

      <View style={styles.addCourseContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nome do Curso"
          placeholderTextColor="#aaa"
          value={title}
          onChangeText={setTitle}
        />

        <Animated.View
          style={[
            styles.button,
            { transform: [{ scale: buttonScale }] },
            loading && { opacity: 0.6 },
          ]}
        >
          <TouchableOpacity
            onPressIn={handleButtonPressIn}
            onPressOut={handleButtonPressOut}
            style={styles.buttonContent}
            onPress={handleSave}
            disabled={loading}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>
              {editingId ? 'Atualizar Curso' : 'Adicionar Curso'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {loading && <ActivityIndicator size="large" color="#fff" style={{ marginVertical: 10 }} />}

      <FlatList
        data={courses}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={styles.courseItem}>
            <Text style={styles.courseText}>{item.title}</Text>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => { setTitle(item.title); setEditingId(item.id); }}>
                <Ionicons name="create-outline" size={22} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ marginLeft: 15 }}>
                <Ionicons name="trash-outline" size={22} color="red" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
  },
  addCourseContainer: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#005BB5',
    marginBottom: 20,
    width: '160%',
    maxWidth: 600,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  input: {
    height: 55,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 18,
    marginBottom: 12,
    color: '#333',
    width: '100%',
  },
  button: {
    backgroundColor: '#005BB5',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    width: '100%',
  },
  buttonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  courseItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  courseText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
