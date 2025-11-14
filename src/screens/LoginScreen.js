import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { login } from '../utils/api';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }
    try {
      setLoading(true);
      // POST /api/auth/local/login
      const data = await login({ email, password });
      
      // Backend trả về ServiceResult structure
      if (data?.success) {
        const token = data?.data?.token || data?.data?.Token || data?.token;
        const expiresAtUtc = data?.data?.expiresAtUtc || data?.data?.ExpiresAtUtc || data?.expiresAtUtc;
        
        if (token) {
          // ✅ Tự động phát hiện role TRƯỚC KHI lưu token
          try {
            const decoded = jwtDecode(token);
            
            // Debug: log decoded token để kiểm tra
            console.log('=== LOGIN DEBUG ===');
            console.log('Decoded token:', JSON.stringify(decoded, null, 2));
            
            // Lấy role từ token - có thể là string hoặc array
            // Kiểm tra nhiều format claims khác nhau
            let roleValue = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || 
                           decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/roles'] ||
                           decoded['role'] ||
                           decoded['roles'] ||
                           decoded.role || 
                           decoded.roles ||
                           null;
            
            console.log('Raw role value:', roleValue);
            console.log('Role value type:', typeof roleValue);
            
            // Nếu role là array, lấy phần tử đầu tiên
            let role = Array.isArray(roleValue) ? roleValue[0] : roleValue;
            // Chuẩn hóa role về lowercase để so sánh
            role = role ? String(role).toLowerCase().trim() : 'user';
            
            console.log('Final detected role:', role);
            
            // Lưu token sau khi decode thành công
            await AsyncStorage.setItem('auth.token', token);
            if (expiresAtUtc) {
              await AsyncStorage.setItem('auth.expiresAtUtc', String(expiresAtUtc));
            }
            
            // Route dựa trên role - dùng setTimeout để đảm bảo navigation chạy sau khi state update
            setTimeout(() => {
              if (role === 'specialist' || role === 'admin') {
                // Specialist/Admin → SpecialistMain
                console.log('✅ Routing to SpecialistMain...');
                navigation.reset({ index: 0, routes: [{ name: 'SpecialistMain' }] });
              } else {
                // User → Main (user flow)
                console.log('✅ Routing to Main (user flow)...');
                navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
              }
            }, 100);
          } catch (decodeError) {
            console.error('❌ Decode token error:', decodeError);
            // Fallback: chuyển đến user flow nếu không decode được
          await AsyncStorage.setItem('auth.token', token);
            if (expiresAtUtc) {
              await AsyncStorage.setItem('auth.expiresAtUtc', String(expiresAtUtc));
        }
            setTimeout(() => {
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
            }, 100);
          }
        } else {
          setError('Không nhận được token từ server');
        }
      } else {
        // Backend trả về success: false
        const errorMsg = data?.message || data?.Message || 'Đăng nhập thất bại';
        setError(errorMsg);
      }
    } catch (e) {
      // Xử lý lỗi từ axios (HTTP errors)
      const status = e?.response?.status;
      const errorData = e?.response?.data;
      
      let errorMsg = 'Đăng nhập thất bại';
      
      if (errorData?.message) {
        errorMsg = errorData.message;
      } else if (errorData?.Message) {
        errorMsg = errorData.Message;
      } else if (status === 401) {
        errorMsg = 'Email hoặc mật khẩu không đúng';
      } else if (status === 403) {
        errorMsg = 'Tài khoản không có quyền truy cập';
      } else if (status === 404) {
        errorMsg = 'Không tìm thấy tài khoản với email này';
      } else if (e?.message) {
        errorMsg = e.message;
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Đăng nhập</Text>
          <Text style={styles.subtitle}>Hệ thống sẽ tự động chuyển đến giao diện phù hợp với vai trò của bạn</Text>
        </View>
        
        {!!error && (
          <View style={styles.errorContainer}>
            <Text style={styles.error}>{error}</Text>
            {(error.includes('not active') || error.includes('inactive')) && (
              <Text style={styles.errorHint}>
                Tài khoản của bạn chưa được kích hoạt. Vui lòng liên hệ quản trị viên.
              </Text>
            )}
          </View>
        )}
        
        <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
            editable={!loading}
            placeholderTextColor="#9ca3af"
        />
        <TextInput
          style={styles.input}
            placeholder="Mật khẩu"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
            editable={!loading}
            placeholderTextColor="#9ca3af"
        />
          
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={onLogin} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Đăng nhập</Text>
            )}
        </TouchableOpacity>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Chưa có tài khoản?</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Register')}
            disabled={loading}
          >
            <Text style={styles.footerLink}>Đăng ký ngay</Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: { 
    fontSize: 28, 
    fontWeight: '700', 
    marginBottom: 8, 
    textAlign: 'center',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#111827',
  },
  button: { 
    backgroundColor: '#22C55E', 
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.7,
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  error: { 
    color: '#dc2626', 
    textAlign: 'center', 
    fontSize: 14,
    fontWeight: '600',
  },
  errorHint: {
    color: '#991b1b',
    textAlign: 'center',
    fontSize: 12,
    marginTop: 4,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    color: '#6b7280',
    fontSize: 14,
  },
  footerLink: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '600',
  },
});
