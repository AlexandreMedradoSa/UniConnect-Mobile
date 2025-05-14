import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { ThemedText } from '../ThemedText';
import { Event as EventBase } from '../../types/dashboard.types';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

const API_URL = Constants.expoConfig?.extra?.API_URL;

interface Event extends EventBase {
  participa?: boolean;
  conexoesParticipando?: string[];
}

interface EventsSectionProps {
  // Não precisa mais receber events, pois busca direto da API
}

export function EventsSection() {
  const [eventos, setEventos] = useState<Event[]>([]);
  const [historico, setHistorico] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [currentEvento, setCurrentEvento] = useState<Event | null>(null);
  const [isViewingDetails, setIsViewingDetails] = useState(false);
  const [isViewingParticipants, setIsViewingParticipants] = useState(false);
  const [participantes, setParticipantes] = useState<any[]>([]);
  const [editingEvento, setEditingEvento] = useState<Event | null>(null);
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
  const [searchPerformed, setSearchPerformed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        const storedToken = await AsyncStorage.getItem('token');
        setUserId(storedUserId);
        setToken(storedToken);
        if (storedToken) {
          fetchEventos(storedToken, storedUserId || '');
          fetchHistorico(storedToken || '');
        }
      } catch (e) {
        setError('Erro ao carregar dados do usuário');
      }
    })();
  }, []);

  const fetchEventos = async (tokenParam?: string, userIdParam?: string) => {
    try {
      setLoading(true);
      const tokenToUse = tokenParam || token;
      const userIdToUse = userIdParam || userId;
      if (!tokenToUse || !userIdToUse) return;
      const [eventosResponse, historicoResponse, conexoesResponse] =
        await Promise.all([
          fetch(`${API_URL}/api/eventos`, {
            headers: { Authorization: `Bearer ${tokenToUse}` },
          }),
          fetch(`${API_URL}/api/eventos/historico`, {
            headers: { Authorization: `Bearer ${tokenToUse}` },
          }),
          fetch(`${API_URL}/api/users/${userIdToUse}/conexoes`, {
            headers: { Authorization: `Bearer ${tokenToUse}` },
          }),
        ]);
      if (!eventosResponse.ok || !historicoResponse.ok || !conexoesResponse.ok)
        throw new Error('Erro ao buscar eventos');
      const eventosData = await eventosResponse.json();
      const historicoData = await historicoResponse.json();
      const conexoesData = await conexoesResponse.json();
      const eventosParticipadosIds = historicoData.map(
        (evento: Event) => evento.id,
      );
      const conexoes = conexoesData.map((conexao: any) => ({
        id: conexao.id,
        nome: conexao.name,
      }));
      const eventosDisponiveis = eventosData.map((evento: Event) => {
        const participantesIds = (evento.evento_participantes || []).map(
          (p: any) => p.usuario_id,
        );
        const conexoesParticipandoNomes = participantesIds
          .filter((id: string) =>
            conexoes.some((c: { id: string }) => c.id === id),
          )
          .map((id: string) => {
            const conexao = conexoes.find((c: { id: string }) => c.id === id);
            return conexao ? conexao.nome : id;
          });
        return {
          ...evento,
          participa: eventosParticipadosIds.includes(evento.id),
          conexoesParticipando: conexoesParticipandoNomes,
        };
      });
      setEventos(eventosDisponiveis);
      setHistorico(historicoData);
    } catch (err) {
      setError('Erro ao carregar eventos.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorico = async (tokenParam?: string) => {
    try {
      const tokenToUse = tokenParam || token;
      if (!tokenToUse) return;
      const response = await fetch(`${API_URL}/api/eventos/historico`, {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      });
      if (!response.ok) throw new Error('Erro ao buscar histórico');
      const data = await response.json();
      setHistorico(data.data);
    } catch (err) {
      setError('Erro ao buscar histórico');
    }
  };

  const handleParticipar = async (eventoId: number) => {
    try {
      await fetch(`${API_URL}/api/eventos/${eventoId}/participar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert('Sucesso', 'Participação confirmada!');
      fetchEventos();
    } catch (err) {
      Alert.alert('Erro', 'Erro ao participar do evento');
    }
  };

  const handleCancelarParticipacao = async (eventoId: number) => {
    try {
      await fetch(`${API_URL}/api/eventos/${eventoId}/participar`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert('Sucesso', 'Participação cancelada!');
      fetchEventos();
    } catch (err) {
      Alert.alert('Erro', 'Erro ao cancelar participação');
    }
  };

  function formatDateToISO(dateStr: string) {
    // Espera DD/MM/AAAA
    const [day, month, year] = dateStr.split('/');
    if (!day || !month || !year) return '';
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`;
  }

  const handleCreateEvento = async () => {
    if (
      !newEvento.nome ||
      !newEvento.descricao ||
      !newEvento.curso ||
      !newEvento.data
    ) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }
    try {
      await fetch(`${API_URL}/api/eventos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newEvento,
          data: formatDateToISO(newEvento.data),
        }),
      });
      Alert.alert('Sucesso', 'Evento criado com sucesso!');
      setIsCreating(false);
      setNewEvento({
        nome: '',
        descricao: '',
        data: '',
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

  const handleSearch = async () => {
    if (!search.trim()) return;
    try {
      setLoading(true);
      setSearchPerformed(true);
      const [response, historicoResponse, conexoesResponse] = await Promise.all(
        [
          fetch(`${API_URL}/api/eventos?nome=${search}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }),
          token
            ? fetch(`${API_URL}/api/eventos/historico`, {
                headers: { Authorization: `Bearer ${token}` },
              })
            : Promise.resolve({ ok: true, json: async () => [] }),
          token && userId
            ? fetch(`${API_URL}/api/users/${userId}/conexoes`, {
                headers: { Authorization: `Bearer ${token}` },
              })
            : Promise.resolve({ ok: true, json: async () => [] }),
        ],
      );

      if (!response.ok || !historicoResponse.ok || !conexoesResponse.ok)
        throw new Error('Erro ao buscar eventos');

      const eventosData = await response.json();
      const historicoData = await historicoResponse.json();
      const conexoesData = await conexoesResponse.json();

      const eventosParticipadosIds = historicoData.map(
        (evento: Event) => evento.id,
      );
      const conexoes = conexoesData.map((conexao: any) => ({
        id: conexao.id,
        nome: conexao.name,
      }));

      const eventosDisponiveis = eventosData.map((evento: Event) => {
        const participantesIds = (evento.evento_participantes || []).map(
          (p: any) => p.usuario_id,
        );
        const conexoesParticipandoNomes = participantesIds
          .filter((id: string) =>
            conexoes.some((c: { id: string }) => c.id === id),
          )
          .map((id: string) => {
            const conexao = conexoes.find((c: { id: string }) => c.id === id);
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
      Alert.alert('Erro', 'Erro ao buscar eventos');
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipantes = async (eventoId: number) => {
    try {
      const response = await fetch(
        `${API_URL}/api/eventos/${eventoId}/participantes`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      );
      if (!response.ok) throw new Error('Erro ao buscar participantes');
      const data = await response.json();
      setParticipantes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Erro ao carregar participantes do evento.');
      setParticipantes([]);
    }
  };

  const handleVerParticipantes = async (evento: Event) => {
    setCurrentEvento(evento);
    await fetchParticipantes(evento.id);
    setIsViewingParticipants(true);
  };

  const handleDeleteEvento = async (eventoId: number) => {
    try {
      await fetch(`${API_URL}/api/eventos/${eventoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert('Sucesso', 'Evento excluído com sucesso!');
      fetchEventos();
    } catch (err) {
      Alert.alert('Erro', 'Erro ao excluir evento');
    }
  };

  const handleEditEvento = (evento: Event) => {
    setEditingEvento({ ...evento, data: evento.data.split('T')[0] });
  };

  const handleUpdateEvento = async () => {
    if (!editingEvento) return;
    try {
      await fetch(`${API_URL}/api/eventos/${editingEvento.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...editingEvento,
          data: formatDateToISO(editingEvento.data),
        }),
      });
      Alert.alert('Sucesso', 'Evento atualizado com sucesso!');
      setEditingEvento(null);
      fetchEventos();
    } catch (err) {
      Alert.alert('Erro', 'Erro ao atualizar evento');
    }
  };

  const closeModal = () => {
    setCurrentEvento(null);
    setIsViewingDetails(false);
    setIsViewingParticipants(false);
    setEditingEvento(null);
  };

  function handleDateInputMask(text: string) {
    // Remove tudo que não for número
    let cleaned = text.replace(/[^0-9]/g, '');
    // Aplica a máscara DD/MM/YYYY
    if (cleaned.length > 2 && cleaned.length <= 4) {
      cleaned = cleaned.replace(/(\d{2})(\d{1,2})/, '$1/$2');
    } else if (cleaned.length > 4) {
      cleaned = cleaned.replace(/(\d{2})(\d{2})(\d{1,4})/, '$1/$2/$3');
    }
    return cleaned;
  }

  const handleClearSearch = () => {
    setSearch('');
    setSearchPerformed(false);
    fetchEventos();
  };

  const eventosInscritos = eventos.filter((e) => e.participa);
  const eventosDisponiveis = eventos.filter((e) => !e.participa);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={{ marginTop: 16 }}>Carregando eventos...</ThemedText>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={[]}
        keyExtractor={() => ''}
        contentContainerStyle={styles.container}
        renderItem={() => null}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <ThemedText type="title" style={styles.headerTitle}>
                Eventos Acadêmicos
              </ThemedText>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setIsCreating(true)}
              >
                <ThemedText style={styles.createButtonText}>
                  Novo Evento
                </ThemedText>
              </TouchableOpacity>
            </View>
            {error && (
              <View style={styles.errorContainer}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
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
              <TouchableOpacity
                style={styles.searchButton}
                onPress={handleSearch}
              >
                <ThemedText style={{ color: '#fff' }}>Pesquisar</ThemedText>
              </TouchableOpacity>
            </View>
            {searchPerformed &&
              eventosDisponiveis.length === 0 &&
              eventosInscritos.length === 0 && (
                <View style={{ alignItems: 'center', marginVertical: 12 }}>
                  <ThemedText style={{ color: '#c62828', fontSize: 16 }}>
                    Nenhum evento encontrado.
                  </ThemedText>
                  <TouchableOpacity
                    onPress={handleClearSearch}
                    style={{
                      marginTop: 8,
                      padding: 8,
                      backgroundColor: '#007AFF',
                      borderRadius: 8,
                    }}
                  >
                    <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>
                      Limpar busca
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            <ThemedText type="title" style={styles.sectionTitle}>
              Eventos Disponíveis
            </ThemedText>
            {eventosDisponiveis.length > 0 ? (
              eventosDisponiveis.map((evento) => (
                <View key={evento.id} style={styles.itemCard}>
                  <ThemedText type="defaultSemiBold" style={styles.itemTitle}>
                    {evento.nome}
                  </ThemedText>
                  <ThemedText style={styles.itemDescription}>
                    {evento.descricao}
                  </ThemedText>
                  <ThemedText style={styles.itemDescription}>
                    Data: {new Date(evento.data).toLocaleDateString()}
                  </ThemedText>
                  <ThemedText style={styles.itemDescription}>
                    Curso: {evento.curso}
                  </ThemedText>
                  <ThemedText style={styles.itemDescription}>
                    Participantes: {evento.total_participantes} /{' '}
                    {evento.limite_participantes || 'Ilimitado'}
                  </ThemedText>
                  {evento.conexoesParticipando &&
                    evento.conexoesParticipando.length > 0 && (
                      <ThemedText style={{ color: '#007AFF', fontSize: 13 }}>
                        Conexões participando:{' '}
                        {evento.conexoesParticipando.join(', ')}
                      </ThemedText>
                    )}
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.button, styles.participateButton]}
                      onPress={() => handleParticipar(evento.id)}
                    >
                      <ThemedText style={styles.buttonText}>
                        Participar
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.detailsButton]}
                      onPress={() => {
                        setCurrentEvento(evento);
                        setIsViewingDetails(true);
                      }}
                    >
                      <ThemedText style={styles.buttonText}>
                        Detalhes
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.detailsButton]}
                      onPress={() => handleVerParticipantes(evento)}
                    >
                      <ThemedText style={styles.buttonText}>
                        Participantes
                      </ThemedText>
                    </TouchableOpacity>
                    {evento.criador_id === userId && (
                      <>
                        <TouchableOpacity
                          style={[styles.button, styles.editButton]}
                          onPress={() => handleEditEvento(evento)}
                        >
                          <ThemedText style={styles.buttonText}>
                            Editar
                          </ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.button, styles.deleteButton]}
                          onPress={() => handleDeleteEvento(evento.id)}
                        >
                          <ThemedText style={styles.buttonText}>
                            Excluir
                          </ThemedText>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <ThemedText
                style={{ color: '#888', textAlign: 'center', marginBottom: 10 }}
              >
                Nenhum evento disponível no momento.
              </ThemedText>
            )}
            <ThemedText type="title" style={styles.sectionTitle}>
              Eventos Inscritos
            </ThemedText>
            {eventosInscritos.length > 0 ? (
              eventosInscritos.map((evento) => (
                <View key={evento.id} style={styles.itemCard}>
                  <ThemedText type="defaultSemiBold" style={styles.itemTitle}>
                    {evento.nome}
                  </ThemedText>
                  <ThemedText style={styles.itemDescription}>
                    {evento.descricao}
                  </ThemedText>
                  <ThemedText style={styles.itemDescription}>
                    Data: {new Date(evento.data).toLocaleDateString()}
                  </ThemedText>
                  <ThemedText style={styles.itemDescription}>
                    Curso: {evento.curso}
                  </ThemedText>
                  <ThemedText style={styles.itemDescription}>
                    Participantes: {evento.total_participantes} /{' '}
                    {evento.limite_participantes || 'Ilimitado'}
                  </ThemedText>
                  {evento.conexoesParticipando &&
                    evento.conexoesParticipando.length > 0 && (
                      <ThemedText style={{ color: '#007AFF', fontSize: 13 }}>
                        Conexões participando:{' '}
                        {evento.conexoesParticipando.join(', ')}
                      </ThemedText>
                    )}
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.button, styles.cancelButton]}
                      onPress={() => handleCancelarParticipacao(evento.id)}
                    >
                      <ThemedText style={styles.buttonText}>
                        Cancelar
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.detailsButton]}
                      onPress={() => {
                        setCurrentEvento(evento);
                        setIsViewingDetails(true);
                      }}
                    >
                      <ThemedText style={styles.buttonText}>
                        Detalhes
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.detailsButton]}
                      onPress={() => handleVerParticipantes(evento)}
                    >
                      <ThemedText style={styles.buttonText}>
                        Participantes
                      </ThemedText>
                    </TouchableOpacity>
                    {evento.criador_id === userId && (
                      <>
                        <TouchableOpacity
                          style={[styles.button, styles.editButton]}
                          onPress={() => handleEditEvento(evento)}
                        >
                          <ThemedText style={styles.buttonText}>
                            Editar
                          </ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.button, styles.deleteButton]}
                          onPress={() => handleDeleteEvento(evento.id)}
                        >
                          <ThemedText style={styles.buttonText}>
                            Excluir
                          </ThemedText>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <ThemedText
                style={{ color: '#888', textAlign: 'center', marginBottom: 10 }}
              >
                Você não está inscrito em nenhum evento.
              </ThemedText>
            )}
            <ThemedText type="title" style={styles.sectionTitle}>
              Histórico de Participação
            </ThemedText>
            <FlatList
              data={historico}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <View style={styles.itemCard}>
                  <ThemedText style={styles.itemTitle}>{item.nome}</ThemedText>
                  <ThemedText style={styles.itemDescription}>
                    Data: {new Date(item.data).toLocaleDateString()}
                  </ThemedText>
                </View>
              )}
              scrollEnabled={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </>
        }
      />
      {/* Modal Detalhes */}
      <Modal
        visible={isViewingDetails && !!currentEvento}
        transparent
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView>
              <ThemedText type="title" style={styles.modalTitle}>
                {currentEvento?.nome}
              </ThemedText>
              <ThemedText style={styles.modalText}>
                <ThemedText style={styles.modalLabel}>Descrição:</ThemedText>{' '}
                {currentEvento?.descricao}
              </ThemedText>
              <ThemedText style={styles.modalText}>
                <ThemedText style={styles.modalLabel}>Data:</ThemedText>{' '}
                {currentEvento
                  ? new Date(currentEvento.data).toLocaleDateString()
                  : ''}
              </ThemedText>
              <ThemedText style={styles.modalText}>
                <ThemedText style={styles.modalLabel}>Curso:</ThemedText>{' '}
                {currentEvento?.curso}
              </ThemedText>
              <ThemedText style={styles.modalText}>
                <ThemedText style={styles.modalLabel}>Localização:</ThemedText>{' '}
                {currentEvento?.localizacao || 'Não informada'}
              </ThemedText>
              <ThemedText style={styles.modalText}>
                <ThemedText style={styles.modalLabel}>Observações:</ThemedText>{' '}
                {currentEvento?.observacoes_adicionais || 'Nenhuma'}
              </ThemedText>
            </ScrollView>
            <TouchableOpacity
              style={[styles.button, styles.closeButton]}
              onPress={closeModal}
            >
              <ThemedText style={styles.buttonText}>Fechar</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Modal Participantes */}
      <Modal
        visible={isViewingParticipants && !!currentEvento}
        transparent
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ThemedText type="title" style={styles.modalTitle}>
              Participantes do evento: {currentEvento?.nome}
            </ThemedText>
            <ScrollView>
              {Array.isArray(participantes) && participantes.length > 0 ? (
                participantes.map((p, idx) => (
                  <ThemedText key={idx} style={styles.modalText}>
                    {p?.users?.name || 'Participante'}
                  </ThemedText>
                ))
              ) : (
                <ThemedText style={styles.modalText}>
                  Nenhum participante encontrado.
                </ThemedText>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.button, styles.closeButton]}
              onPress={closeModal}
            >
              <ThemedText style={styles.buttonText}>Fechar</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Modal Edição */}
      <Modal visible={!!editingEvento} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView>
              <ThemedText type="title" style={styles.modalTitle}>
                Editar Evento
              </ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Nome do Evento"
                placeholderTextColor="#888"
                value={editingEvento?.nome || ''}
                onChangeText={(text) =>
                  setEditingEvento({ ...editingEvento!, nome: text })
                }
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Descrição"
                placeholderTextColor="#888"
                value={editingEvento?.descricao || ''}
                onChangeText={(text) =>
                  setEditingEvento({ ...editingEvento!, descricao: text })
                }
                multiline
              />
              <TextInput
                style={styles.input}
                placeholder="Data (DD/MM/AAAA)"
                placeholderTextColor="#888"
                value={editingEvento?.data || ''}
                onChangeText={(text) =>
                  setEditingEvento({
                    ...editingEvento!,
                    data: handleDateInputMask(text),
                  })
                }
                keyboardType="numeric"
                maxLength={10}
              />
              <TextInput
                style={styles.input}
                placeholder="Curso"
                placeholderTextColor="#888"
                value={editingEvento?.curso || ''}
                onChangeText={(text) =>
                  setEditingEvento({ ...editingEvento!, curso: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Localização"
                placeholderTextColor="#888"
                value={editingEvento?.localizacao || ''}
                onChangeText={(text) =>
                  setEditingEvento({ ...editingEvento!, localizacao: text })
                }
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Observações Adicionais"
                placeholderTextColor="#888"
                value={editingEvento?.observacoes_adicionais || ''}
                onChangeText={(text) =>
                  setEditingEvento({
                    ...editingEvento!,
                    observacoes_adicionais: text,
                  })
                }
                multiline
              />
              <TextInput
                style={styles.input}
                placeholder="Limite de Participantes"
                placeholderTextColor="#888"
                value={editingEvento?.limite_participantes?.toString() || '0'}
                onChangeText={(text) =>
                  setEditingEvento({
                    ...editingEvento!,
                    limite_participantes: parseInt(text) || 0,
                  })
                }
                keyboardType="numeric"
              />
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={closeModal}
              >
                <ThemedText style={styles.buttonText}>Cancelar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleUpdateEvento}
              >
                <ThemedText style={styles.buttonText}>Salvar</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Modal Criação */}
      <Modal visible={isCreating} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView>
              <ThemedText type="title" style={styles.modalTitle}>
                Criar Novo Evento
              </ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Nome do Evento"
                placeholderTextColor="#888"
                value={newEvento.nome}
                onChangeText={(text) =>
                  setNewEvento({ ...newEvento, nome: text })
                }
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Descrição"
                placeholderTextColor="#888"
                value={newEvento.descricao}
                onChangeText={(text) =>
                  setNewEvento({ ...newEvento, descricao: text })
                }
                multiline
              />
              <TextInput
                style={styles.input}
                placeholder="Data (DD/MM/AAAA)"
                placeholderTextColor="#888"
                value={newEvento.data}
                onChangeText={(text) =>
                  setNewEvento({
                    ...newEvento,
                    data: handleDateInputMask(text),
                  })
                }
                keyboardType="numeric"
                maxLength={10}
              />
              <TextInput
                style={styles.input}
                placeholder="Curso"
                placeholderTextColor="#888"
                value={newEvento.curso}
                onChangeText={(text) =>
                  setNewEvento({ ...newEvento, curso: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Localização"
                placeholderTextColor="#888"
                value={newEvento.localizacao}
                onChangeText={(text) =>
                  setNewEvento({ ...newEvento, localizacao: text })
                }
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Observações Adicionais"
                placeholderTextColor="#888"
                value={newEvento.observacoes_adicionais}
                onChangeText={(text) =>
                  setNewEvento({ ...newEvento, observacoes_adicionais: text })
                }
                multiline
              />
              <TextInput
                style={styles.input}
                placeholder="Limite de Participantes"
                placeholderTextColor="#888"
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
                <ThemedText style={styles.buttonText}>Cancelar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleCreateEvento}
              >
                <ThemedText style={styles.buttonText}>Criar</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#005BB5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    flexShrink: 1,
  },
  createButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 8,
    marginLeft: 12,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#c62828',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
    color: '#333',
    backgroundColor: '#fff',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    color: '#007AFF',
    marginBottom: 10,
    marginTop: 10,
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
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    minWidth: 90,
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
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
  editButton: {
    backgroundColor: '#FFC107',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#007AFF',
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  modalLabel: {
    fontWeight: 'bold',
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
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
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
