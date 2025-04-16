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
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

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

export default function EventosList() {
  const router = useRouter();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [historico, setHistorico] = useState<Evento[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [currentEvento, setCurrentEvento] = useState<Evento | null>(null);
  const [isViewingDetails, setIsViewingDetails] = useState(false);
  const [isViewingParticipants, setIsViewingParticipants] = useState(false);
  const [participantes, setParticipantes] = useState<any[]>([]);
  const [editingEvento, setEditingEvento] = useState<Evento | null>(null);
  const [newEvento, setNewEvento] = useState({
    nome: '',
    descricao: '',
    data: '',
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
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
      }
    };
    loadUserData();
  }, []);

  const fetchEventos = async (): Promise<void> => {
    try {
      setLoading(true);
      const [eventosResponse, historicoResponse, conexoesResponse] = await Promise.all([
        fetch('YOUR_BACKEND_URL/eventos', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }),
        token
          ? fetch('YOUR_BACKEND_URL/eventos/historico', {
              headers: { Authorization: `Bearer ${token}` },
            })
          : { json: () => Promise.resolve({ data: [] }) },
        token
          ? fetch(`YOUR_BACKEND_URL/users/${userId}/conexoes`, {
              headers: { Authorization: `Bearer ${token}` },
            })
          : { json: () => Promise.resolve({ data: [] }) },
      ]);

      const eventosData = await eventosResponse.json();
      const historicoData = await historicoResponse.json();
      const conexoesData = await conexoesResponse.json();

      const eventosParticipadosIds = historicoData.data.map((evento: Evento) => evento.id);
      const conexoes = conexoesData.data.map((conexao: any) => ({
        id: conexao.id,
        nome: conexao.name,
      }));

      const eventosDisponiveis = eventosData.data.map((evento: Evento) => {
        const participantesIds = (evento.evento_participantes || []).map(
          (participante: any) => participante.usuario_id,
        );

        const conexoesParticipandoNomes = participantesIds
          .filter((id: string) => conexoes.some((conexao: { id: string }) => conexao.id === id))
          .map((id: string) => {
            const conexao = conexoes.find((conexao: { id: string }) => conexao.id === id);
            return conexao ? conexao.nome : id;
          });

        return {
          ...evento,
          participa: eventosParticipadosIds.includes(evento.id),
          conexoesParticipando: conexoesParticipandoNomes,
        };
      });

      setEventos(eventosDisponiveis);
      setHistorico(historicoData.data);
    } catch (err) {
      console.error('Erro ao buscar eventos:', err);
      setError('Erro ao carregar eventos.');
    } finally {
      setLoading(false);
    }
  };

  const handleParticipar = async (eventoId: string): Promise<void> => {
    if (!eventoId) {
      Alert.alert('Erro', 'ID do evento inválido.');
      return;
    }

    try {
      const response = await fetch(`YOUR_BACKEND_URL/eventos/${eventoId}/participar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Erro ao participar do evento');

      Alert.alert('Sucesso', 'Participação confirmada!');
      fetchEventos();
    } catch (err) {
      Alert.alert('Erro', 'Erro ao participar do evento.');
    }
  };

  const handleCancelarParticipacao = async (eventoId: string): Promise<void> => {
    try {
      const response = await fetch(`YOUR_BACKEND_URL/eventos/${eventoId}/participar`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Erro ao cancelar participação');

      Alert.alert('Sucesso', 'Participação cancelada!');
      fetchEventos();
    } catch (err) {
      Alert.alert('Erro', 'Erro ao cancelar participação.');
    }
  };

  const handleCreateEvento = async (): Promise<void> => {
    if (!newEvento.data) {
      Alert.alert('Erro', 'A data do evento é obrigatória.');
      return;
    }

    try {
      const response = await fetch('YOUR_BACKEND_URL/eventos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newEvento),
      });

      if (!response.ok) throw new Error('Erro ao criar evento');

      Alert.alert('Sucesso', 'Evento criado com sucesso!');
      setIsCreating(false);
      fetchEventos();
    } catch (err) {
      Alert.alert('Erro', 'Erro ao criar evento.');
    }
  };

  const handleSearch = async (): Promise<void> => {
    if (!search.trim()) return;

    try {
      setLoading(true);
      const response = await fetch(`YOUR_BACKEND_URL/eventos?nome=${search}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const data = await response.json();
      setEventos(data.data);
    } catch (err) {
      Alert.alert('Erro', 'Erro ao buscar eventos.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvento = async (eventoId: string): Promise<void> => {
    try {
      const response = await fetch(`YOUR_BACKEND_URL/eventos/${eventoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Erro ao excluir evento');

      Alert.alert('Sucesso', 'Evento excluído com sucesso!');
      fetchEventos();
    } catch (err) {
      Alert.alert('Erro', 'Erro ao excluir evento.');
    }
  };

  const handleUpdateEvento = async (): Promise<void> => {
    if (!editingEvento) return;

    try {
      const response = await fetch(`YOUR_BACKEND_URL/eventos/${editingEvento.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...editingEvento,
          data: `${editingEvento.data}T00:00:00`,
        }),
      });

      if (!response.ok) throw new Error('Erro ao atualizar evento');

      Alert.alert('Sucesso', 'Evento atualizado com sucesso!');
      setEditingEvento(null);
      fetchEventos();
    } catch (err) {
      Alert.alert('Erro', 'Erro ao atualizar evento.');
    }
  };

  const renderEvento = ({ item }: { item: Evento }): JSX.Element => (
    <View style={styles.eventoCard}>
      <Text style={styles.eventoTitle}>{item.nome}</Text>
      <Text style={styles.eventoDescription}>{item.descricao}</Text>
      <Text style={styles.eventoInfo}>
        Data: {new Date(item.data).toLocaleDateString()}
      </Text>
      <Text style={styles.eventoInfo}>Curso: {item.curso}</Text>
      <Text style={styles.eventoInfo}>
        Participantes: {item.total_participantes} /{' '}
        {item.limite_participantes || 'Ilimitado'}
      </Text>

      {item.conexoesParticipando && item.conexoesParticipando.length > 0 && (
        <Text style={styles.conexoesText}>
          Conexões participando: {item.conexoesParticipando.join(', ')}
        </Text>
      )}

      <View style={styles.buttonContainer}>
        {item.participa ? (
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => handleCancelarParticipacao(item.id)}
          >
            <Text style={styles.buttonText}>Cancelar Participação</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.participateButton]}
            onPress={() => handleParticipar(item.id)}
          >
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
          <Text style={styles.buttonText}>Ver Detalhes</Text>
        </TouchableOpacity>

        {item.criador_id === userId && (
          <>
            <TouchableOpacity
              style={[styles.button, styles.editButton]}
              onPress={() => setEditingEvento(item)}
            >
              <Text style={styles.buttonText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.deleteButton]}
              onPress={() => handleDeleteEvento(item.id)}
            >
              <Text style={styles.buttonText}>Excluir</Text>
            </TouchableOpacity>
          </>
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Eventos Acadêmicos</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setIsCreating(true)}
        >
          <Ionicons name="add-circle" size={24} color="white" />
          <Text style={styles.createButtonText}>Criar Evento</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar eventos..."
          value={search}
          onChangeText={(text: string) => setSearch(text)}
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
        >
          <Ionicons name="search" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={eventos}
        renderItem={renderEvento}
        keyExtractor={(item: Evento) => item.id}
        contentContainerStyle={styles.listContainer}
      />

      {/* Modal de Detalhes */}
      {isViewingDetails && currentEvento && (
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{currentEvento.nome}</Text>
            <Text style={styles.modalText}>
              <Text style={styles.modalLabel}>Descrição:</Text> {currentEvento.descricao}
            </Text>
            <Text style={styles.modalText}>
              <Text style={styles.modalLabel}>Data:</Text>{' '}
              {new Date(currentEvento.data).toLocaleDateString()}
            </Text>
            <Text style={styles.modalText}>
              <Text style={styles.modalLabel}>Curso:</Text> {currentEvento.curso}
            </Text>
            <Text style={styles.modalText}>
              <Text style={styles.modalLabel}>Localização:</Text>{' '}
              {currentEvento.localizacao || 'Não informada'}
            </Text>
            <Text style={styles.modalText}>
              <Text style={styles.modalLabel}>Observações:</Text>{' '}
              {currentEvento.observacoes_adicionais || 'Nenhuma'}
            </Text>
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
                setEditingEvento({ ...editingEvento, nome: text })
              }
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descrição"
              value={editingEvento.descricao}
              onChangeText={(text: string) =>
                setEditingEvento({ ...editingEvento, descricao: text })
              }
              multiline
            />
            <TextInput
              style={styles.input}
              placeholder="Data (YYYY-MM-DD)"
              value={editingEvento.data}
              onChangeText={(text: string) =>
                setEditingEvento({ ...editingEvento, data: text })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Curso"
              value={editingEvento.curso}
              onChangeText={(text: string) =>
                setEditingEvento({ ...editingEvento, curso: text })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Localização"
              value={editingEvento.localizacao}
              onChangeText={(text: string) =>
                setEditingEvento({ ...editingEvento, localizacao: text })
              }
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Observações Adicionais"
              value={editingEvento.observacoes_adicionais}
              onChangeText={(text: string) =>
                setEditingEvento({ ...editingEvento, observacoes_adicionais: text })
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

      {/* Modal de Criação */}
      {isCreating && (
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Criar Novo Evento</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome do Evento"
              value={newEvento.nome}
              onChangeText={(text: string) =>
                setNewEvento({ ...newEvento, nome: text })
              }
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descrição"
              value={newEvento.descricao}
              onChangeText={(text: string) =>
                setNewEvento({ ...newEvento, descricao: text })
              }
              multiline
            />
            <TextInput
              style={styles.input}
              placeholder="Data (YYYY-MM-DD)"
              value={newEvento.data}
              onChangeText={(text: string) =>
                setNewEvento({ ...newEvento, data: text })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Curso"
              value={newEvento.curso}
              onChangeText={(text: string) =>
                setNewEvento({ ...newEvento, curso: text })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Localização"
              value={newEvento.localizacao}
              onChangeText={(text: string) =>
                setNewEvento({ ...newEvento, localizacao: text })
              }
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Observações Adicionais"
              value={newEvento.observacoes_adicionais}
              onChangeText={(text: string) =>
                setNewEvento({ ...newEvento, observacoes_adicionais: text })
              }
              multiline
            />
            <TextInput
              style={styles.input}
              placeholder="Limite de Participantes"
              value={newEvento.limite_participantes?.toString()}
              onChangeText={(text: string) =>
                setNewEvento({
                  ...newEvento,
                  limite_participantes: parseInt(text) || 0,
                })
              }
              keyboardType="numeric"
            />
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#007AFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    marginLeft: 4,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#c62828',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
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
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  eventoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  eventoDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  eventoInfo: {
    fontSize: 14,
    marginBottom: 4,
  },
  conexoesText: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 100,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  participateButton: {
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
  },
  detailsButton: {
    backgroundColor: '#6c757d',
  },
  editButton: {
    backgroundColor: '#ffc107',
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
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 8,
  },
  modalLabel: {
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
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
  closeButton: {
    backgroundColor: '#6c757d',
  },
  saveButton: {
    backgroundColor: '#28a745',
  },
}); 