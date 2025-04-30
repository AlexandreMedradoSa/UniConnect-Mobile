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
      loadMessages(selectedConnection.id);
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

  const loadMessages = async (connectionId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');

      if (!token || !userId) {
        setError('Erro de autenticação');
        return;
      }

      const response = await fetch(
        `${API_URL}/api/users/${userId}/mensagens/${connectionId}`,
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
      setMessages(data);
    } catch (err) {
      setError('Erro ao carregar mensagens');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConnection) return;

    try {
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');

      if (!token || !userId) {
        setError('Erro de autenticação');
        return;
      }

      const response = await fetch(`${API_URL}/api/users/${userId}/mensagens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiver_id: selectedConnection.id,
          content: newMessage,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar mensagem');
      }

      setNewMessage('');
      loadMessages(selectedConnection.id);
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
      <View style={styles.connectionsList}>
        <FlatList
          data={connections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.connectionItem,
                selectedConnection?.id === item.id && styles.selectedConnection,
              ]}
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

      <View style={styles.chatContainer}>
        {selectedConnection ? (
          <>
            <View style={styles.chatHeader}>
              <Text style={styles.chatHeaderText}>
                Conversa com {selectedConnection.name}
              </Text>
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
                  <Text style={styles.messageText}>{item.content}</Text>
                  <Text style={styles.messageTime}>
                    {new Date(item.created_at).toLocaleTimeString()}
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
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>
              Selecione uma conexão para começar a conversar
            </Text>
          </View>
        )}
      </View>
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
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
  },
  connectionsList: {
    width: 250,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  connectionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedConnection: {
    backgroundColor: '#f0f0f0',
  },
  connectionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  connectionInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
  },
  chatHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  messagesList: {
    flex: 1,
    padding: 15,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#005BB5',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#005BB5',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyChatText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
