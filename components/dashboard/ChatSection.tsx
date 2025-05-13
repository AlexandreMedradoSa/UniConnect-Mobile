import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL;
if (!API_URL) {
  throw new Error(
    'A API_URL deve ser configurada no seu Expo (em app.json ou app.config.js)',
  );
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface Connection {
  id: string;
  conexaoId: string;
  name: string;
  email: string;
  curso: string | null;
  semestre: number | null;
}

export function ChatSection() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] =
    useState<Connection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  useEffect(() => {
    if (selectedConnection) {
      loadMessages(selectedConnection.conexaoId);
    }
  }, [selectedConnection]);

  const loadConnections = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');

      if (!token || !userId) {
        setError('Erro de autenticação');
        return;
      }

      const response = await fetch(`${API_URL}/api/users/${userId}/conexoes`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar conexões');
      }

      const data = await response.json();
      setConnections(data);
      setLoading(false);
    } catch (err) {
      setError('Erro ao carregar conexões');
      setLoading(false);
    }
  };

  const loadMessages = async (conexaoId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('Erro de autenticação');
        return;
      }
      const response = await fetch(
        `${API_URL}/api/conexoes/${conexaoId}/mensagens`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok) {
        throw new Error('Erro ao carregar mensagens');
      }
      const data = await response.json();
      const mapped = (data as any[]).map((msg: any) => ({
        ...msg,
        created_at: msg.criado_em,
        content: msg.conteudo,
        sender_id: msg.remetente_id,
      }));
      setMessages(mapped);
    } catch (err) {
      setError('Erro ao carregar mensagens');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConnection) return;

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('Erro de autenticação');
        return;
      }

      const response = await fetch(
        `${API_URL}/api/conexoes/${selectedConnection.conexaoId}/mensagens`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            conteudo: newMessage,
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Erro ao enviar mensagem');
      }

      setNewMessage('');
      loadMessages(selectedConnection.conexaoId);
    } catch (err) {
      setError('Erro ao enviar mensagem');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#005BB5" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {selectedConnection ? (
        <>
          <View style={styles.chatHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedConnection(null)}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.chatHeaderText}>{selectedConnection.name}</Text>
          </View>

          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.messageContainer,
                  item.sender_id === selectedConnection.id
                    ? styles.receivedMessage
                    : styles.sentMessage,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    item.sender_id !== selectedConnection.id &&
                      styles.sentMessageText,
                  ]}
                >
                  {item.content}
                </Text>
                <Text
                  style={[
                    styles.messageTime,
                    item.sender_id !== selectedConnection.id &&
                      styles.sentMessageText,
                  ]}
                >
                  {new Date(item.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            )}
            style={styles.messagesList}
          />

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Digite sua mensagem..."
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
              <Ionicons name="send" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.connectionsContainer}>
          <Text style={styles.connectionsTitle}>Conversas</Text>
          <FlatList
            data={connections}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.connectionItem}
                onPress={() => setSelectedConnection(item)}
              >
                <Text style={styles.connectionName}>{item.name}</Text>
                {item.curso && (
                  <Text style={styles.connectionInfo}>
                    {item.curso} - {item.semestre}º semestre
                  </Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff0000',
    fontSize: 16,
    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
  },
  backButton: {
    marginRight: 8,
  },
  chatHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  messageContainer: {
    maxWidth: '85%',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 6,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#005BB5',
    borderBottomRightRadius: 5,
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f4f4f4',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    minHeight: 36,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sendButton: {
    backgroundColor: '#005BB5',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectionsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginHorizontal: 10,
    marginTop: 12,
    borderRadius: 14,
    paddingBottom: 8,
  },
  connectionsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 14,
    marginLeft: 16,
  },
  connectionItem: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    borderRadius: 0,
    marginBottom: 0,
  },
  connectionName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  connectionInfo: {
    fontSize: 13,
    color: '#666',
  },
  sentMessageText: {
    color: '#fff',
  },
});
