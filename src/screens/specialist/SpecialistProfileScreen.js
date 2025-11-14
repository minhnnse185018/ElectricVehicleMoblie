import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { getProfile } from '../../utils/api';

export default function SpecialistProfileScreen() {
  const navigation = useNavigation();
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem('auth.token');
        if (token) {
          const decoded = jwtDecode(token);

          // Lấy name từ claim token
          const name =
            decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
            decoded.name ||
            decoded.email ||
            'Chuyên viên';

          // Lấy role từ claim token
          const role =
            decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
            decoded.role ||
            'user';

          // Lấy email từ claim token
          const email =
            decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
            decoded.email ||
            '';

          // Set thông tin từ token ngay (không đợi API)
          setUserName(name);
          setUserRole(role);
          setUserEmail(email);
          
          // Tắt loading ngay sau khi có data từ token
          setLoading(false);

          // Load profile từ API ở background (không block UI)
          // Dùng timeout để tránh chờ quá lâu
          Promise.race([
            getProfile(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Profile load timeout')), 5000)
            )
          ])
          .then((profile) => {
            // Chỉ update nếu có data mới
            if (profile?.fullName || profile?.FullName) {
              setUserName(profile.fullName || profile.FullName);
            }
            if (profile?.email || profile?.Email) {
              setUserEmail(profile.email || profile.Email);
            }
          })
          .catch((e) => {
            // Silently fail - đã có data từ token rồi
            if (e?.message !== 'Profile load timeout') {
              console.log('Load profile error:', e?.message || e);
            }
          });
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.log('Decode token error:', e);
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const onLogout = async () => {
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              // Xóa token trước
              await AsyncStorage.multiRemove(['auth.token', 'auth.expiresAtUtc']);
              
              // Logout về Login chung - reset navigation stack
              // Navigation structure: 
              // Stack (App) -> Tab (SpecialistMainTabs) -> Screen (SpecialistProfileScreen)
              // Cần truy cập root Stack Navigator để reset
              
              // Debug: log navigation structure
              console.log('Logout - navigation:', navigation);
              console.log('Logout - getParent():', navigation.getParent());
              console.log('Logout - getParent()?.getParent():', navigation.getParent()?.getParent());
              
              // Truy cập root Stack Navigator
              // Method 1: Dùng getParent()?.getParent()?.reset() trực tiếp
              const rootNavigation = navigation.getParent()?.getParent();
              
              if (rootNavigation) {
                // Reset navigation stack về Login từ root
                rootNavigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
                console.log('✅ Logout successful - reset to Login');
              } else {
                // Method 2: Fallback - thử với CommonActions
                const tabNavigation = navigation.getParent();
                if (tabNavigation) {
                  tabNavigation.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [{ name: 'Login' }],
                    })
                  );
                } else {
                  // Method 3: Last resort - navigate trực tiếp
                  navigation.dispatch(
                    CommonActions.navigate({
                      name: 'Login',
                    })
                  );
                }
              }
            } catch (e) {
              console.error('❌ Logout error:', e);
              // Fallback cuối cùng: show error và hướng dẫn
              Alert.alert(
                'Lỗi đăng xuất', 
                'Không thể đăng xuất tự động. Token đã được xóa. Vui lòng đóng và mở lại ứng dụng.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userName?.charAt(0)?.toUpperCase() || 'C'}
            </Text>
          </View>
        </View>
        <Text style={styles.title}>Xin chào, {userName} 👋</Text>
        <Text style={styles.subtitle}>Chuyên viên tư vấn</Text>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Vai trò</Text>
          <Text style={styles.infoValue}>
            {userRole === 'specialist' ? 'Chuyên viên' : 
             userRole === 'admin' ? 'Quản trị viên' : 
             'Người dùng'}
          </Text>
        </View>

        {userEmail && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{userEmail}</Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Trạng thái</Text>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Hoạt động</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: Platform.OS === 'ios' ? 20 : 0,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 16,
    marginTop: 40,
  },
  infoSection: {
    gap: 12,
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLabel: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  statusText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '600',
  },
  actionsSection: {
    marginTop: 'auto',
  },
  logoutBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

