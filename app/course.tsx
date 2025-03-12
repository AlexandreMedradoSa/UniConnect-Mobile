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
} from 'react-native';
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
  const router = useRouter();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/admins`);
      const data: Course[] = await response.json();
      setCourses(data);
    } catch (error) {
      
      if (error instanceof Error) {
        Alert.alert('Erro', error.message);
      } else {
        Alert.alert('Erro', 'Erro desconhecido');
      }
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
      const endpoint = editingId ? `${API_URL}/api/courses/${editingId}` : `${API_URL}/api/courses`;

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
      
      if (error instanceof Error) {
        Alert.alert('Erro', error.message);
      } else {
        Alert.alert('Erro', 'Erro desconhecido');
      }
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
    
      if (error instanceof Error) {
        Alert.alert('Erro', error.message);
      } else {
        Alert.alert('Erro', 'Erro desconhecido');
      }
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gerenciar Cursos</Text>
      <TextInput
        style={styles.input}
        placeholder="Nome do Curso"
        value={title}
        onChangeText={setTitle}
      />
      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
        <Text style={styles.buttonText}>{editingId ? 'Atualizar' : 'Adicionar'}</Text>
      </TouchableOpacity>
      {loading && <ActivityIndicator size="large" color="#007AFF" />}
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id.toString()} // Agora o TypeScript reconhece 'id'
        renderItem={({ item }) => (
          <View style={styles.courseItem}>
            <Text style={styles.courseText}>{item.title}</Text>
            <TouchableOpacity onPress={() => { setTitle(item.title); setEditingId(item.id); }}>
              <Text style={styles.editButton}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Text style={styles.deleteButton}>Excluir</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { height: 50, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 10, marginBottom: 10 },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  courseItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#ddd' },
  courseText: { fontSize: 18 },
  editButton: { color: '#007AFF', marginRight: 10 },
  deleteButton: { color: 'red' },
});
