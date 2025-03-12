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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL;
if (!API_URL) {
  throw new Error(
    'A API_URL deve ser configurada no seu Expo (em app.json ou app.config.js)',
  );
}

interface UserProfile {
  id: string;
  name: string;
}

interface Group {
  id: number;
  nome: string;
  descricao: string;
  curso: string;
  semestre: number;
  interesses: string[];
  criador_id: string;
  criado_em: string;
  status: string;
  notas: string | null;
}

interface Connection {
  conexaoId: string;
  id: string;
  name: string;
  curso: string;
  semestre: number;
  interesses: string[];
}

interface Event {
  id: number;
  nome: string;
  descricao: string;
  data: string;
  curso: string;
  limite_participantes: number;
  localizacao: string;
  observacoes_adicionais: string;
  criador_id: string;
  evento_participantes: { usuario_id: string }[];
  total_participantes: number;
}

type NavItem = {
  id: 'groups' | 'connections' | 'events';
  label: string;
  icon: 'people-outline' | 'person-add-outline' | 'calendar-outline';
};

const navItems: NavItem[] = [
  { id: 'groups', label: 'Grupos', icon: 'people-outline' },
  { id: 'connections', label: 'Conexões', icon: 'person-add-outline' },
  { id: 'events', label: 'Eventos', icon: 'calendar-outline' },
];

export default function DashboardScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [activeSection, setActiveSection] = useState<
    'groups' | 'connections' | 'events'
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
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      } else {
        setGroups([]);
      }
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
      if (response.ok) {
        const data = await response.json();
        setConnections(data);
      } else {
        setConnections([]);
      }
    } catch (error) {
      console.error('Erro ao buscar conexões:', error);
      setConnections([]);
    }
  };

  const fetchEvents = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/api/eventos`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      setEvents([]);
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
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    }
  };

  useEffect(() => {
    async function loadData() {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/');
        return;
      }
      await fetchProfile(token);
      await Promise.all([
        fetchGroups(token),
        fetchConnections(token, profile?.id || ''),
        fetchEvents(token),
      ]);
      setLoading(false);
    }
    loadData();
  }, [profile?.id]);

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

  const renderSidebarItems = () => {
    return navItems.map((item) => {
      const isActive = activeSection === item.id;
      return (
        <TouchableOpacity
          key={item.id}
          style={[styles.navItem, isActive && styles.activeNavItem]}
          onPress={() => setActiveSection(item.id)}
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
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'groups':
        return (
          <>
            <ThemedText type="title" style={styles.sectionTitle}>
              Grupos de Estudo
            </ThemedText>
            {groups.map((group) => (
              <View key={group.id} style={styles.itemCard}>
                <ThemedText type="defaultSemiBold" style={styles.itemTitle}>
                  {group.nome}
                </ThemedText>
                <ThemedText style={styles.itemDescription}>
                  {group.descricao}
                </ThemedText>
              </View>
            ))}
          </>
        );
      case 'connections':
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
      case 'events':
        return (
          <>
            <ThemedText type="title" style={styles.sectionTitle}>
              Eventos Inscritos
            </ThemedText>
            {events.map((event) => (
              <View key={event.id} style={styles.itemCard}>
                <ThemedText type="defaultSemiBold" style={styles.itemTitle}>
                  {event.nome}
                </ThemedText>
                <ThemedText style={styles.itemDescription}>
                  {event.descricao}
                </ThemedText>
                <ThemedText style={styles.itemDescription}>
                  Data: {new Date(event.data).toLocaleDateString()}
                </ThemedText>
              </View>
            ))}
          </>
        );
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
              <ThemedText type="title" style={styles.headerText}>
                Bem-vindo, {profile.name}!
              </ThemedText>
            </View>
            <ScrollView contentContainerStyle={styles.mainScroll}>
              {renderContent()}
            </ScrollView>
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
  mainContent: { flex: 1, padding: 20 },
  mainHeader: { marginBottom: 20 },
  headerText: { fontSize: 28, color: '#fff', textAlign: 'center' },
  mainScroll: { paddingBottom: 20 },
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
