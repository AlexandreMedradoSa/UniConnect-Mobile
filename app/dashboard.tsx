import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  View,
  ActivityIndicator,
  Animated,
  Easing,
  TextInput,
  FlatList,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '../components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { GroupsSection } from '../components/dashboard/GroupsSection';
import { ConnectionsSection } from '../components/dashboard/ConnectionsSection';
import { EventsSection } from '../components/dashboard/EventsSection';
import { ChatSection } from '../components/dashboard/ChatSection';
import type { Group, Connection, Event } from '../types/dashboard.types';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  curso: string | null;
  semestre: number | null;
  interesses: string[] | null;
}

const API_URL = Constants.expoConfig?.extra?.API_URL;
if (!API_URL) {
  throw new Error(
    'A API_URL deve ser configurada no seu Expo (em app.json ou app.config.js)',
  );
}

type Course = {
  id: number;
  title: string;
};

type NavItem = {
  id: 'groups' | 'connections' | 'events' | 'chat' | 'profile' | 'studyGroups';
  label: string;
  icon:
    | 'people-outline'
    | 'person-add-outline'
    | 'calendar-outline'
    | 'book-outline'
    | 'person-outline'
    | 'chatbubble-outline';
};

const navItems: NavItem[] = [
  { id: 'groups', label: 'Grupos', icon: 'people-outline' },
  { id: 'connections', label: 'Conexões', icon: 'person-add-outline' },
  { id: 'events', label: 'Eventos', icon: 'calendar-outline' },
  { id: 'chat', label: 'Torpedo', icon: 'chatbubble-outline' },
  { id: 'studyGroups', label: 'Grupos de Estudo', icon: 'book-outline' },
  { id: 'profile', label: 'Perfil', icon: 'person-outline' },
];

export default function DashboardScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseTitle, setCourseTitle] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const [activeSection, setActiveSection] = useState<
    'groups' | 'connections' | 'events' | 'chat' | 'profile' | 'studyGroups'
  >('groups');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarWidth = useRef(new Animated.Value(65)).current;

  const textOpacity = sidebarWidth.interpolate({
    inputRange: [65, 160],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const toggleSidebar = () => {
    Animated.timing(sidebarWidth, {
      toValue: isSidebarOpen ? 65 : 160,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start(() => {
      setIsSidebarOpen(!isSidebarOpen);
    });
  };

  const fetchGroups = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/api/grupos`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      setGroups(response.ok ? await response.json() : []);
    } catch (error) {
      console.error('Erro ao buscar grupos:', error);
      setGroups([]);
    }
  };

  const fetchConnections = async (token: string, userId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/users/${userId}/conexoes`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      setConnections(response.ok ? await response.json() : []);
    } catch (error) {
      console.error('Erro ao buscar conexões:', error);
      setConnections([]);
    }
  };

  const fetchCourses = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/api/admins`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCourses(await response.json());
    } catch (error) {
      console.error('Erro ao buscar cursos:', error);
    }
  };

  const fetchProfile = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/api/profile`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      setProfile(response.ok ? await response.json() : null);
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    }
  };

  const handleSaveCourse = async () => {
    if (!courseTitle.trim()) return;
    try {
      const token = await AsyncStorage.getItem('token');
      const method = editingId ? 'PUT' : 'POST';
      const endpoint = editingId
        ? `${API_URL}/api/courses/${editingId}`
        : `${API_URL}/api/courses`;

      await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: courseTitle }),
      });

      setCourseTitle('');
      setEditingId(null);
      await fetchCourses(token || '');
    } catch (error) {
      console.error('Erro ao salvar curso:', error);
    }
  };

  const handleDeleteCourse = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`${API_URL}/api/courses/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      await fetchCourses(token || '');
    } catch (error) {
      console.error('Erro ao excluir curso:', error);
    }
  };

  const handleRefresh = async () => {
    const token = await AsyncStorage.getItem('token');
    const userId = await AsyncStorage.getItem('userId');
    if (token && userId) {
      await fetchConnections(token, userId);
    }
  };

  useEffect(() => {
    async function loadProfile() {
      const token = await AsyncStorage.getItem('token');
      if (!token) return router.replace('/');
      await fetchProfile(token);

      await Promise.all([
        fetchGroups(token),
        fetchConnections(token, profile?.id || ''),
        fetchCourses(token),
      ]);

      setLoading(false);
    }
    loadProfile();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ThemedText>Erro ao carregar perfil. Tente novamente.</ThemedText>
      </SafeAreaView>
    );
  }

  const renderSidebarItems = () =>
    navItems.map((item) => {
      const isActive = activeSection === item.id;
      return (
        <TouchableOpacity
          key={item.id}
          style={[styles.navItem, isActive && styles.activeNavItem]}
          onPress={() => {
            if (item.id === 'profile') {
              router.push('/profile');
            } else {
              setActiveSection(item.id);
            }
          }}
        >
          <Ionicons
            name={item.icon}
            size={24}
            color={isActive ? '#005BB5' : '#fff'}
          />
          {isSidebarOpen && (
            <Animated.Text
              style={[
                styles.navText,
                { opacity: textOpacity },
                isActive && styles.activeNavText,
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Animated.Text>
          )}
        </TouchableOpacity>
      );
    });

  const CoursesSection = () => (
    <View>
      <ThemedText type="title" style={{ color: '#fff', marginBottom: 10 }}>
        Gerenciar Cursos
      </ThemedText>
      <TextInput
        style={{
          height: 50,
          backgroundColor: '#fff',
          borderRadius: 8,
          paddingHorizontal: 12,
          marginBottom: 10,
        }}
        placeholder="Nome do Curso"
        value={courseTitle}
        onChangeText={setCourseTitle}
      />
      <TouchableOpacity
        style={{
          backgroundColor: '#007AFF',
          padding: 15,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 20,
        }}
        onPress={handleSaveCourse}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>
          {editingId ? 'Atualizar' : 'Adicionar'}
        </Text>
      </TouchableOpacity>
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: '#fff',
              padding: 12,
              borderRadius: 8,
              marginBottom: 10,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16 }}>{item.title}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  setCourseTitle(item.title);
                  setEditingId(item.id);
                }}
              >
                <Text style={{ color: '#007AFF' }}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteCourse(item.id)}>
                <Text style={{ color: 'red' }}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'groups':
        return <GroupsSection groups={groups} />;
      case 'connections':
        return <ConnectionsSection onRefresh={handleRefresh} />;
      case 'events':
        return <EventsSection />;
      case 'chat':
        return <ChatSection />;
      case 'studyGroups':
        router.push('/study-groups');
        return null;
      case 'profile':
        return null;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient colors={['#005BB5', '#007AFF']} style={styles.container}>
        <View style={styles.dashboardContainer}>
          <Animated.View style={[styles.sidebar, { width: sidebarWidth }]}>
            <TouchableOpacity
              onPress={toggleSidebar}
              style={styles.toggleButton}
            >
              <Ionicons
                name={isSidebarOpen ? 'chevron-back' : 'chevron-forward'}
                size={24}
                color="#007AFF"
              />
            </TouchableOpacity>
            {renderSidebarItems()}
          </Animated.View>
          <View style={styles.mainContent}>
            <View style={styles.mainHeader}>
              {/* Cabeçalho removido conforme solicitado */}
            </View>
            <View style={styles.mainContent}>{renderContent()}</View>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#005BB5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: { flex: 1 },
  dashboardContainer: { flex: 1, flexDirection: 'row' },
  sidebar: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  toggleButton: {
    marginBottom: 20,
    alignSelf: 'center',
    padding: 5,
    backgroundColor: '#fff',
    borderRadius: 5,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderRadius: 8,
  },
  activeNavItem: {
    backgroundColor: '#fff',
  },
  navText: {
    marginLeft: 10,
    color: '#fff',
    fontSize: 16,
  },
  activeNavText: {
    color: '#005BB5',
  },
  mainContent: {
    flex: 1,
    padding: 10,
  },
  mainHeader: {
    marginBottom: 20,
  },
  headerText: {
    fontSize: 28,
    color: '#fff',
    textAlign: 'center',
  },
});
