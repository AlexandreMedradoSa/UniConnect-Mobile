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
  Image,
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
  description?: string;
  participants?: number;
  interests?: string[];
  isParticipating?: boolean;
}

export default function CoursesScreen() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [buttonScale] = useState(new Animated.Value(1));
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'participating', 'popular'
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
      const token = await AsyncStorage.getItem('token');
      const endpoint = filter === 'popular' 
        ? `${API_URL}/api/cursos/populares`
        : `${API_URL}/api/cursos`;
      
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
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
        ? `${API_URL}/api/cursos/${editingId}`
        : `${API_URL}/api/cursos`;
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          title,
          description,
          interests: selectedInterests,
        }),
      });
      
      if (!response.ok) throw new Error('Erro ao salvar curso');
      
      setTitle('');
      setDescription('');
      setSelectedInterests([]);
      setEditingId(null);
      setShowForm(false);
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
      await fetch(`${API_URL}/api/cursos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCourses();
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Erro desconhecido');
    }
    setLoading(false);
  };

  const handleParticipate = async (courseId: number) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/cursos/${courseId}/participar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Erro ao participar do curso');
      
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

  const renderCourseCard = ({ item }: { item: Course }) => (
    <Animated.View style={[styles.courseCard, { transform: [{ scale: buttonScale }] }]}>
      <View style={styles.courseHeader}>
        <Text style={styles.courseTitle}>{item.title}</Text>
        <View style={styles.courseActions}>
          <TouchableOpacity 
            onPress={() => { 
              setTitle(item.title); 
              setDescription(item.description || '');
              setEditingId(item.id); 
              setShowForm(true);
            }}
          >
            <Ionicons name="create-outline" size={22} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ marginLeft: 15 }}>
            <Ionicons name="trash-outline" size={22} color="red" />
          </TouchableOpacity>
        </View>
      </View>
      
      {item.description && (
        <Text style={styles.courseDescription}>{item.description}</Text>
      )}
      
      <View style={styles.courseFooter}>
        <View style={styles.courseStats}>
          <Ionicons name="people-outline" size={16} color="#666" />
          <Text style={styles.courseStatsText}>{item.participants || 0} participantes</Text>
        </View>
        
        {item.interests && item.interests.length > 0 && (
          <View style={styles.interestsContainer}>
            {item.interests.map((interest, index) => (
              <View key={index} style={styles.interestTag}>
                <Text style={styles.interestText}>{interest}</Text>
              </View>
            ))}
          </View>
        )}
        
        <TouchableOpacity
          style={[
            styles.participateButton,
            item.isParticipating && styles.participatingButton
          ]}
          onPress={() => handleParticipate(item.id)}
        >
          <Text style={styles.participateButtonText}>
            {item.isParticipating ? 'Participando' : 'Participar'}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <LinearGradient colors={['#003f7f', '#005BB5']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Gerenciar Cursos</Text>
          
          <View style={styles.filterContainer}>
            <TouchableOpacity 
              style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
              onPress={() => setFilter('all')}
            >
              <Text style={styles.filterText}>Todos</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterButton, filter === 'participating' && styles.activeFilter]}
              onPress={() => setFilter('participating')}
            >
              <Text style={styles.filterText}>Participando</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterButton, filter === 'popular' && styles.activeFilter]}
              onPress={() => setFilter('popular')}
            >
              <Text style={styles.filterText}>Populares</Text>
            </TouchableOpacity>
          </View>

          {showForm && (
            <View style={styles.formCard}>
              <Text style={styles.label}>Nome do Curso</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite o nome do curso"
                placeholderTextColor="#aaa"
                value={title}
                onChangeText={setTitle}
              />
              
              <Text style={styles.label}>Descrição</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Digite a descrição do curso"
                placeholderTextColor="#aaa"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
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
          )}

          {!showForm && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowForm(true)}
            >
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text style={styles.addButtonText}>Adicionar Novo Curso</Text>
            </TouchableOpacity>
          )}

          {loading && <ActivityIndicator size="large" color="#fff" style={styles.loading} />}
          
          <View style={styles.listContainer}>
            <FlatList
              data={courses}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              renderItem={renderCourseCard}
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
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    width: '100%',
    maxWidth: 600,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeFilter: {
    backgroundColor: '#fff',
  },
  filterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
  courseDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  courseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  courseStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseStatsText: {
    marginLeft: 5,
    color: '#666',
    fontSize: 12,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  interestTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 5,
    marginBottom: 5,
  },
  interestText: {
    color: '#1976D2',
    fontSize: 12,
  },
  participateButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  participatingButton: {
    backgroundColor: '#4CAF50',
  },
  participateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
    maxWidth: 600,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
});
