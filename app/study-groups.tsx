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
  SafeAreaView,
  Dimensions,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL;
const { width } = Dimensions.get('window');

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
  createdAt: string;
  participants: Participant[];
  tags: string[];
}

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'member';
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface CreateGroupForm {
  name: string;
  subject: string;
  description: string;
  maxParticipants: string;
  department: string;
  schedule: string;
  location: string;
  requirements: string[];
  tags: string[];
}

export default function StudyGroups() {
  const router = useRouter();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningGroup, setJoiningGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'myGroups'>('all');
  const [user, setUser] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGroupDetails, setShowGroupDetails] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [createForm, setCreateForm] = useState<CreateGroupForm>({
    name: '',
    subject: '',
    description: '',
    maxParticipants: '',
    department: '',
    schedule: '',
    location: '',
    requirements: [],
    tags: [],
  });
  const [newRequirement, setNewRequirement] = useState('');
  const [newTag, setNewTag] = useState('');

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
      const response = await fetch(`${API_URL}/study-groups`, {
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
      const response = await fetch(`${API_URL}/study-groups/${groupId}/join`, {
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
      const response = await fetch(`${API_URL}/study-groups/${groupId}/leave`, {
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

  const handleCreateGroup = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/study-groups`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...createForm,
          maxParticipants: parseInt(createForm.maxParticipants),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create group');
      }

      Alert.alert('Success', 'Study group created successfully');
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        subject: '',
        description: '',
        maxParticipants: '',
        department: '',
        schedule: '',
        location: '',
        requirements: [],
        tags: [],
      });
      fetchStudyGroups();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create group');
    }
  };

  const handleAddRequirement = () => {
    if (newRequirement.trim()) {
      setCreateForm(prev => ({
        ...prev,
        requirements: [...prev.requirements, newRequirement.trim()],
      }));
      setNewRequirement('');
    }
  };

  const handleRemoveRequirement = (index: number) => {
    setCreateForm(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index),
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      setCreateForm(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (index: number) => {
    setCreateForm(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  };

  const filteredGroups = groups.filter((group: StudyGroup) => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         group.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         group.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (filter === 'myGroups') {
      return matchesSearch && group.participants.some(p => p.id === user?.id);
    }
    
    if (filter === 'active') {
      return matchesSearch && group.status === 'active';
    }
    
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'full':
        return '#FFA000';
      case 'cancelled':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  const renderGroup = ({ item }: { item: StudyGroup }) => (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={() => {
        setSelectedGroup(item);
        setShowGroupDetails(item.id);
      }}
    >
      <View style={styles.groupHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.groupName}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
        <Text style={styles.subject}>{item.subject}</Text>
      </View>
      
      <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      
      {item.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {item.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}
      
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{item.schedule}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{item.location}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="school-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{item.department}</Text>
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
          <View style={styles.participantsRow}>
            <Text style={styles.participants}>
              {item.currentParticipants}/{item.maxParticipants} participants
            </Text>
            <View style={styles.participantAvatars}>
              {item.participants.slice(0, 3).map((participant, index) => (
                <View
                  key={participant.id}
                  style={[
                    styles.participantAvatar,
                    { marginLeft: index > 0 ? -10 : 0 },
                  ]}
                >
                  {participant.avatar ? (
                    <Image
                      source={{ uri: participant.avatar }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {participant.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
              {item.participants.length > 3 && (
                <View style={[styles.participantAvatar, styles.moreParticipants]}>
                  <Text style={styles.moreParticipantsText}>
                    +{item.participants.length - 3}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <Text style={styles.createdAt}>
            Created {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        
        {item.participants.some(p => p.id === user?.id) ? (
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
    </TouchableOpacity>
  );

  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCreateModal(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Study Group</Text>
            <TouchableOpacity
              onPress={() => setShowCreateModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Group Name</Text>
              <TextInput
                style={styles.input}
                value={createForm.name}
                onChangeText={(text) => setCreateForm(prev => ({ ...prev, name: text }))}
                placeholder="Enter group name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Subject</Text>
              <TextInput
                style={styles.input}
                value={createForm.subject}
                onChangeText={(text) => setCreateForm(prev => ({ ...prev, subject: text }))}
                placeholder="Enter subject"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={createForm.description}
                onChangeText={(text) => setCreateForm(prev => ({ ...prev, description: text }))}
                placeholder="Enter description"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Max Participants</Text>
              <TextInput
                style={styles.input}
                value={createForm.maxParticipants}
                onChangeText={(text) => setCreateForm(prev => ({ ...prev, maxParticipants: text }))}
                placeholder="Enter max participants"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Department</Text>
              <TextInput
                style={styles.input}
                value={createForm.department}
                onChangeText={(text) => setCreateForm(prev => ({ ...prev, department: text }))}
                placeholder="Enter department"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Schedule</Text>
              <TextInput
                style={styles.input}
                value={createForm.schedule}
                onChangeText={(text) => setCreateForm(prev => ({ ...prev, schedule: text }))}
                placeholder="Enter schedule"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={createForm.location}
                onChangeText={(text) => setCreateForm(prev => ({ ...prev, location: text }))}
                placeholder="Enter location"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Requirements</Text>
              <View style={styles.requirementsInputContainer}>
                <TextInput
                  style={styles.requirementsInput}
                  value={newRequirement}
                  onChangeText={setNewRequirement}
                  placeholder="Add requirement"
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddRequirement}
                >
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.requirementsList}>
                {createForm.requirements.map((req, index) => (
                  <View key={index} style={styles.requirementItem}>
                    <Text style={styles.requirementItemText}>{req}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveRequirement(index)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="close-circle" size={20} color="#ff3b30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tags</Text>
              <View style={styles.tagsInputContainer}>
                <TextInput
                  style={styles.tagsInput}
                  value={newTag}
                  onChangeText={setNewTag}
                  placeholder="Add tag"
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddTag}
                >
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.tagsList}>
                {createForm.tags.map((tag, index) => (
                  <View key={index} style={styles.tagItem}>
                    <Text style={styles.tagItemText}>#{tag}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveTag(index)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="close-circle" size={20} color="#ff3b30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowCreateModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateGroup}
            >
              <Text style={styles.createButtonText}>Create Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderGroupDetailsModal = () => (
    <Modal
      visible={!!showGroupDetails}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowGroupDetails(null)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {selectedGroup && (
            <>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedGroup.name}</Text>
                <TouchableOpacity
                  onPress={() => setShowGroupDetails(null)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsTitle}>Subject</Text>
                  <Text style={styles.detailsText}>{selectedGroup.subject}</Text>
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsTitle}>Description</Text>
                  <Text style={styles.detailsText}>{selectedGroup.description}</Text>
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsTitle}>Schedule</Text>
                  <Text style={styles.detailsText}>{selectedGroup.schedule}</Text>
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsTitle}>Location</Text>
                  <Text style={styles.detailsText}>{selectedGroup.location}</Text>
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsTitle}>Department</Text>
                  <Text style={styles.detailsText}>{selectedGroup.department}</Text>
                </View>

                {selectedGroup.requirements.length > 0 && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsTitle}>Requirements</Text>
                    {selectedGroup.requirements.map((req, index) => (
                      <Text key={index} style={styles.detailsText}>• {req}</Text>
                    ))}
                  </View>
                )}

                {selectedGroup.tags.length > 0 && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsTitle}>Tags</Text>
                    <View style={styles.tagsContainer}>
                      {selectedGroup.tags.map((tag, index) => (
                        <View key={index} style={styles.tag}>
                          <Text style={styles.tagText}>#{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsTitle}>Participants</Text>
                  {selectedGroup.participants.map((participant) => (
                    <View key={participant.id} style={styles.participantItem}>
                      {participant.avatar ? (
                        <Image
                          source={{ uri: participant.avatar }}
                          style={styles.participantAvatar}
                        />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Text style={styles.avatarText}>
                            {participant.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.participantInfo}>
                        <Text style={styles.participantName}>{participant.name}</Text>
                        <Text style={styles.participantRole}>
                          {participant.role.charAt(0).toUpperCase() + participant.role.slice(1)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                {selectedGroup.participants.some(p => p.id === user?.id) ? (
                  <TouchableOpacity
                    style={styles.leaveButton}
                    onPress={() => {
                      handleLeaveGroup(selectedGroup.id);
                      setShowGroupDetails(null);
                    }}
                  >
                    <Text style={styles.leaveButtonText}>Leave Group</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.joinButton,
                      selectedGroup.status !== 'active' && styles.joinButtonDisabled,
                    ]}
                    onPress={() => {
                      handleJoinGroup(selectedGroup.id);
                      setShowGroupDetails(null);
                    }}
                    disabled={selectedGroup.status !== 'active' || joiningGroup === selectedGroup.id}
                  >
                    {joiningGroup === selectedGroup.id ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.joinButtonText}>
                        {selectedGroup.status === 'active' ? 'Join Group' : 'Group is Full'}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient colors={['#005BB5', '#007AFF']} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>
            Study Groups
          </ThemedText>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search groups..."
                placeholderTextColor="#666"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
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
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="book-outline" size={48} color="#666" />
                <Text style={styles.emptyText}>No study groups found</Text>
              </View>
            }
          />
        </View>
      </LinearGradient>

      {renderCreateModal()}
      {renderGroupDetailsModal()}
    </SafeAreaView>
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
    justifyContent: 'space-between',
    padding: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  createButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterButton: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
  },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupHeader: {
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subject: {
    fontSize: 16,
    color: '#666',
  },
  description: {
    fontSize: 14,
    color: '#333',
    marginBottom: 16,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#666',
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
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  requirementText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginBottom: 4,
  },
  participantsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantsInfo: {
    flex: 1,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  participants: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  participantAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  moreParticipants: {
    backgroundColor: '#007AFF',
  },
  moreParticipantsText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  createdAt: {
    fontSize: 12,
    color: '#999',
  },
  joinButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
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
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  leaveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  requirementsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requirementsInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requirementsList: {
    marginTop: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  requirementItemText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  removeButton: {
    padding: 4,
  },
  tagsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagsInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    marginRight: 8,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  tagItemText: {
    fontSize: 14,
    color: '#333',
    marginRight: 4,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  createButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  detailsSection: {
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  participantInfo: {
    marginLeft: 12,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  participantRole: {
    fontSize: 12,
    color: '#666',
  },
}); 