import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

interface StudyGroup {
  id: string;
  name: string;
  subject: string;
  description: string;
  maxParticipants: number;
  currentParticipants: number;
  createdBy: string;
  department: string;
  schedule: string;
  location: string;
  requirements: string[];
  status: 'active' | 'full' | 'cancelled';
}

export default function StudyGroups() {
  const router = useRouter();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningGroup, setJoiningGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'myGroups'>('all');
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    loadUserData();
    fetchStudyGroups();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const fetchStudyGroups = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch('YOUR_BACKEND_URL/study-groups', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch study groups');
      }

      const data = await response.json();
      setGroups(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load study groups');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    setJoiningGroup(groupId);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`YOUR_BACKEND_URL/study-groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to join group');
      }

      Alert.alert('Success', 'Successfully joined the study group');
      fetchStudyGroups();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to join group');
    } finally {
      setJoiningGroup(null);
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`YOUR_BACKEND_URL/study-groups/${groupId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to leave group');
      }

      Alert.alert('Success', 'Successfully left the study group');
      fetchStudyGroups();
    } catch (error) {
      Alert.alert('Error', 'Failed to leave group');
    }
  };

  const filteredGroups = groups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         group.subject.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === 'myGroups') {
      return matchesSearch && group.currentParticipants > 0;
    }
    
    if (filter === 'active') {
      return matchesSearch && group.status === 'active';
    }
    
    return matchesSearch;
  });

  const renderGroup = ({ item }: { item: StudyGroup }) => (
    <View style={styles.groupCard}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupName}>{item.name}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <Text style={styles.subject}>{item.subject}</Text>
      <Text style={styles.description}>{item.description}</Text>
      
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{item.schedule}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{item.location}</Text>
        </View>
      </View>

      {item.requirements && item.requirements.length > 0 && (
        <View style={styles.requirementsContainer}>
          <Text style={styles.requirementsTitle}>Requirements:</Text>
          {item.requirements.map((req, index) => (
            <Text key={index} style={styles.requirementText}>• {req}</Text>
          ))}
        </View>
      )}

      <View style={styles.participantsContainer}>
        <View style={styles.participantsInfo}>
          <Text style={styles.participants}>
            {item.currentParticipants}/{item.maxParticipants} participants
          </Text>
          <Text style={styles.department}>{item.department}</Text>
        </View>
        
        {item.currentParticipants > 0 ? (
          <TouchableOpacity
            style={styles.leaveButton}
            onPress={() => handleLeaveGroup(item.id)}
          >
            <Text style={styles.leaveButtonText}>Leave</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.joinButton,
              item.status !== 'active' && styles.joinButtonDisabled,
            ]}
            onPress={() => handleJoinGroup(item.id)}
            disabled={item.status !== 'active' || joiningGroup === item.id}
          >
            {joiningGroup === item.id ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.joinButtonText}>
                {item.status === 'active' ? 'Join' : 'Full'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search groups..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'active' && styles.filterButtonActive]}
            onPress={() => setFilter('active')}
          >
            <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'myGroups' && styles.filterButtonActive]}
            onPress={() => setFilter('myGroups')}
          >
            <Text style={[styles.filterText, filter === 'myGroups' && styles.filterTextActive]}>
              My Groups
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredGroups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchStudyGroups();
            }}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterButton: {
    flex: 1,
    padding: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    color: '#666',
    fontSize: 14,
  },
  filterTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
  },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    backgroundColor: '#e1f5fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  subject: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#333',
    marginBottom: 16,
  },
  detailsContainer: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  requirementsContainer: {
    marginBottom: 16,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  requirementText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  participantsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantsInfo: {
    flex: 1,
  },
  participants: {
    fontSize: 14,
    color: '#666',
  },
  department: {
    fontSize: 12,
    color: '#999',
  },
  joinButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  joinButtonDisabled: {
    backgroundColor: '#ccc',
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  leaveButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  leaveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
}); 