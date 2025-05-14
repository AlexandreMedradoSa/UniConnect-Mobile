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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
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
  const [buttonScale] = useState(new Animated.Value(1));
  const router = useRouter();
  const screenHeight = Dimensions.get('window').height;

  useEffect(() => {
    checkAdminAccess();
    fetchCourses();
  }, []);

  const checkAdminAccess = async () => {
    const token = await AsyncStorage.getItem('token');
    const userData = await AsyncStorage.getItem('user');
    if (!userData || !token) {
      router.replace('/onboarding');
      return;
    }
    const user = JSON.parse(userData);
    if (user.role !== 'admin') {
      router.replace('/onboarding');
    }
  };

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
      toValue: 1.1,
      friction: 3,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handleButtonPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 3,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <LinearGradient colors={['#003f7f', '#005BB5']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Gerenciar Cursos</Text>
          <View style={styles.formCard}>
            <Text style={styles.label}>Nome do Curso</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite o nome do curso"
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
                <Ionicons name={editingId ? 'refresh-circle' : 'add-circle'} size={22} color="#fff" />
                <Text style={styles.buttonText}>
                  {editingId ? 'Atualizar Curso' : 'Adicionar Curso'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
          {loading && <ActivityIndicator size="large" color="#fff" style={styles.loading} />}
          <View style={styles.listContainer}>
            <FlatList
              data={courses}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.courseCard}>
                  <Text style={styles.courseTitle}>{item.title}</Text>
                  <View style={styles.courseActions}>
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: '#007AFF',
    marginBottom: 30,
    width: '100%',
    maxWidth: 600,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  label: {
    fontSize: 16,
    color: '#444',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  input: {
    height: 55,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 17,
    marginBottom: 16,
    color: '#333',
    width: '100%',
  },
  button: {
    backgroundColor: '#005BB5',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
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
    fontWeight: '600',
    marginLeft: 10,
  },
  loading: {
    marginVertical: 20,
  },
  listContainer: {
    width: '100%',
    maxWidth: 600,
  },
  courseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  courseTitle: {
    fontSize: 17,
    color: '#333',
    flex: 1,
    marginRight: 15,
  },
  courseActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
