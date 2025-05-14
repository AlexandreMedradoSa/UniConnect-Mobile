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
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = Constants.expoConfig?.extra?.API_URL;
if (!API_URL) {
  throw new Error(
    'A API_URL deve ser configurada no seu Expo (em app.json ou app.config.js)',
  );
}

interface Evento {
  id: string;
  nome: string;
  descricao: string;
  criador_id: string;
  data: string;
  curso: string;
  localizacao: string;
  observacoes_adicionais: string;
  limite_participantes?: number;
  total_participantes: number;
  participa?: boolean;
  conexoesParticipando?: string[];
  evento_participantes?: string[];
}

if (!API_URL) {
  throw new Error('A API_URL deve ser configurada no seu expo.');
}

export default function EventosList() {
  const router = useRouter();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [historico, setHistorico] = useState<Evento[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [currentEvento, setCurrentEvento] = useState<Evento | null>(null);
  const [isViewingDetails, setIsViewingDetails] = useState(false);
  const [isViewingParticipants, setIsViewingParticipants] = useState(false);
  const [participantes, setParticipantes] = useState<any[]>([]);
  const [editingEvento, setEditingEvento] = useState<Evento | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newEvento, setNewEvento] = useState({
    nome: '',
    descricao: '',
    data: new Date(),
    curso: '',
    localizacao: '',
    observacoes_adicionais: '',
    limite_participantes: 0,
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const loadUserData = async (): Promise<void> => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        const storedToken = await AsyncStorage.getItem('token');
        setUserId(storedUserId);
        setToken(storedToken);

        if (storedToken) {
          fetchEventos();
          fetchHistorico();
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        setError('Erro ao carregar dados do usuário');
      }
    };
    loadUserData();
  }, []);

  useEffect(() => {
    if (userId && token) {
      fetchEventos();
    }
  }, [userId, token]);

  const fetchEventos = async (): Promise<void> => {
    try {
      setLoading(true);

      if (!userId || !token) {
        setLoading(false);
        return;
      }

      const [eventosResponse, historicoResponse, conexoesResponse] =
        await Promise.all([
          fetch(`${API_URL}/api/eventos`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/eventos/historico`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/users/${userId}/conexoes`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

      if (
        !eventosResponse.ok ||
        !historicoResponse.ok ||
        !conexoesResponse.ok
      ) {
        throw new Error('Erro ao buscar eventos, histórico ou conexões');
      }

      const eventosData = await eventosResponse.json();
      const historicoData = await historicoResponse.json();
      const conexoesData = await conexoesResponse.json();

      const eventosParticipadosIds = historicoData.data.map(
        (evento: Evento) => evento.id,
      );

      const conexoes = conexoesData.data.map((conexao: any) => ({
        id: conexao.id,
        nome: conexao.name,
      }));

      const eventosDisponiveis = eventosData.data.map((evento: Evento) => {
        const participantesIds = (evento.evento_participantes || []).map(
          (participante: any) => participante.usuario_id,
        );

        const conexoesParticipandoNomes = participantesIds
          .filter((id: string) =>
            conexoes.some((conexao: { id: string }) => conexao.id === id),
          )
          .map((id: string) => {
            const conexao = conexoes.find(
              (conexao: { id: string }) => conexao.id === id,
            );
            return conexao ? conexao.nome : id;
          });

        return {
          ...evento,
          participa: eventosParticipadosIds.includes(evento.id),
          conexoesParticipando: conexoesParticipandoNomes,
        };
      });

      setEventos(eventosDisponiveis);
    } catch (err) {
      console.error('Erro ao buscar eventos:', err);
      setError('Erro ao carregar eventos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchHistorico = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/api/eventos/historico`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Erro ao buscar histórico');

      const data = await response.json();
      setHistorico(data);
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
    }
  };

  const handleParticipar = async (eventoId: string): Promise<void> => {
    if (!eventoId) {
      Alert.alert('Erro', 'ID do evento inválido');
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/eventos/${eventoId}/participar`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) throw new Error('Erro ao participar do evento');
      Alert.alert('Sucesso', 'Participação confirmada!');
      fetchEventos();
    } catch (err) {
      Alert.alert('Erro', 'Erro ao participar do evento');
    }
  };

  const handleCancelarParticipacao = async (
    eventoId: string,
  ): Promise<void> => {
    try {
      const response = await fetch(
        `${API_URL}/api/eventos/${eventoId}/participar`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) throw new Error('Erro ao cancelar participação');

      Alert.alert('Sucesso', 'Participação cancelada!');
      fetchEventos();
    } catch (err) {
      Alert.alert('Erro', 'Erro ao cancelar participação');
    }
  };

  const handleCreateEvento = async (): Promise<void> => {
    if (!newEvento.nome || !newEvento.descricao || !newEvento.curso) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/eventos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newEvento,
          data: newEvento.data.toISOString(),
        }),
      });

      if (!response.ok) throw new Error('Erro ao criar evento');

      Alert.alert('Sucesso', 'Evento criado com sucesso!');
      setIsCreating(false);
      setNewEvento({
        nome: '',
        descricao: '',
        data: new Date(),
        curso: '',
        localizacao: '',
        observacoes_adicionais: '',
        limite_participantes: 0,
      });
      fetchEventos();
    } catch (err) {
      Alert.alert('Erro', 'Erro ao criar evento');
    }
  };

  const handleSearch = async (): Promise<void> => {
    if (!search.trim()) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/eventos?nome=${search}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) throw new Error('Erro ao buscar eventos');

      const data = await response.json();
      setEventos(data);
    } catch (err) {
      Alert.alert('Erro', 'Erro ao buscar eventos');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvento = async (eventoId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/api/eventos/${eventoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Erro ao excluir evento');

      Alert.alert('Sucesso', 'Evento excluído com sucesso!');
      fetchEventos();
    } catch (err) {
      Alert.alert('Erro', 'Erro ao excluir evento');
    }
  };

  const handleUpdateEvento = async (): Promise<void> => {
    if (!editingEvento) return;

    try {
      const response = await fetch(
        `${API_URL}/api/eventos/${editingEvento.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...editingEvento,
            data: `${editingEvento.data}T00:00:00`,
          }),
        },
      );
      if (!response.ok) throw new Error('Erro ao atualizar evento');

      Alert.alert('Sucesso', 'Evento atualizado com sucesso!');
      setEditingEvento(null);
      fetchEventos();
    } catch (err) {
      Alert.alert('Erro', 'Erro ao atualizar evento');
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchEventos();
  }, []);

  const renderEvento = ({ item }: { item: Evento }): JSX.Element => (
    <View style={styles.eventoCard}>
      <LinearGradient
        colors={['#005BB5', '#007AFF']}
        style={styles.eventoCardGradient}
      >
        <Text style={styles.eventoTitle}>{item.nome}</Text>
        <Text style={styles.eventoDescription}>{item.descricao}</Text>
        <View style={styles.eventoInfoContainer}>
          <View style={styles.eventoInfoRow}>
            <Ionicons name="calendar-outline" size={16} color="#fff" />
            <Text style={styles.eventoInfo}>
              {new Date(item.data).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.eventoInfoRow}>
            <Ionicons name="school-outline" size={16} color="#fff" />
            <Text style={styles.eventoInfo}>{item.curso}</Text>
          </View>
          <View style={styles.eventoInfoRow}>
            <Ionicons name="people-outline" size={16} color="#fff" />
            <Text style={styles.eventoInfo}>
              {item.total_participantes} / {item.limite_participantes || '∞'}
            </Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          {item.participa ? (
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => handleCancelarParticipacao(item.id)}
            >
              <Ionicons name="close-circle" size={20} color="#fff" />
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.participateButton]}
              onPress={() => handleParticipar(item.id)}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.buttonText}>Participar</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.detailsButton]}
            onPress={() => {
              setCurrentEvento(item);
              setIsViewingDetails(true);
            }}
          >
            <Ionicons name="information-circle" size={20} color="#fff" />
            <Text style={styles.buttonText}>Detalhes</Text>
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
        <Text style={styles.headerTitle}>Eventos Acadêmicos</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setIsCreating(true)}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.createButtonText}>Novo Evento</Text>
        </TouchableOpacity>
      </LinearGradient>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color="#c62828" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar eventos..."
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Ionicons name="search" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={eventos}
        renderItem={renderEvento}
        keyExtractor={(item: Evento) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {isViewingDetails && currentEvento && (
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{currentEvento.nome}</Text>
            <ScrollView>
              <View style={styles.modalInfoContainer}>
                <View style={styles.modalInfoRow}>
                  <Ionicons
                    name="document-text-outline"
                    size={20}
                    color="#007AFF"
                  />
                  <Text style={styles.modalText}>
                    <Text style={styles.modalLabel}>Descrição:</Text>{' '}
                    {currentEvento.descricao}
                  </Text>
                </View>

                <View style={styles.modalInfoRow}>
                  <Ionicons name="calendar-outline" size={20} color="#007AFF" />
                  <Text style={styles.modalText}>
                    <Text style={styles.modalLabel}>Data:</Text>{' '}
                    {new Date(currentEvento.data).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.modalInfoRow}>
                  <Ionicons name="school-outline" size={20} color="#007AFF" />
                  <Text style={styles.modalText}>
                    <Text style={styles.modalLabel}>Curso:</Text>{' '}
                    {currentEvento.curso}
                  </Text>
                </View>

                <View style={styles.modalInfoRow}>
                  <Ionicons name="location-outline" size={20} color="#007AFF" />
                  <Text style={styles.modalText}>
                    <Text style={styles.modalLabel}>Localização:</Text>{' '}
                    {currentEvento.localizacao || 'Não informada'}
                  </Text>
                </View>

                <View style={styles.modalInfoRow}>
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color="#007AFF"
                  />
                  <Text style={styles.modalText}>
                    <Text style={styles.modalLabel}>Observações:</Text>{' '}
                    {currentEvento.observacoes_adicionais || 'Nenhuma'}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.button, styles.closeButton]}
              onPress={() => setIsViewingDetails(false)}
            >
              <Text style={styles.buttonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal de Edição */}
      {editingEvento && (
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Evento</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome do Evento"
              value={editingEvento.nome}
              onChangeText={(text: string) =>
                setEditingEvento({
                  ...editingEvento,
                  nome: text,
                  id: editingEvento.id,
                })
              }
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descrição"
              value={editingEvento.descricao}
              onChangeText={(text: string) =>
                setEditingEvento({
                  ...editingEvento,
                  descricao: text,
                  id: editingEvento.id,
                })
              }
              multiline
            />
            <TextInput
              style={styles.input}
              placeholder="Data (YYYY-MM-DD)"
              value={editingEvento.data}
              onChangeText={(text: string) =>
                setEditingEvento({
                  ...editingEvento,
                  data: text,
                  id: editingEvento.id,
                })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Curso"
              value={editingEvento.curso}
              onChangeText={(text: string) =>
                setEditingEvento({
                  ...editingEvento,
                  curso: text,
                  id: editingEvento.id,
                })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Localização"
              value={editingEvento.localizacao}
              onChangeText={(text: string) =>
                setEditingEvento({
                  ...editingEvento,
                  localizacao: text,
                  id: editingEvento.id,
                })
              }
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Observações Adicionais"
              value={editingEvento.observacoes_adicionais}
              onChangeText={(text: string) =>
                setEditingEvento({
                  ...editingEvento,
                  observacoes_adicionais: text,
                  id: editingEvento.id,
                })
              }
              multiline
            />
            <TextInput
              style={styles.input}
              placeholder="Limite de Participantes"
              value={editingEvento.limite_participantes?.toString()}
              onChangeText={(text: string) =>
                setEditingEvento({
                  ...editingEvento,
                  limite_participantes: parseInt(text) || 0,
                  id: editingEvento.id,
                })
              }
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setEditingEvento(null)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleUpdateEvento}
              >
                <Text style={styles.buttonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {isCreating && (
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Criar Novo Evento</Text>
            <ScrollView>
              <TextInput
                style={styles.input}
                placeholder="Nome do Evento"
                placeholderTextColor="#666"
                value={newEvento.nome}
                onChangeText={(text) =>
                  setNewEvento({ ...newEvento, nome: text })
                }
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Descrição"
                placeholderTextColor="#666"
                value={newEvento.descricao}
                onChangeText={(text) =>
                  setNewEvento({ ...newEvento, descricao: text })
                }
                multiline
              />
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#007AFF" />
                <Text style={styles.datePickerText}>
                  {newEvento.data.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={newEvento.data}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setNewEvento({ ...newEvento, data: selectedDate });
                    }
                  }}
                />
              )}
              <TextInput
                style={styles.input}
                placeholder="Curso"
                placeholderTextColor="#666"
                value={newEvento.curso}
                onChangeText={(text) =>
                  setNewEvento({ ...newEvento, curso: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Localização"
                placeholderTextColor="#666"
                value={newEvento.localizacao}
                onChangeText={(text) =>
                  setNewEvento({ ...newEvento, localizacao: text })
                }
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Observações Adicionais"
                placeholderTextColor="#666"
                value={newEvento.observacoes_adicionais}
                onChangeText={(text) =>
                  setNewEvento({ ...newEvento, observacoes_adicionais: text })
                }
                multiline
              />
              <TextInput
                style={styles.input}
                placeholder="Limite de Participantes"
                placeholderTextColor="#666"
                value={newEvento.limite_participantes?.toString()}
                onChangeText={(text) =>
                  setNewEvento({
                    ...newEvento,
                    limite_participantes: parseInt(text) || 0,
                  })
                }
                keyboardType="numeric"
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
                onPress={handleCreateEvento}
              >
                <Text style={styles.buttonText}>Criar</Text>
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
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
    color: '#333',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  eventoCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  eventoCardGradient: {
    padding: 16,
  },
  eventoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  eventoDescription: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 12,
    opacity: 0.9,
  },
  eventoInfoContainer: {
    marginBottom: 12,
  },
  eventoInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventoInfo: {
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
  participateButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
  },
  detailsButton: {
    backgroundColor: '#6c757d',
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
  modalInfoContainer: {
    marginBottom: 16,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
    flex: 1,
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
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  closeButton: {
    backgroundColor: '#6c757d',
  },
  saveButton: {
    backgroundColor: '#28a745',
  },
  modalLabel: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
});
