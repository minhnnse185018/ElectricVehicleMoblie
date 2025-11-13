import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

export default function ProfileScreen({ navigation }) {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await AsyncStorage.getItem('auth.token');
        if (token) {
          const decoded = jwtDecode(token);

          // ✅ Lấy name từ claim token
          const name =
            decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
            decoded.name ||
            decoded.email ||
            'User';

          setUserName(name);
        }
      } catch (e) {
        console.log('Decode token error:', e);
      }
    };
    loadUser();
  }, []);

  const onLogout = async () => {
    await AsyncStorage.multiRemove(['auth.token', 'auth.expiresAtUtc']);
    navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome back, {userName} 👋</Text>
      <Text style={styles.text}>Quản lý tài khoản của bạn.</Text>
      <TouchableOpacity style={styles.btn} onPress={onLogout}>
        <Text style={styles.btnText}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    color: '#166534',
  },
  text: {
    color: '#374151',
    marginBottom: 20,
  },
  btn: {
    backgroundColor: '#ef5350',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
