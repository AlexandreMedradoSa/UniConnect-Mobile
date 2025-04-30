import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Text,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL;

type ConnectionStatus = 'pendente' | 'aceito' | 'recusado';

interface User {
  id: string;
  name: string;
  email: string;
  curso: string | null;
  semestre: number | null;
  interesses: string[] | null;
}

interface BaseConnection extends User {
  status: ConnectionStatus;
  createdAt: string;
}

interface Connection {
  id: string;
  conexaoId: string;
  name: string;
  curso: string;
  semestre: number;
  interesses?: string[];
}

interface ConnectionRequest extends BaseConnection {
  requestId: string;
  curso: string | null;
  semestre: number | null;
  interesses: string[] | null;
}

interface ConnectionsSectionProps {
  onRefresh: () => void;
}

export function ConnectionsSection({ onRefresh }: ConnectionsSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingRequests, setPendingRequests] = useState<ConnectionRequest[]>(
    [],
  );
  const [sentRequests, setSentRequests] = useState<ConnectionRequest[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [filteredResults, setFilteredResults] = useState<User[]>([]);
  const [suggestions, setSuggestions] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursoFilter, setCursoFilter] = useState('');
  const [interessesFilter, setInteressesFilter] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const fetchSuggestions = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');

      if (!token || !userId) {
        throw new Error('Token ou userId não encontrado');
      }

      const response = await fetch(`${API_URL}/api/users/${userId}/sugestoes`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar sugestões');
      }

      const data = await response.json();
      setSuggestions(data);
      setError(null);
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error);
      setError('Erro ao buscar sugestões de conexões');
    }
  };

  const fetchFilteredConnections = async () => {
    try {
      if (!cursoFilter && !interessesFilter) {
        setError('Por favor, preencha pelo menos um filtro antes de buscar.');
        return;
      }

      console.log('Iniciando busca de conexões filtradas...');
      console.log('Filtros:', {
        curso: cursoFilter,
        interesses: interessesFilter,
      });

      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');

      console.log('Token encontrado:', token ? 'Sim' : 'Não');
      console.log('UserId encontrado:', userId ? 'Sim' : 'Não');

      if (!token || !userId) {
        console.error(
          'Token ou userId não encontrado em fetchFilteredConnections',
        );
        throw new Error('Token ou userId não encontrado');
      }

      const params = new URLSearchParams();
      if (cursoFilter) params.append('curso', cursoFilter);
      if (interessesFilter) params.append('interesses', interessesFilter);

      const url = `${API_URL}/api/users/search?${params.toString()}`;
      console.log('URL da requisição:', url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Status da resposta:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta:', response.status, errorText);
        throw new Error(
          `Erro ao buscar conexões filtradas: ${response.status}`,
        );
      }

      const data = await response.json();
      console.log('Dados recebidos:', data);

      setFilteredResults(data);
      setError(null);
    } catch (error) {
      console.error('Erro detalhado ao buscar conexões filtradas:', error);
      setError('Erro ao buscar conexões filtradas');
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');

      if (!userId) {
        console.error('UserId não encontrado');
        return;
      }

      const response = await fetch(
        `${API_URL}/api/users/${userId}/conexoes/pendentes`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar solicitações pendentes');
      }

      const data = await response.json();
      setPendingRequests(data);
    } catch (error) {
      console.error('Erro ao buscar solicitações pendentes:', error);
      setError('Erro ao buscar solicitações pendentes');
    }
  };

  const fetchSentRequests = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');

      if (!userId) {
        console.error('UserId não encontrado');
        return;
      }

      const response = await fetch(
        `${API_URL}/api/users/${userId}/conexoes/enviadas`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar solicitações enviadas');
      }

      const data = await response.json();
      setSentRequests(data);
    } catch (error) {
      console.error('Erro ao buscar solicitações enviadas:', error);
      setError('Erro ao buscar solicitações enviadas');
    }
  };

  const fetchConnections = async () => {
    try {
      const [token, userId] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('userId'),
      ]);

      console.log('Buscando conexões para userId:', userId);

      if (!token || !userId) {
        console.error('Token ou userId não encontrado em fetchConnections');
        setError('Erro de autenticação');
        return null;
      }

      const response = await fetch(`${API_URL}/api/users/${userId}/conexoes`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta:', response.status, errorText);
        throw new Error(`Erro ao buscar conexões: ${response.status}`);
      }

      const data = await response.json();
      console.log('Conexões recebidas:', data);

      setConnections(data);
      setError(null);
      return data;
    } catch (error) {
      console.error('Erro ao buscar conexões:', error);
      setError('Erro ao buscar conexões');
      return null;
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Atenção', 'Digite um nome para buscar');
      return;
    }

    try {
      setIsSearching(true);
      setError(null);

      console.log('Iniciando busca por:', searchQuery);

      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');

      console.log('Token encontrado:', token ? 'Sim' : 'Não');
      console.log('UserId encontrado:', userId ? 'Sim' : 'Não');

      if (!token || !userId) {
        throw new Error('Token ou userId não encontrado');
      }

      const url = `${API_URL}/api/users/search?nome=${encodeURIComponent(
        searchQuery,
      )}`;
      console.log('URL da busca:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Status da resposta:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta:', response.status, errorText);
        throw new Error(
          `Erro ao buscar usuários: ${response.status} - ${errorText}`,
        );
      }

      const data = await response.json();
      console.log('Dados recebidos:', data);

      setSearchResults(data);

      if (data.length === 0) {
        Alert.alert('Resultado', 'Nenhum usuário encontrado');
      }
    } catch (error) {
      console.error('Erro detalhado na busca:', error);
      setError('Erro ao buscar usuários. Por favor, tente novamente.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const myUserId = await AsyncStorage.getItem('userId');

      if (!myUserId) {
        console.error('UserId não encontrado');
        return;
      }

      const response = await fetch(
        `${API_URL}/api/users/${myUserId}/conexoes/${requestId}/aceitar`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Erro ao aceitar solicitação');
      }

      const acceptedRequest = await response.json();
      const newConnection: Connection = {
        id: acceptedRequest.id,
        conexaoId: acceptedRequest.requestId,
        name: acceptedRequest.name,
        curso: acceptedRequest.curso,
        semestre: acceptedRequest.semestre,
        interesses: acceptedRequest.interesses || [],
      };

      setConnections((prev) => [...prev, newConnection]);
      setPendingRequests((prev) =>
        prev.filter((request) => request.id !== requestId),
      );
      Alert.alert('Sucesso', 'Solicitação aceita com sucesso');
      await fetchConnections();
    } catch (error) {
      console.error('Erro ao aceitar solicitação:', error);
      setError('Erro ao aceitar solicitação');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');

      if (!userId) {
        console.error('UserId não encontrado');
        return;
      }

      const response = await fetch(
        `${API_URL}/api/users/${userId}/conexoes/${requestId}/recusar`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Erro ao recusar solicitação');
      }

      setPendingRequests((prev) =>
        prev.filter((request) => request.id !== requestId),
      );
      Alert.alert('Sucesso', 'Solicitação recusada com sucesso');
      await fetchConnections();
    } catch (error) {
      console.error('Erro ao recusar solicitação:', error);
      setError('Erro ao recusar solicitação');
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');

      if (!userId) {
        return;
      }

      const url = `${API_URL}/api/users/${userId}/conexoes`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amigo_id: requestId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Erro ao cancelar solicitação: ${response.status} - ${errorText}`,
        );
      }

      const responseData = await response.json();
      setSentRequests((prev) =>
        prev.filter((request) => request.id !== requestId),
      );
      Alert.alert('Sucesso', 'Solicitação cancelada com sucesso');
      await fetchConnections();
    } catch (error) {
      setError('Erro ao cancelar solicitação');
    }
  };

  const handleUndoConnection = async (connectionId: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');

      if (!userId) {
        console.error('UserId não encontrado');
        return;
      }

      const response = await fetch(
        `${API_URL}/api/users/${userId}/conexoes/${connectionId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Erro ao desfazer conexão');
      }

      setConnections((prev) =>
        prev.filter((connection) => connection.id !== connectionId),
      );
      Alert.alert('Sucesso', 'Conexão desfeita com sucesso');
      await fetchConnections();
    } catch (error) {
      console.error('Erro ao desfazer conexão:', error);
      setError('Erro ao desfazer conexão');
    }
  };

  const handleSendRequest = async (targetUserId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const myUserId = await AsyncStorage.getItem('userId');

      if (!myUserId) {
        console.error('UserId não encontrado');
        return;
      }

      const response = await fetch(
        `${API_URL}/api/users/${myUserId}/conexoes`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ targetUserId }),
        },
      );

      if (!response.ok) {
        throw new Error('Erro ao enviar solicitação de conexão');
      }

      Alert.alert('Sucesso', 'Solicitação de conexão enviada');
      setSearchResults((prevResults) =>
        prevResults.filter((user) => user.id !== targetUserId),
      );
      await fetchConnections();
    } catch (error) {
      console.error('Erro ao enviar solicitação:', error);
      setError('Erro ao enviar solicitação de conexão');
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const [token, userId] = await Promise.all([
          AsyncStorage.getItem('token'),
          AsyncStorage.getItem('userId'),
        ]);

        console.log('Token:', token ? 'Presente' : 'Ausente');
        console.log('UserId:', userId);

        if (!token || !userId) {
          console.error('Token ou userId não encontrado no loadInitialData');
          if (isMounted) {
            setError(
              'Por favor, faça login novamente para visualizar suas conexões',
            );
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          setLoading(true);
          setError(null);
        }

        try {
          console.log('Iniciando busca de conexões...');
          const connections = await fetchConnections();
          console.log('Conexões buscadas:', connections);

          if (connections !== null && isMounted) {
            await Promise.all([
              fetchPendingRequests(),
              fetchSentRequests(),
              fetchSuggestions(),
            ]);
          }
        } catch (error) {
          console.error('Erro ao buscar dados:', error);
          if (isMounted) {
            setError('Erro ao carregar dados. Por favor, tente novamente.');
          }
        }
      } catch (error) {
        console.error('Erro no loadInitialData:', error);
        if (isMounted) {
          setError('Erro ao carregar dados. Por favor, tente novamente.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  const renderSearchSection = () => {
    return (
      <View style={styles.searchSection}>
        <Text style={styles.sectionTitle}>Buscar Usuários</Text>
        <Text style={styles.searchDescription}>
          Digite o nome do usuário que você deseja conectar
        </Text>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Digite o nome do usuário"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={[
              styles.searchButton,
              isSearching && styles.searchButtonDisabled,
            ]}
            onPress={handleSearch}
            disabled={isSearching}
          >
            <Text style={styles.buttonText}>
              {isSearching ? 'Buscando...' : 'Buscar'}
            </Text>
          </TouchableOpacity>
        </View>

        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            <Text style={styles.subsectionTitle}>Resultados da Busca</Text>
            {searchResults.map((user) => (
              <View key={user.id} style={styles.itemCard}>
                <View style={styles.userInfo}>
                  <Text style={styles.itemTitle}>{user.name}</Text>
                  <Text style={styles.itemDescription}>
                    {user.curso
                      ? `${user.curso} - ${user.semestre}º semestre`
                      : 'Perfil em andamento'}
                  </Text>
                  {user.interesses && user.interesses.length > 0 && (
                    <View style={styles.interestsContainer}>
                      {user.interesses.map((interest, index) => (
                        <Text key={index} style={styles.interestTag}>
                          {interest}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.connectButton}
                  onPress={() => handleSendRequest(user.id)}
                >
                  <Text style={styles.buttonText}>Conectar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderFilterSection = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Filtrar Conexões</Text>
        <View style={styles.filterContainer}>
          <TextInput
            style={styles.filterInput}
            placeholder="Filtrar por curso"
            value={cursoFilter}
            onChangeText={setCursoFilter}
            placeholderTextColor="#666"
          />
          <TextInput
            style={styles.filterInput}
            placeholder="Filtrar por interesses (separados por vírgula)"
            value={interessesFilter}
            onChangeText={setInteressesFilter}
            placeholderTextColor="#666"
          />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={fetchFilteredConnections}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Aplicar Filtros</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFilteredResults = () => {
    if (filteredResults.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resultados da Busca Filtrada</Text>
        {filteredResults.map((user) => (
          <View key={user.id} style={styles.itemCard}>
            <View style={styles.userInfo}>
              <Text style={styles.itemTitle}>{user.name}</Text>
              <Text style={styles.itemDescription}>
                {user.curso
                  ? `${user.curso} - ${user.semestre}º semestre`
                  : 'Perfil em andamento'}
              </Text>
              {user.interesses && user.interesses.length > 0 && (
                <View style={styles.interestsContainer}>
                  {user.interesses.map((interest, index) => (
                    <Text key={index} style={styles.interestTag}>
                      {interest}
                    </Text>
                  ))}
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.connectButton}
              onPress={() => handleSendRequest(user.id)}
            >
              <Text style={styles.buttonText}>Conectar</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  const renderSuggestions = () => {
    if (suggestions.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sugestões de Conexões</Text>
        {suggestions.map((suggestion) => (
          <View key={suggestion.id} style={styles.itemCard}>
            <View style={styles.userInfo}>
              <Text style={styles.itemTitle}>{suggestion.name}</Text>
              <Text style={styles.itemDescription}>
                {suggestion.curso} - {suggestion.semestre}º semestre
              </Text>
              {suggestion.interesses && suggestion.interesses.length > 0 && (
                <View style={styles.interestsContainer}>
                  {suggestion.interesses.map((interesse, index) => (
                    <Text key={index} style={styles.interestTag}>
                      {interesse}
                    </Text>
                  ))}
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.connectButton}
              onPress={() => handleSendRequest(suggestion.id)}
            >
              <Text style={styles.buttonText}>Conectar</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  const renderPendingRequests = () => {
    if (pendingRequests.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Solicitações Pendentes</Text>
        {pendingRequests.map((request) => (
          <View key={request.id} style={styles.itemCard}>
            <View style={styles.userInfo}>
              <Text style={styles.itemTitle}>{request.name}</Text>
              <Text style={styles.itemDescription}>
                {request.curso} - {request.semestre}º semestre
              </Text>
              {request.interesses && request.interesses.length > 0 && (
                <View style={styles.interestsContainer}>
                  {request.interesses.map(
                    (interesse: string, index: number) => (
                      <Text key={index} style={styles.interestTag}>
                        {interesse}
                      </Text>
                    ),
                  )}
                </View>
              )}
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAcceptRequest(request.id)}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Aceitar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => handleRejectRequest(request.id)}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Recusar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderSentRequests = () => {
    if (sentRequests.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Solicitações Enviadas</Text>
        {sentRequests.map((request) => (
          <View key={request.id} style={styles.itemCard}>
            <View style={styles.userInfo}>
              <Text style={styles.itemTitle}>{request.name}</Text>
              <Text style={styles.itemDescription}>
                {request.curso} - {request.semestre}º semestre
              </Text>
              {request.interesses && request.interesses.length > 0 && (
                <View style={styles.interestsContainer}>
                  {request.interesses.map(
                    (interesse: string, index: number) => (
                      <Text key={index} style={styles.interestTag}>
                        {interesse}
                      </Text>
                    ),
                  )}
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelRequest(request.id)}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  const renderConnections = () => {
    console.log('Renderizando conexões:', connections);
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Minhas Conexões</Text>
        {connections.length > 0 ? (
          connections.map((connection) => (
            <View key={connection.id} style={styles.itemCard}>
              <View style={styles.userInfo}>
                <Text style={styles.itemTitle}>{connection.name}</Text>
                <Text style={styles.itemDescription}>
                  {connection.curso} - {connection.semestre}º semestre
                </Text>
                {connection.interesses && connection.interesses.length > 0 && (
                  <View style={styles.interestsContainer}>
                    {connection.interesses.map((interesse, index) => (
                      <Text key={index} style={styles.interestTag}>
                        {interesse}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.undoButton}
                onPress={() => handleUndoConnection(connection.conexaoId)}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Desfazer</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Você ainda não tem conexões</Text>
        )}
      </View>
    );
  };

  if (!loading && error?.includes('faça login')) {
    return (
      <View style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.searchDescription}>
            Você precisa estar logado para visualizar e gerenciar suas conexões.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {renderSearchSection()}
      {renderFilterSection()}
      {renderFilteredResults()}
      {renderSuggestions()}
      {renderPendingRequests()}
      {renderSentRequests()}
      {renderConnections()}
    </ScrollView>
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
  loadingText: {
    marginTop: 10,
    color: '#007AFF',
  },
  errorText: {
    color: '#dc3545',
    textAlign: 'center',
    marginVertical: 10,
    paddingHorizontal: 15,
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 24,
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  searchSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchDescription: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginRight: 10,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  searchResults: {
    marginTop: 15,
  },
  userInfo: {
    flex: 1,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  interestTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
    fontSize: 12,
    color: '#666',
  },
  connectButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
    marginVertical: 6,
  },
  filterContainer: {
    marginBottom: 15,
  },
  filterInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsContainer: {
    marginTop: 20,
  },
  itemCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
    marginVertical: 6,
  },
  rejectButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
    marginVertical: 6,
  },
  cancelButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
    marginVertical: 6,
  },
  undoButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
    marginVertical: 6,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
  },
  interestText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
  itemTitle: {
    fontSize: 18,
    marginBottom: 5,
    color: '#007AFF',
    fontWeight: '600',
  },
  itemDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  subsectionTitle: {
    fontSize: 18,
    color: '#333',
    marginBottom: 15,
    fontWeight: '600',
  },
  searchButtonDisabled: {
    opacity: 0.7,
  },
});
