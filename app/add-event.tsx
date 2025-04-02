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
} from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  role: 'student' | 'admin' | 'professor';
  department?: string;
}

export default function AddEvent() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date());
  const [category, setCategory] = useState('general');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (!userData) {
        Alert.alert('Error', 'You must be logged in to create events');
        router.replace('/login');
        return;
      }
      setUser(JSON.parse(userData));
      setIsLoading(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to verify authentication');
      router.replace('/login');
    }
  };

  const validateEvent = () => {
    if (!title || !description || !location) {
      Alert.alert('Error', 'Please fill in all required fields');
      return false;
    }

    if (new Date(date) < new Date()) {
      Alert.alert('Error', 'Event date cannot be in the past');
      return false;
    }

    if (category === 'academic' && !user?.department) {
      Alert.alert('Error', 'Academic events require department information');
      return false;
    }

    if (maxParticipants && (parseInt(maxParticipants) < 1 || parseInt(maxParticipants) > 1000)) {
      Alert.alert('Error', 'Maximum participants must be between 1 and 1000');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateEvent()) return;

    setLoading(true);
    try {
      const response = await fetch('YOUR_BACKEND_URL/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          title,
          description,
          location,
          date: date.toISOString(),
          category,
          maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
          createdBy: user?.id,
          department: user?.department,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create event');
      }

      Alert.alert('Success', 'Event created successfully');
      router.back();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter event title"
          maxLength={100}
        />

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter event description"
          multiline
          numberOfLines={4}
          maxLength={500}
        />

        <Text style={styles.label}>Location *</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="Enter event location"
          maxLength={100}
        />

        <Text style={styles.label}>Date and Time *</Text>
        <DateTimePicker
          value={date}
          mode="datetime"
          display="default"
          onChange={(event: any, selectedDate?: Date) => {
            if (selectedDate) {
              setDate(selectedDate);
            }
          }}
        />

        <Text style={styles.label}>Category *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={category}
            onValueChange={(itemValue: string) => setCategory(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="General" value="general" />
            <Picker.Item label="Academic" value="academic" />
            <Picker.Item label="Social" value="social" />
            <Picker.Item label="Sports" value="sports" />
            <Picker.Item label="Other" value="other" />
          </Picker>
        </View>

        <Text style={styles.label}>Maximum Participants (Optional)</Text>
        <TextInput
          style={styles.input}
          value={maxParticipants}
          onChangeText={setMaxParticipants}
          placeholder="Enter maximum number of participants"
          keyboardType="numeric"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating...' : 'Create Event'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
  },
  picker: {
    height: 50,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 