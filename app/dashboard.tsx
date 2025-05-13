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

type NavItem = {
  id: 'groups' | 'connections' | 'events' | 'chat' | 'profile';
  label: string;
  icon:
    | 'people-outline'
    | 'person-add-outline'
    | 'calendar-outline'
    | 'person-outline'
    | 'chatbubble-outline';
};

const navItems: NavItem[] = [
  { id: 'groups', label: 'Grupos', icon: 'people-outline' },
  { id: 'connections', label: 'Conexões', icon: 'person-add-outline' },
  { id: 'events', label: 'Eventos', icon: 'calendar-outline' },
  { id: 'chat', label: 'Torpedo', icon: 'chatbubble-outline' },
  { id: 'profile', label: 'Perfil', icon: 'person-outline' },
];

export default function DashboardScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [activeSection, setActiveSection] = useState<
    'groups' | 'connections' | 'events' | 'chat' | 'profile'
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

  const handleRefresh = async () => {
    const token = await AsyncStorage.getItem('token');
    const userId = await AsyncStorage.getItem('userId');
    if (token && userId) {
      await fetchConnections(token, userId);
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
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'groups':
        return <GroupsSection groups={groups} />;
      case 'connections':
        return <ConnectionsSection onRefresh={handleRefresh} />;
      case 'events':
        return <EventsSection events={events} />;
      case 'chat':
        return <ChatSection />;
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
