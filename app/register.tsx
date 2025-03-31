import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Constants from 'expo-constants';
import { ThemedText } from '@/components/ThemedText';
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = Constants.expoConfig?.extra?.API_URL;
if (!API_URL) {
  throw new Error(
    'A API_URL deve ser configurada no seu Expo (em app.json ou app.config.js)',
  );
}

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleRegister = async () => {
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setLoading(true);

    let valid = true;

    if (!name.trim()) {
      setNameError('Nome é obrigatório');
      valid = false;
    }
    if (!email.trim()) {
      setEmailError('Email é obrigatório');
      valid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailError('Formato de email inválido');
        valid = false;
      }
    }

    if (!password) {
      setPasswordError('Senha é obrigatória');
      valid = false;
    }
    if (!confirmPassword) {
      setConfirmPasswordError('Confirmação de senha é obrigatória');
      valid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('As senhas não correspondem');
      valid = false;
    }

    if (!valid) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Erro', data.message || 'Erro ao registrar');
        setLoading(false);
        return;
      }

      Alert.alert('Sucesso', data.message || 'Usuário registrado com sucesso!');
      setLoading(false);
      router.push('/onboarding');
    } catch (error) {
      console.error('Erro na requisição de registro:', error);
      Alert.alert('Erro', 'Erro ao conectar com a API');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient colors={['#005BB5', '#007AFF']} style={styles.container}>
        <View style={styles.content}>
          <ThemedText type="title" style={styles.logoText}>
            UniConnect
          </ThemedText>
          <ThemedText type="subtitle" style={styles.welcomeText}>
            Crie sua conta e conecte-se ao seu futuro.
          </ThemedText>
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              placeholder="Nome"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
              editable={!loading}
            />
            {nameError ? (
              <ThemedText style={styles.errorText}>{nameError}</ThemedText>
            ) : null}
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
            {emailError ? (
              <ThemedText style={styles.errorText}>{emailError}</ThemedText>
            ) : null}
            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor="#999"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
            {passwordError ? (
              <ThemedText style={styles.errorText}>{passwordError}</ThemedText>
            ) : null}
            <TextInput
              style={styles.input}
              placeholder="Confirme a Senha"
              placeholderTextColor="#999"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!loading}
            />
            {confirmPasswordError ? (
              <ThemedText style={styles.errorText}>
                {confirmPasswordError}
              </ThemedText>
            ) : null}
            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText
                  type="defaultSemiBold"
                  style={styles.registerButtonText}
                >
                  Registrar
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>
          <Link href="/" style={styles.loginLink}>
            <ThemedText type="link" style={styles.loginLinkText}>
              Já tem conta? Faça login
            </ThemedText>
          </Link>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    paddingTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 18,
    color: '#e0e0e0',
    marginBottom: 30,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    marginBottom: 20,
  },
  input: {
    height: 50,
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 10,
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    color: '#FF4136',
    marginBottom: 10,
    fontSize: 14,
    alignSelf: 'flex-start',
  },
  registerButton: {
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  loginLink: { marginTop: 10 },
  loginLinkText: {
    color: '#fff',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
