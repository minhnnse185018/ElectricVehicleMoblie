import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, Platform, KeyboardAvoidingView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const cardWidth = Math.min(360, width - 48);

export default function HomeScreen({ navigation }) {
  const onLogout = async () => {
    await AsyncStorage.multiRemove(['auth.token', 'auth.expiresAtUtc']);
    navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const onChatAI = () => {
    navigation.navigate('ChatAI');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.bgWrap}>
        <View style={[styles.bgDecoration, styles.bg1]} />
        <View style={[styles.bgDecoration, styles.bg2]} />
        <View style={[styles.bgDecoration, styles.bg3]} />
        <View style={[styles.bgDecoration, styles.bg4]} />
        <View style={[styles.bgDecoration, styles.bg5]} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.left}>
          <View style={styles.titleWrap}>
            <Text style={[styles.h1, { color: '#166534' }]}>Chăm Sóc Da</Text>
            <Text style={[styles.h1, { color: '#166534' }]}>Thông Minh</Text>
            <Text style={[styles.h1, { color: '#22C55E' }]}>Với Công Nghệ AI</Text>
          </View>
          <Text style={styles.description}>
            Khám phá quy trình chăm sóc da cá nhân hóa{"\n"}
            được thiết kế riêng cho bạn. Sử dụng AI tiên{"\n"}
            tiến để phân tích loại da và đưa ra lời khuyên chuyên nghiệp.
          </Text>
          <View style={styles.buttonsRow}>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary, { marginRight: 12 }]} onPress={onChatAI}>
              <Text style={styles.btnPrimaryText}>Bắt đầu tư vấn AI</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => {}}>
              <Text style={styles.btnSecondaryText}>Tìm hiểu{"\n"}thêm</Text>
            </TouchableOpacity>
          </View>
          {/* Removed specialist navigation - specialist has separate flow */}
        </View>

        <View style={styles.right}>
          <View style={[styles.interfaceCard, { width: cardWidth, height: cardWidth * 1.05 }]}>
            <View style={styles.imagesWrap}>
              <Image source={require('../../assets/splash-icon.png')} style={styles.images1} resizeMode="cover" />
              <Image source={require('../../assets/adaptive-icon.png')} style={styles.images2} resizeMode="contain" />
              <Image source={require('../../assets/icon.png')} style={styles.cr1} resizeMode="contain" />
              <Image source={require('../../assets/favicon.png')} style={styles.cr2} resizeMode="contain" />
            </View>
          </View>
        </View>


      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f7fff9' },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 },

  bgWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  bgDecoration: { position: 'absolute', borderRadius: 9999, opacity: 0.15 },
  bg1: { width: 220, height: 220, backgroundColor: '#22C55E', top: -60, left: -60 },
  bg2: { width: 160, height: 160, backgroundColor: '#166534', top: 100, right: -40 },
  bg3: { width: 120, height: 120, backgroundColor: '#22C55E', bottom: 80, left: -30 },
  bg4: { width: 180, height: 180, backgroundColor: '#16a34a', bottom: -60, right: -60 },
  bg5: { width: 90, height: 90, backgroundColor: '#059669', top: 260, left: 40 },

  left: { marginBottom: 28 },
  titleWrap: { marginBottom: 12 },
  h1: { fontSize: 28, fontWeight: '800', lineHeight: 34 },
  description: { color: '#1f2937', marginTop: 8, lineHeight: 20 },
  buttonsRow: { flexDirection: 'row', marginTop: 16 },
  btn: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: '#22C55E' },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btnSecondary: { backgroundColor: '#E6F9EE' },
  btnSecondaryText: { color: '#166534', fontWeight: '700', textAlign: 'center' },

  right: { alignItems: 'center', marginTop: 24 },
  interfaceCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  imagesWrap: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  images1: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  images2: { position: 'absolute', top: 16, right: 16, width: 96, height: 96 },
  cr1: { position: 'absolute', bottom: 16, left: 16, width: 72, height: 72 },
  cr2: { position: 'absolute', bottom: 24, right: 32, width: 40, height: 40 },

  footerActions: { marginTop: 28, alignItems: 'center' },
  logoutBtn: { paddingVertical: 10, paddingHorizontal: 18, backgroundColor: '#ef5350', borderRadius: 10 },
  logoutText: { color: '#fff', fontWeight: '600' },
});
