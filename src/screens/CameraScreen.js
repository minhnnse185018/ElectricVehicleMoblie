import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CameraScreen() {
  const onOpenCamera = () => {
    Alert.alert('Camera', 'Bạn có thể cài expo-camera để chụp ảnh thật.');
  };

  return (
    <View style={styles.container}>
      <Ionicons name="camera" size={64} color="#166534" />
      <Text style={styles.title}>Chụp Ảnh</Text>
      <Text style={styles.subtitle}>Nút giữa lớn nhất trên thanh tab</Text>
      <TouchableOpacity onPress={onOpenCamera} style={styles.btn}>
        <Text style={styles.btnText}>Mở camera</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', marginTop: 8 },
  subtitle: { color: '#6b7280', marginTop: 4 },
  btn: { marginTop: 16, backgroundColor: '#22C55E', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  btnText: { color: '#fff', fontWeight: '700' },
});

