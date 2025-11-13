import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { register } from '../utils/api';

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [skinType, setSkinType] = useState('oily');
  const [dateOfBirth, setDateOfBirth] = useState(''); // YYYY-MM-DD
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const onRegister = async () => {
    setError('');
    setInfo('');
    if (!fullName || !email || !password || !skinType || !dateOfBirth) {
      setError('Please fill all fields');
      return;
    }
    try {
      setLoading(true);
      const payload = { fullName, email, password, skinType, dateOfBirth };
      const data = await register(payload);
      // Service might return user + token. Try to store token if present.
      const token = data?.data?.token || data?.token;
      const expiresAtUtc = data?.data?.expiresAtUtc || data?.expiresAtUtc;
      if (token) {
        await AsyncStorage.setItem('auth.token', token);
        if (expiresAtUtc) await AsyncStorage.setItem('auth.expiresAtUtc', String(expiresAtUtc));
        setInfo('Registered successfully');
        // Go straight to Home if token available
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      } else {
        setInfo('Registered successfully, please login');
        navigation.navigate('Login');
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Register error';
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create your account</Text>
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!info && <Text style={styles.info}>{info}</Text>}
        <TextInput style={styles.input} placeholder="Full name" value={fullName} onChangeText={setFullName} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
        <TextInput
          style={styles.input}
          placeholder="Skin type (oily/dry/normal/combination)"
          value={skinType}
          onChangeText={setSkinType}
        />
        <TextInput style={styles.input} placeholder="Date of birth (YYYY-MM-DD)" value={dateOfBirth} onChangeText={setDateOfBirth} />
        <TouchableOpacity style={styles.button} onPress={onRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkWrap}>
          <Text style={styles.linkText}>Already have an account? Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  button: { backgroundColor: '#43a047', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  linkWrap: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#1e88e5' },
  error: { color: '#d32f2f', textAlign: 'center', marginBottom: 8 },
  info: { color: '#2e7d32', textAlign: 'center', marginBottom: 8 },
});
