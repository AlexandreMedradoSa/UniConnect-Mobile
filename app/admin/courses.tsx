import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = Constants.expoConfig?.extra?.API_URL;
if (!API_URL) {
  throw new Error(
    'A API_URL deve ser configurada no seu Expo (em app.json ou app.config.js)',
  );
}

interface Curso {
  id: string;
  nome: string;
  descricao: string;
  area: string;
  nivel: string;
  duracao: string;
  created_at: string;
  updated_at: string;
}

export default function AdminCourses() {
  const router = useRouter();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCurso, setEditingCurso] = useState<Curso | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [newCurso, setNewCurso] = useState({
    nome: '',
    descricao: '',
    area: '',
    nivel: '',
    duracao: '',
  });

  useEffect(() => {
    const loadUserData = async (): Promise<void> => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        setToken(storedToken);

        if (storedToken) {
          // Verificar se o usuário é admin
          const response = await fetch(`${API_URL}/api/admins`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });

          if (response.ok) {
            setIsAdmin(true);
            fetchCursos();
          } else {
            Alert.alert('Erro', 'Você não tem permissão para acessar esta página');
            router.back();
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        setError('Erro ao carregar dados do usuário');
      }
    };
    loadUserData();
  }, []);

  const fetchCursos = async (): Promise<void> => {
    try {
      setLoading(true);

      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/cursos`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar cursos');
      }

      const data = await response.json();
      setCursos(data.data);
    } catch (err) {
      console.error('Erro ao buscar cursos:', err);
      setError('Erro ao carregar cursos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateCurso = async (): Promise<void> => {
    if (!newCurso.nome || !newCurso.descricao || !newCurso.area) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/cursos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newCurso),
      });

      if (!response.ok) throw new Error('Erro ao criar curso');

      Alert.alert('Sucesso', 'Curso criado com sucesso!');
      setIsCreating(false);
      setNewCurso({
        nome: '',
        descricao: '',
        area: '',
        nivel: '',
        duracao: '',
      });
      fetchCursos();
    } catch (err) {
      Alert.alert('Erro', 'Erro ao criar curso');
    }
  };

  const handleUpdateCurso = async (): Promise<void> => {
    if (!editingCurso) return;

    try {
      const response = await fetch(
        `${API_URL}/api/cursos/${editingCurso.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editingCurso),
        },
      );

      if (!response.ok) throw new Error('Erro ao atualizar curso');

      Alert.alert('Sucesso', 'Curso atualizado com sucesso!');
      setEditingCurso(null);
      fetchCursos();
    } catch (err) {
      Alert.alert('Erro', 'Erro ao atualizar curso');
    }
  };

  const handleDeleteCurso = async (cursoId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/api/cursos/${cursoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Erro ao excluir curso');

      Alert.alert('Sucesso', 'Curso excluído com sucesso!');
      fetchCursos();
    } catch (err) {
      Alert.alert('Erro', 'Erro ao excluir curso');
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchCursos();
  }, []);

  const renderCurso = ({ item }: { item: Curso }): JSX.Element => (
    <View style={styles.cursoCard}>
      <LinearGradient
        colors={['#005BB5', '#007AFF']}
        style={styles.cursoCardGradient}
      >
        <Text style={styles.cursoTitle}>{item.nome}</Text>
        <Text style={styles.cursoDescription}>{item.descricao}</Text>
        <View style={styles.cursoInfoContainer}>
          <View style={styles.cursoInfoRow}>
            <Ionicons name="book-outline" size={16} color="#fff" />
            <Text style={styles.cursoInfo}>Área: {item.area}</Text>
          </View>
          <View style={styles.cursoInfoRow}>
            <Ionicons name="school-outline" size={16} color="#fff" />
            <Text style={styles.cursoInfo}>Nível: {item.nivel}</Text>
          </View>
          <View style={styles.cursoInfoRow}>
            <Ionicons name="time-outline" size={16} color="#fff" />
            <Text style={styles.cursoInfo}>Duração: {item.duracao}</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.editButton]}
            onPress={() => setEditingCurso(item)}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={() => {
              Alert.alert(
                'Confirmar exclusão',
                'Tem certeza que deseja excluir este curso?',
                [
                  {
                    text: 'Cancelar',
                    style: 'cancel',
                  },
                  {
                    text: 'Excluir',
                    onPress: () => handleDeleteCurso(item.id),
                    style: 'destructive',
                  },
                ],
              );
            }}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Excluir</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#005BB5', '#007AFF']} style={styles.header}>
        <Text style={styles.headerTitle}>Gerenciar Cursos</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setIsCreating(true)}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.createButtonText}>Novo Curso</Text>
        </TouchableOpacity>
      </LinearGradient>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color="#c62828" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={cursos}
        renderItem={renderCurso}
        keyExtractor={(item: Curso) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {isCreating && (
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Criar Novo Curso</Text>
            <ScrollView>
              <TextInput
                style={styles.input}
                placeholder="Nome do Curso"
                placeholderTextColor="#666"
                value={newCurso.nome}
                onChangeText={(text) =>
                  setNewCurso({ ...newCurso, nome: text })
                }
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Descrição"
                placeholderTextColor="#666"
                value={newCurso.descricao}
                onChangeText={(text) =>
                  setNewCurso({ ...newCurso, descricao: text })
                }
                multiline
              />
              <TextInput
                style={styles.input}
                placeholder="Área"
                placeholderTextColor="#666"
                value={newCurso.area}
                onChangeText={(text) =>
                  setNewCurso({ ...newCurso, area: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Nível"
                placeholderTextColor="#666"
                value={newCurso.nivel}
                onChangeText={(text) =>
                  setNewCurso({ ...newCurso, nivel: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Duração"
                placeholderTextColor="#666"
                value={newCurso.duracao}
                onChangeText={(text) =>
                  setNewCurso({ ...newCurso, duracao: text })
                }
              />
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setIsCreating(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleCreateCurso}
              >
                <Text style={styles.buttonText}>Criar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {editingCurso && (
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Curso</Text>
            <ScrollView>
              <TextInput
                style={styles.input}
                placeholder="Nome do Curso"
                value={editingCurso.nome}
                onChangeText={(text) =>
                  setEditingCurso({ ...editingCurso, nome: text })
                }
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Descrição"
                value={editingCurso.descricao}
                onChangeText={(text) =>
                  setEditingCurso({ ...editingCurso, descricao: text })
                }
                multiline
              />
              <TextInput
                style={styles.input}
                placeholder="Área"
                value={editingCurso.area}
                onChangeText={(text) =>
                  setEditingCurso({ ...editingCurso, area: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Nível"
                value={editingCurso.nivel}
                onChangeText={(text) =>
                  setEditingCurso({ ...editingCurso, nivel: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Duração"
                value={editingCurso.duracao}
                onChangeText={(text) =>
                  setEditingCurso({ ...editingCurso, duracao: text })
                }
              />
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setEditingCurso(null)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleUpdateCurso}
              >
                <Text style={styles.buttonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    backgroundColor: '#005BB5',
  },
  header: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontWeight: 'bold',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#c62828',
    marginLeft: 8,
  },
  listContainer: {
    padding: 16,
  },
  cursoCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cursoCardGradient: {
    padding: 16,
  },
  cursoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  cursoDescription: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 12,
    opacity: 0.9,
  },
  cursoInfoContainer: {
    marginBottom: 12,
  },
  cursoInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cursoInfo: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#007AFF',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  saveButton: {
    backgroundColor: '#28a745',
  },
}); 