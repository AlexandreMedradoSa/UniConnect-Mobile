import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
  Pressable,
  Image,
  Clipboard,
  Platform,
} from 'react-native';
import Constants from 'expo-constants';
import { ThemedText } from '@/components/ThemedText';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

type Language = 'pt-BR' | 'en-US';

const API_URL = Constants.expoConfig?.extra?.API_URL;
if (!API_URL) {
  throw new Error('A API_URL deve ser configurada no seu expo.');
}


const TRANSLATIONS = {
  'pt-BR': {
    title: 'Bem-vindo ao UniConnect!',
    subtitle: 'Vamos personalizar seu perfil para uma melhor experiência.',
    steps: {
      academic: 'Informações Acadêmicas',
      professional: 'Perfil Profissional',
      about: 'Sobre Você',
      preferences: 'Preferências',
    },
    fields: {
      course: 'Curso',
      semester: 'Semestre',
      age: 'Idade',
      interests: 'Interesses',
      bio: 'Biografia',
      github: 'GitHub',
      linkedin: 'LinkedIn',
      portfolio: 'Portfólio',
      photo: 'Adicionar foto',
    },
    placeholders: {
      course: 'Selecione seu curso',
      semester: 'Selecione seu semestre',
      age: 'Ex: 20',
      interests: 'Adicionar interesse personalizado',
      bio: 'Conte um pouco sobre você',
      github: 'Ex: github.com/seu-usuario',
      linkedin: 'Ex: linkedin.com/in/seu-perfil',
      portfolio: 'Ex: seu-portfolio.com',
    },
    buttons: {
      next: 'Próximo',
      back: 'Voltar',
      confirm: 'Concluir',
      skip: 'Pular e completar depois',
      copy: 'Copiar',
      add: 'Adicionar',
      preview: 'Ver Preview',
      hidePreview: 'Ocultar Preview',
    },
    errors: {
      invalidAge: 'A idade deve estar entre 16 e 100 anos',
      invalidUrl: 'Por favor, insira uma URL válida',
      copied: 'URL copiada para a área de transferência!',
    },
    tooltips: {
      course: 'Selecione seu curso atual ou escolha "Outro" para adicionar um curso personalizado.',
      semester: 'Selecione o semestre atual do seu curso.',
      age: 'Digite sua idade (entre 16 e 100 anos).',
      interests: 'Selecione ou adicione suas áreas de interesse. Você pode adicionar até 5 interesses.',
      bio: 'Conte um pouco sobre você, seus objetivos e experiências (máximo 500 caracteres).',
      github: 'Cole o link do seu perfil do GitHub (ex: github.com/seu-usuario).',
      linkedin: 'Cole o link do seu perfil do LinkedIn (ex: linkedin.com/in/seu-perfil).',
      portfolio: 'Cole o link do seu portfólio pessoal ou profissional.',
    },
  },
  'en-US': {
    title: 'Welcome to UniConnect!',
    subtitle: "Let's personalize your profile for a better experience.",
    steps: {
      academic: 'Academic Information',
      professional: 'Professional Profile',
      about: 'About You',
      preferences: 'Preferences',
    },
    fields: {
      course: 'Course',
      semester: 'Semester',
      age: 'Age',
      interests: 'Interests',
      bio: 'Biography',
      github: 'GitHub',
      linkedin: 'LinkedIn',
      portfolio: 'Portfolio',
      photo: 'Add photo',
    },
    placeholders: {
      course: 'Select your course',
      semester: 'Select your semester',
      age: 'Ex: 20',
      interests: 'Add custom interest',
      bio: 'Tell us about yourself',
      github: 'Ex: github.com/your-username',
      linkedin: 'Ex: linkedin.com/in/your-profile',
      portfolio: 'Ex: your-portfolio.com',
    },
    buttons: {
      next: 'Next',
      back: 'Back',
      confirm: 'Complete',
      skip: 'Skip and complete later',
      copy: 'Copy',
      add: 'Add',
      preview: 'View Preview',
      hidePreview: 'Hide Preview',
    },
    errors: {
      invalidAge: 'Age must be between 16 and 100 years',
      invalidUrl: 'Please enter a valid URL',
      copied: 'URL copied to clipboard!',
    },
    tooltips: {
      course: 'Select your current course or choose "Other" to add a custom course.',
      semester: 'Select your current semester.',
      age: 'Enter your age (between 16 and 100 years).',
      interests: 'Select or add your areas of interest. You can add up to 5 interests.',
      bio: 'Tell us about yourself, your goals and experiences (maximum 500 characters).',
      github: 'Paste your GitHub profile link (ex: github.com/your-username).',
      linkedin: 'Paste your LinkedIn profile link (ex: linkedin.com/in/your-profile).',
      portfolio: 'Paste your personal or professional portfolio link.',
    },
  },
};

export default function OnboardingScreen() {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [course, setCourse] = useState('');
  const [otherCourse, setOtherCourse] = useState('');
  const [showOtherCourseInput, setShowOtherCourseInput] = useState(false);
  const [semester, setSemester] = useState('');
  const [age, setAge] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  const [bio, setBio] = useState('');
  const [github, setGithub] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [language, setLanguage] = useState<Language>('pt-BR');
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  const [availableInterests, setAvailableInterests] = useState<string[]>([]);
  const router = useRouter();
  const t = TRANSLATIONS[language];

  useEffect(() => {
    loadProgress();
    loadInteresses();
    loadCursos();
  }, []);

  const loadProgress = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/');
        return;
      }

      const response = await fetch(`${API_URL}/api/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar perfil');
      }

      const data = await response.json();
      
      setCurrentStep(1);
      setCourse(data.curso || '');
      setSemester(data.semestre || '');
      setAge(data.idade?.toString() || '');
      setInterests(data.interesses ? data.interesses.split(', ') : []);
      setBio(data.biografia || '');
      setGithub(data.github || '');
      setLinkedin(data.linkedin || '');
      setPortfolio(data.portfolio || '');
      setProfileImage(data.foto_perfil || null);
    } catch (error) {
      console.error('Erro ao carregar progresso:', error);
    }
  };

  const loadInteresses = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/');
        return;
      }

      const response = await fetch(`${API_URL}/api/interesses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar interesses');
      }

      const data = await response.json();
      setAvailableInterests(data);
    } catch (error) {
      console.error('Erro ao carregar interesses:', error);
    }
  };

  const loadCursos = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/');
        return;
      }

      const response = await fetch(`${API_URL}/api/cursos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar cursos');
      }

      const data = await response.json();
      setAvailableCourses(data);
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
    }
  };

  const saveProgress = async () => {
    try {
      const progress = {
        step: currentStep,
        course,
        semester,
        age,
        interests,
        bio,
        github,
        linkedin,
        portfolio,
        profileImage,
      };
      await AsyncStorage.setItem('onboardingProgress', JSON.stringify(progress));
    } catch (error) {
      console.error('Erro ao salvar progresso:', error);
    }
  };

  useEffect(() => {
    saveProgress();
  }, [currentStep, course, semester, age, interests, bio, github, linkedin, portfolio, profileImage]);

  const validateAge = (value: string) => {
    const ageNum = parseInt(value);
    if (isNaN(ageNum) || ageNum < 16 || ageNum > 100) {
      return false;
    }
    return true;
  };

  const handleAgeChange = (value: string) => {
    if (value === '' || /^\d+$/.test(value)) {
      setAge(value);
    }
  };

  const validateUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setString(text);
    Alert.alert('Sucesso', t.errors.copied);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          Alert.alert('Erro', 'Sessão expirada. Por favor, faça login novamente.');
          return;
        }

        const formData = new FormData();
        formData.append('foto', {
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: 'foto_perfil.jpg',
        } as any);

        const response = await fetch(`${API_URL}/api/profile/foto`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Erro ao fazer upload da foto');
        }

        const data = await response.json();
        setProfileImage(data.foto_perfil);
        Alert.alert('Sucesso', 'Foto de perfil atualizada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      Alert.alert('Erro', 'Erro ao fazer upload da foto de perfil');
    }
  };

  const handleAddCustomInterest = async () => {
    if (customInterest.trim() && !interests.includes(customInterest.trim())) {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          Alert.alert('Erro', 'Sessão expirada. Por favor, faça login novamente.');
          return;
        }

        const response = await fetch(`${API_URL}/api/interesses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nome: customInterest.trim(),
          }),
        });

        if (!response.ok) {
          throw new Error('Erro ao adicionar interesse');
        }

        const data = await response.json();
        setInterests([...interests, data.nome]);
        setCustomInterest('');
        Alert.alert('Sucesso', 'Interesse adicionado com sucesso!');
      } catch (error) {
        console.error('Erro ao adicionar interesse:', error);
        Alert.alert('Erro', 'Erro ao adicionar interesse personalizado');
      }
    }
  };

  const renderTooltip = (field: keyof typeof TRANSLATIONS['pt-BR']['tooltips']) => {
    return (
      <View style={styles.tooltipContainer}>
        <ThemedText style={styles.tooltipText}>{TRANSLATIONS[language].tooltips[field]}</ThemedText>
        <TouchableOpacity
          style={styles.closeTooltip}
          onPress={() => setShowTooltip(null)}
        >
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderPreview = () => (
    <View style={styles.previewContainer}>
      <View style={styles.previewCard}>
        {profileImage && (
          <Image source={{ uri: profileImage }} style={styles.previewImage} />
        )}
        <ThemedText style={styles.previewName}>Seu Nome</ThemedText>
        <ThemedText style={styles.previewCourse}>{course}</ThemedText>
        <ThemedText style={styles.previewSemester}>{semester}</ThemedText>
        
        <View style={styles.previewInterests}>
          {interests.map((interest) => (
            <TouchableOpacity key={interest} style={styles.previewTag}>
              <ThemedText style={styles.previewTagText}>{interest}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <ThemedText style={styles.previewBio}>{bio}</ThemedText>

        <View style={styles.previewLinks}>
          {github && (
            <TouchableOpacity style={styles.previewLink}>
              <Ionicons name="logo-github" size={24} color="#333" />
              <ThemedText style={styles.previewLinkText}>GitHub</ThemedText>
            </TouchableOpacity>
          )}
          {linkedin && (
            <TouchableOpacity style={styles.previewLink}>
              <Ionicons name="logo-linkedin" size={24} color="#333" />
              <ThemedText style={styles.previewLinkText}>LinkedIn</ThemedText>
            </TouchableOpacity>
          )}
          {portfolio && (
            <TouchableOpacity style={styles.previewLink}>
              <Ionicons name="globe" size={24} color="#333" />
              <ThemedText style={styles.previewLinkText}>Portfólio</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const handleSubmit = async () => {
    if (!course.trim() || !semester.trim() || !age.trim()) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (github && !validateUrl(github)) {
      Alert.alert('Erro', t.errors.invalidUrl);
      return;
    }

    if (linkedin && !validateUrl(linkedin)) {
      Alert.alert('Erro', t.errors.invalidUrl);
      return;
    }

    if (portfolio && !validateUrl(portfolio)) {
      Alert.alert('Erro', t.errors.invalidUrl);
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Erro', 'Sessão expirada. Por favor, faça login novamente.');
        router.replace('/');
        return;
      }

      // Atualiza o perfil do usuário
      const response = await fetch(`${API_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          curso: course,
          semestre: semester,
          idade: parseInt(age),
          interesses: interests.join(', '),
          biografia: bio.trim(),
          github: github.trim(),
          linkedin: linkedin.trim(),
          portfolio: portfolio.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Erro', data.message || 'Erro ao atualizar perfil');
        setLoading(false);
        return;
      }

      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
      router.replace('/dashboard');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      Alert.alert('Erro', 'Erro ao conectar com a API');
      setLoading(false);
    }
  };

  const toggleInterest = async (interest: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Erro', 'Sessão expirada. Por favor, faça login novamente.');
        return;
      }

      const isSelected = interests.includes(interest);
      const response = await fetch(`${API_URL}/api/profile/interesses`, {
        method: isSelected ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          interesse: interest,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar interesses');
      }

      setInterests(prev =>
        isSelected
          ? prev.filter(i => i !== interest)
          : [...prev, interest]
      );
    } catch (error) {
      console.error('Erro ao atualizar interesse:', error);
      Alert.alert('Erro', 'Erro ao atualizar interesse');
    }
  };

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      router.replace('/dashboard');
    } catch (error) {
      console.error('Erro ao pular onboarding:', error);
    }
  };

  const handleCourseSelect = (selectedCourse: string) => {
    if (selectedCourse === 'Outro') {
      setShowOtherCourseInput(true);
    } else {
      setCourse(selectedCourse);
      setShowOtherCourseInput(false);
      setShowCoursePicker(false);
    }
  };

  const handleOtherCourseSubmit = async () => {
    if (otherCourse.trim()) {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          Alert.alert('Erro', 'Sessão expirada. Por favor, faça login novamente.');
          return;
        }

        const response = await fetch(`${API_URL}/api/cursos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nome: otherCourse.trim(),
          }),
        });

        if (!response.ok) {
          throw new Error('Erro ao adicionar curso');
        }

        const data = await response.json();
        setCourse(data.nome);
        setShowOtherCourseInput(false);
        setShowCoursePicker(false);
        setOtherCourse('');
        Alert.alert('Sucesso', 'Curso adicionado com sucesso!');
      } catch (error) {
        console.error('Erro ao adicionar curso:', error);
        Alert.alert('Erro', 'Erro ao adicionar curso personalizado');
      }
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(currentStep / 4) * 100}%` }]} />
      </View>
      <ThemedText style={styles.progressText}>Passo {currentStep} de 4</ThemedText>
    </View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <ThemedText style={styles.sectionTitle}>{t.steps.academic}</ThemedText>
            
            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => setShowTooltip('course')}
            >
              <Ionicons name="help-circle-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
            {showTooltip === 'course' && renderTooltip('course')}

            <ThemedText style={styles.label}>{t.fields.course} *</ThemedText>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowCoursePicker(true)}
            >
              <ThemedText style={styles.pickerButtonText}>
                {course || t.placeholders.course}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => setShowTooltip('semester')}
            >
              <Ionicons name="help-circle-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
            {showTooltip === 'semester' && renderTooltip('semester')}

            <ThemedText style={styles.label}>{t.fields.semester} *</ThemedText>
            <TextInput
              style={styles.input}
              placeholder={t.placeholders.semester}
              placeholderTextColor="#999"
              value={semester}
              onChangeText={setSemester}
              editable={!loading}
            />

            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => setShowTooltip('age')}
            >
              <Ionicons name="help-circle-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
            {showTooltip === 'age' && renderTooltip('age')}

            <ThemedText style={styles.label}>{t.fields.age}</ThemedText>
            <TextInput
              style={styles.input}
              placeholder={t.placeholders.age}
              placeholderTextColor="#999"
              value={age}
              onChangeText={handleAgeChange}
              keyboardType="numeric"
              editable={!loading}
            />
            {age && !validateAge(age) && (
              <ThemedText style={styles.errorText}>
                {t.errors.invalidAge}
              </ThemedText>
            )}

            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => {
                if (validateAge(age)) {
                  setCurrentStep(2);
                } else {
                  Alert.alert('Erro', t.errors.invalidAge);
                }
              }}
            >
              <ThemedText style={styles.buttonText}>{t.buttons.next}</ThemedText>
            </TouchableOpacity>
          </>
        );
      case 2:
        return (
          <>
            <ThemedText style={styles.sectionTitle}>{t.steps.professional}</ThemedText>

            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => setShowTooltip('github')}
            >
              <Ionicons name="help-circle-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
            {showTooltip === 'github' && renderTooltip('github')}

            <ThemedText style={styles.label}>{t.fields.github}</ThemedText>
            <View style={styles.urlContainer}>
              <TextInput
                style={[styles.input, styles.urlInput]}
                placeholder={t.placeholders.github}
                placeholderTextColor="#999"
                value={github}
                onChangeText={setGithub}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => copyToClipboard('github.com/seu-usuario')}
              >
                <ThemedText style={styles.copyButtonText}>{t.buttons.copy}</ThemedText>
              </TouchableOpacity>
            </View>
            {github && !validateUrl(github) && (
              <ThemedText style={styles.errorText}>
                {t.errors.invalidUrl}
              </ThemedText>
            )}

            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => setShowTooltip('linkedin')}
            >
              <Ionicons name="help-circle-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
            {showTooltip === 'linkedin' && renderTooltip('linkedin')}

            <ThemedText style={styles.label}>{t.fields.linkedin}</ThemedText>
            <View style={styles.urlContainer}>
              <TextInput
                style={[styles.input, styles.urlInput]}
                placeholder={t.placeholders.linkedin}
                placeholderTextColor="#999"
                value={linkedin}
                onChangeText={setLinkedin}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => copyToClipboard('linkedin.com/in/seu-perfil')}
              >
                <ThemedText style={styles.copyButtonText}>{t.buttons.copy}</ThemedText>
              </TouchableOpacity>
            </View>
            {linkedin && !validateUrl(linkedin) && (
              <ThemedText style={styles.errorText}>
                {t.errors.invalidUrl}
              </ThemedText>
            )}

            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => setShowTooltip('portfolio')}
            >
              <Ionicons name="help-circle-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
            {showTooltip === 'portfolio' && renderTooltip('portfolio')}

            <ThemedText style={styles.label}>{t.fields.portfolio}</ThemedText>
            <View style={styles.urlContainer}>
              <TextInput
                style={[styles.input, styles.urlInput]}
                placeholder={t.placeholders.portfolio}
                placeholderTextColor="#999"
                value={portfolio}
                onChangeText={setPortfolio}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => copyToClipboard('seu-portfolio.com')}
              >
                <ThemedText style={styles.copyButtonText}>{t.buttons.copy}</ThemedText>
              </TouchableOpacity>
            </View>
            {portfolio && !validateUrl(portfolio) && (
              <ThemedText style={styles.errorText}>
                {t.errors.invalidUrl}
              </ThemedText>
            )}

            <View style={styles.navigationButtons}>
              <TouchableOpacity
                style={[styles.navButton, styles.backButton]}
                onPress={() => setCurrentStep(1)}
              >
                <ThemedText style={styles.buttonText}>{t.buttons.back}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navButton, styles.nextButton]}
                onPress={() => setCurrentStep(3)}
              >
                <ThemedText style={styles.buttonText}>{t.buttons.next}</ThemedText>
              </TouchableOpacity>
            </View>
          </>
        );
      case 3:
        return (
          <>
            <ThemedText style={styles.sectionTitle}>{t.steps.about}</ThemedText>

            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => setShowTooltip('interests')}
            >
              <Ionicons name="help-circle-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
            {showTooltip === 'interests' && renderTooltip('interests')}

            <ThemedText style={styles.label}>{t.fields.interests}</ThemedText>
            <View style={styles.tagsContainer}>
              {availableInterests.map((tag) => (
                <Pressable
                  key={tag}
                  style={[
                    styles.tag,
                    interests.includes(tag) && styles.selectedTag,
                  ]}
                  onPress={() => toggleInterest(tag)}
                >
                  <ThemedText
                    style={[
                      styles.tagText,
                      interests.includes(tag) && styles.selectedTagText,
                    ]}
                  >
                    {tag}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <View style={styles.customInterestContainer}>
              <TextInput
                style={[styles.input, styles.customInterestInput]}
                placeholder={t.placeholders.interests}
                placeholderTextColor="#999"
                value={customInterest}
                onChangeText={setCustomInterest}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.addInterestButton}
                onPress={handleAddCustomInterest}
                disabled={!customInterest.trim()}
              >
                <ThemedText style={styles.addInterestButtonText}>{t.buttons.add}</ThemedText>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => setShowTooltip('bio')}
            >
              <Ionicons name="help-circle-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
            {showTooltip === 'bio' && renderTooltip('bio')}

            <ThemedText style={styles.label}>{t.fields.bio}</ThemedText>
            <View style={styles.bioContainer}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t.placeholders.bio}
                placeholderTextColor="#999"
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
                maxLength={500}
                editable={!loading}
              />
              <ThemedText style={styles.bioCounter}>
                {bio.length}/500
              </ThemedText>
            </View>

            <View style={styles.navigationButtons}>
              <TouchableOpacity
                style={[styles.navButton, styles.backButton]}
                onPress={() => setCurrentStep(2)}
              >
                <ThemedText style={styles.buttonText}>{t.buttons.back}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navButton, styles.nextButton]}
                onPress={() => setCurrentStep(4)}
              >
                <ThemedText style={styles.buttonText}>{t.buttons.next}</ThemedText>
              </TouchableOpacity>
            </View>
          </>
        );
      case 4:
        return (
          <>
            <ThemedText style={styles.sectionTitle}>{t.steps.preferences}</ThemedText>

            <TouchableOpacity
              style={styles.photoUploadButton}
              onPress={pickImage}
            >
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera" size={40} color="#007AFF" />
                  <ThemedText style={styles.photoPlaceholderText}>
                    {t.fields.photo}
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.navigationButtons}>
              <TouchableOpacity
                style={[styles.navButton, styles.backButton]}
                onPress={() => setCurrentStep(3)}
              >
                <ThemedText style={styles.buttonText}>{t.buttons.back}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navButton, styles.submitButton]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.buttonText}>{t.buttons.confirm}</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </>
        );
      default:
        return null;
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'pt-BR' ? 'en-US' : 'pt-BR');
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient colors={['#005BB5', '#007AFF']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.header}>
              <ThemedText type="title" style={styles.title}>
                {t.title}
              </ThemedText>
              <TouchableOpacity
                style={styles.languageButton}
                onPress={toggleLanguage}
              >
                <ThemedText style={styles.languageButtonText}>
                  {language === 'pt-BR' ? 'EN' : 'PT'}
                </ThemedText>
              </TouchableOpacity>
            </View>
            <ThemedText type="subtitle" style={styles.subtitle}>
              {t.subtitle}
            </ThemedText>

            {renderProgressBar()}

            <View style={styles.card}>
              {renderStep()}
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.previewButton}
                onPress={() => setShowPreview(!showPreview)}
              >
                <ThemedText style={styles.previewButtonText}>
                  {showPreview ? t.buttons.hidePreview : t.buttons.preview}
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <ThemedText style={styles.skipButtonText}>
                  {t.buttons.skip}
                </ThemedText>
              </TouchableOpacity>
            </View>

            {showPreview && renderPreview()}
          </View>
        </ScrollView>
      </LinearGradient>

      {showCoursePicker && (
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Selecione seu curso</ThemedText>
            {availableCourses.map((c) => (
              <TouchableOpacity
                key={c}
                style={styles.modalOption}
                onPress={() => handleCourseSelect(c)}
              >
                <ThemedText style={styles.modalOptionText}>{c}</ThemedText>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleCourseSelect('Outro')}
            >
              <ThemedText style={styles.modalOptionText}>Outro</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showOtherCourseInput && (
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Qual é seu curso?</ThemedText>
            <TextInput
              style={[styles.input, styles.modalInput]}
              placeholder="Digite o nome do seu curso"
              placeholderTextColor="#999"
              value={otherCourse}
              onChangeText={setOtherCourse}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowOtherCourseInput(false);
                  setOtherCourse('');
                }}
              >
                <ThemedText style={styles.modalButtonText}>Cancelar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleOtherCourseSubmit}
                disabled={!otherCourse.trim()}
              >
                <ThemedText style={styles.modalButtonText}>Confirmar</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#e0e0e0',
    marginBottom: 30,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  progressText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#333',
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerButton: {
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#333',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  tag: {
    backgroundColor: '#f7f7f7',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  selectedTag: {
    backgroundColor: '#007AFF',
  },
  tagText: {
    color: '#333',
    fontSize: 14,
  },
  selectedTagText: {
    color: '#fff',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  navButton: {
    flex: 1,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  backButton: {
    backgroundColor: '#e0e0e0',
  },
  nextButton: {
    backgroundColor: '#007AFF',
  },
  submitButton: {
    backgroundColor: '#28a745',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: 20,
    padding: 10,
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    textDecorationLine: 'underline',
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
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  modalInput: {
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#e0e0e0',
  },
  modalConfirmButton: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tooltipContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tooltipText: {
    color: '#fff',
    flex: 1,
    marginRight: 10,
  },
  closeTooltip: {
    padding: 5,
  },
  previewContainer: {
    marginTop: 20,
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  previewName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  previewCourse: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  previewSemester: {
    fontSize: 14,
    color: '#888',
    marginBottom: 15,
  },
  previewInterests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 15,
  },
  previewTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    margin: 5,
  },
  previewTagText: {
    fontSize: 12,
    color: '#666',
  },
  previewBio: {
    textAlign: 'center',
    marginBottom: 15,
    color: '#444',
  },
  previewLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  previewLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  previewLinkText: {
    color: '#007AFF',
    fontSize: 14,
  },
  actionButtons: {
    marginTop: 20,
  },
  previewButton: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  previewButtonText: {
    color: '#007AFF',
    textAlign: 'center',
    fontWeight: '600',
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  urlInput: {
    flex: 1,
  },
  copyButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  bioCounter: {
    position: 'absolute',
    right: 10,
    bottom: 5,
    fontSize: 12,
    color: '#999',
  },
  customInterestContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  customInterestInput: {
    flex: 1,
  },
  addInterestButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
  },
  addInterestButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  helpButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 5,
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: -15,
    marginBottom: 15,
  },
  bioContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  photoUploadButton: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  photoPlaceholderText: {
    color: '#007AFF',
    marginTop: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  languageButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
  },
  languageButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
}); 