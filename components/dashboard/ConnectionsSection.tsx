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
import { Ionicons } from '@expo/vector-icons';
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
        Alert.alert(
          'Atenção',
          'Por favor, preencha pelo menos um filtro antes de buscar.',
        );
        return;
      }

      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');

      if (!token || !userId) {
        throw new Error('Token ou userId não encontrado');
      }

      const params = new URLSearchParams();
      if (cursoFilter) params.append('curso', cursoFilter);
      if (interessesFilter) params.append('interesses', interessesFilter);

      const response = await fetch(
        `${API_URL}/api/users/search?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar conexões filtradas');
      }

      const data = await response.json();
      setFilteredResults(data);

      if (data.length === 0) {
        Alert.alert(
          'Nenhum resultado',
          'Não encontramos usuários com esses critérios de filtro',
        );
      }
    } catch (error) {
      console.error('Erro ao buscar conexões filtradas:', error);
      setError('Erro ao buscar conexões filtradas. Tente novamente.');
    } finally {
      setLoading(false);
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
      Alert.alert('Atenção', 'Por favor, digite algo para buscar');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');

      if (!token || !userId) {
        throw new Error('Token ou userId não encontrado');
      }

      const response = await fetch(
        `${API_URL}/api/users/search?nome=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar usuários');
      }

      const data = await response.json();
      setSearchResults(data);

      if (data.length === 0) {
        setSearchResults([]);
        Alert.alert(
          'Nenhum resultado',
          'Não encontramos usuários com esses critérios de busca',
        );
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      setError('Erro ao buscar usuários. Tente novamente.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const myUserId = await AsyncStorage.getItem('userId');

      if (!token || !myUserId) {
        throw new Error('Token ou userId não encontrado');
      }

      const response = await fetch(
        `${API_URL}/api/users/${myUserId}/conexoes/aceitar`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requestId }),
        },
      );

      if (!response.ok) {
        throw new Error('Erro ao aceitar solicitação');
      }

      Alert.alert('Sucesso', 'Solicitação aceita com sucesso!', [
        {
          text: 'OK',
          onPress: () => {
            setPendingRequests((prev) =>
              prev.filter((request) => request.id !== requestId),
            );
            fetchConnections();
          },
        },
      ]);
    } catch (error) {
      console.error('Erro ao aceitar solicitação:', error);
      Alert.alert(
        'Erro',
        'Não foi possível aceitar a solicitação. Tente novamente.',
      );
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const myUserId = await AsyncStorage.getItem('userId');

      if (!token || !myUserId) {
        throw new Error('Token ou userId não encontrado');
      }

      const response = await fetch(
        `${API_URL}/api/users/${myUserId}/conexoes/recusar`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requestId }),
        },
      );

      if (!response.ok) {
        throw new Error('Erro ao recusar solicitação');
      }

      Alert.alert('Sucesso', 'Solicitação recusada com sucesso!', [
        {
          text: 'OK',
          onPress: () => {
            setPendingRequests((prev) =>
              prev.filter((request) => request.id !== requestId),
            );
          },
        },
      ]);
    } catch (error) {
      console.error('Erro ao recusar solicitação:', error);
      Alert.alert(
        'Erro',
        'Não foi possível recusar a solicitação. Tente novamente.',
      );
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
    Alert.alert('Confirmar', 'Tem certeza que deseja desfazer esta conexão?', [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Desfazer',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('token');
            const userId = await AsyncStorage.getItem('userId');

            if (!token || !userId) {
              throw new Error('Token ou userId não encontrado');
            }

            const response = await fetch(
              `${API_URL}/api/users/${userId}/conexoes/desfazer`,
              {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ connectionId }),
              },
            );

            if (!response.ok) {
              throw new Error('Erro ao desfazer conexão');
            }

            Alert.alert('Sucesso', 'Conexão desfeita com sucesso!');
            fetchConnections();
          } catch (error) {
            console.error('Erro ao desfazer conexão:', error);
            Alert.alert(
              'Erro',
              'Não foi possível desfazer a conexão. Tente novamente.',
            );
          }
        },
      },
    ]);
  };

  const handleSendRequest = async (userId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const myUserId = await AsyncStorage.getItem('userId');

      if (!token || !myUserId) {
        throw new Error('Token ou userId não encontrado');
      }

      const response = await fetch(`${API_URL}/api/users/${userId}/conexoes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar solicitação');
      }

      Alert.alert('Sucesso', 'Solicitação de conexão enviada com sucesso!', [
        {
          text: 'OK',
          onPress: () => {
            setSearchResults((prev) =>
              prev.filter((user) => user.id !== userId),
            );
            fetchSentRequests();
          },
        },
      ]);
    } catch (error) {
      console.error('Erro ao enviar solicitação:', error);
      Alert.alert(
        'Erro',
        'Não foi possível enviar a solicitação. Tente novamente.',
      );
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchConnections(),
        fetchPendingRequests(),
        fetchSentRequests(),
        fetchSuggestions(),
      ]);
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      setError('Erro ao atualizar dados. Tente novamente.');
    } finally {
      setRefreshing(false);
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
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="search" size={24} color="#007AFF" />
          <Text style={styles.sectionTitle}>Buscar Conexões</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Encontre outros estudantes para conectar e expandir sua rede acadêmica
        </Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome, curso ou interesses"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#666"
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
      </View>
    );
  };

  const renderFilterSection = () => {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="filter" size={24} color="#007AFF" />
          <Text style={styles.sectionTitle}>Filtrar Conexões</Text>
        </View>
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
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#8E8E93" />
            <Text style={styles.emptyText}>Você ainda não tem conexões</Text>
            <Text style={styles.emptySubtext}>
              Busque por outros usuários para começar a fazer conexões
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4A90E2" />
      <Text style={styles.loadingText}>Carregando conexões...</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => {
          setError(null);
          fetchConnections();
        }}
      >
        <Text style={styles.retryButtonText}>Tentar novamente</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={48} color="#8E8E93" />
      <Text style={styles.emptyText}>Nenhuma conexão encontrada</Text>
      <Text style={styles.emptySubtext}>
        Busque por outros usuários para começar a fazer conexões
      </Text>
    </View>
  );

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
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#4A90E2']}
          tintColor="#4A90E2"
        />
      }
    >
      {renderSearchSection()}

      {searchResults.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resultados da Busca</Text>
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

      {renderFilterSection()}

      {filteredResults.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resultados Filtrados</Text>
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
      )}

      {loading ? (
        renderLoadingState()
      ) : error ? (
        renderErrorState()
      ) : (
        <>
          {renderPendingRequests()}
          {renderSentRequests()}
          {renderConnections()}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#4A90E2',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 5,
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  section: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#333',
    fontWeight: '600',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  searchContainer: {
    flexDirection: 'column',
    alignItems: 'stretch',
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 15,
    marginBottom: 8,
    maxWidth: '100%',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    alignSelf: 'stretch',
    maxWidth: '100%',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  searchResults: {
    marginTop: 12,
  },
  userInfo: {
    flex: 1,
    marginBottom: 12,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  interestTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  connectButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    marginTop: 12,
    alignSelf: 'stretch',
  },
  filterContainer: {
    marginBottom: 12,
    gap: 8,
  },
  filterInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
    maxWidth: '100%',
  },
  filterButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    maxWidth: '100%',
  },
  resultsContainer: {
    marginTop: 16,
  },
  itemCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2.5,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  undoButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  interestText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  itemTitle: {
    fontSize: 18,
    marginBottom: 8,
    color: '#007AFF',
    fontWeight: '600',
  },
  itemDescription: {
    fontSize: 16,
    color: '#555',
    lineHeight: 22,
  },
  subsectionTitle: {
    fontSize: 20,
    color: '#333',
    marginBottom: 16,
    fontWeight: '600',
  },
  searchButtonDisabled: {
    opacity: 0.7,
  },
  searchDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
});
