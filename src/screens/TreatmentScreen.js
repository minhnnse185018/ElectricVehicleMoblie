import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { createChatSession, listUserSessions } from '../utils/api';
import { getCurrentUserId } from '../utils/auth';
import { useFocusEffect } from '@react-navigation/native';

export default function TreatmentScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState('ai'); // 'ai' | 'specialist'
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [listError, setListError] = useState('');

  // 🧠 Hàm fetch danh sách phiên chat của user
  const onLoadMySessions = async () => {
    try {
      setLoadingSessions(true);
      setListError('');
      const uid = await getCurrentUserId();
      if (!uid) throw new Error('Chưa đăng nhập');
      const data = await listUserSessions({ userId: uid, pageNumber: 1, pageSize: 20 });
      const list = data?.items || data?.data?.items || data?.data || data?.results || data || [];
      setSessions(Array.isArray(list) ? list : []);
    } catch (e) {
      setListError(e?.response?.data?.message || e?.message || 'Tải danh sách phiên thất bại');
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  // 🧭 Tự động load khi màn hình mở hoặc focus lại
  useFocusEffect(
    React.useCallback(() => {
      onLoadMySessions();
    }, [])
  );

  // 🧱 Tạo session mới
  const onCreate = async () => {
    try {
      setCreating(true);
      setError('');
      const res = await createChatSession({ title: title?.trim() || undefined, channel });
      const session = res?.data || res;
      const sessionId = session?.id || session?.sessionId;
      if (sessionId) {
        navigation.getParent()?.navigate('SessionChat', { sessionId, title: (title || '').trim() || (session?.title || '') });
      } else {
        setError('Không tìm thấy sessionId');
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Tạo phiên thất bại';
      setError(String(msg));
    } finally {
      setCreating(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#fff' }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Liệu Trình</Text>
      <Text style={styles.text}>
        Xây dựng quy trình chăm sóc da cá nhân hóa cho bạn. Tại đây bạn có thể theo dõi các bước sáng/tối,
        sản phẩm gợi ý và nhắc nhở hằng ngày.
      </Text>

      {/* Tạo phiên mới */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tạo phiên tư vấn</Text>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Text style={styles.label}>Tiêu đề (mô tả vấn đề):</Text>
        <TextInput
          style={styles.input}
          placeholder="VD: Vấn đề về da mặt..."
          value={title}
          onChangeText={setTitle}
        />

        {!!title?.trim() && (
          <Text style={styles.preview}>Tieu de da nhap: {title}</Text>
        )}

        <Text style={[styles.label, { marginTop: 8 }]}>Kênh:</Text>
        <View style={styles.channelRow}>
          <TouchableOpacity
            onPress={() => setChannel('ai')}
            style={[styles.chip, channel === 'ai' && styles.chipActive]}
          >
            <Text style={[styles.chipText, channel === 'ai' && styles.chipTextActive]}>AI</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setChannel('specialist')}
            style={[styles.chip, channel === 'specialist' && styles.chipActive]}
          >
            <Text style={[styles.chipText, channel === 'specialist' && styles.chipTextActive]}>
              Chuyên viên
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.createBtn} onPress={onCreate} disabled={creating}>
          {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.createText}>Tạo phiên</Text>}
        </TouchableOpacity>
      </View>

      {/* Danh sách phiên chat */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Phiên chat của tôi</Text>
        {!!listError && <Text style={styles.error}>{listError}</Text>}

        {loadingSessions && (
          <ActivityIndicator style={{ marginVertical: 8 }} color="#22C55E" />
        )}

        {!loadingSessions && sessions.length === 0 && (
          <Text style={{ color: '#6b7280', marginTop: 8 }}>Chưa có phiên nào</Text>
        )}

        {sessions.length > 0 && (
          <View style={{ marginTop: 12 }}>
            {sessions.map((s, idx) => (
              <View key={s?.id || s?.sessionId || idx} style={styles.sessionItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionTitle}>{(s?.title || '').trim() || `Session #${s?.id || s?.sessionId}`}</Text>
                  <Text style={styles.sessionMeta}>Channel: {s?.channel || 'ai'}</Text>
                  {!!s?.state && <Text style={styles.sessionMeta}>State: {s?.state}</Text>}
                </View>
                <TouchableOpacity
                  style={styles.sessionOpenBtn}
                  onPress={() =>
                    navigation.getParent()?.navigate('SessionChat', {
                      sessionId: s?.id || s?.sessionId,
                      title: (s?.title || '').trim(),
                    })
                  }
                >
                  <Text style={styles.sessionOpenText}>Mở</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  text: { color: '#374151', lineHeight: 20 },
  card: { marginTop: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12 },
  cardTitle: { fontWeight: '700', marginBottom: 8, color: '#166534' },
  label: { color: '#374151', marginBottom: 6, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff' },
  channelRow: { flexDirection: 'row', gap: 8 },
  chip: { backgroundColor: '#E6F9EE', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 },
  chipActive: { backgroundColor: '#22C55E' },
  chipText: { color: '#166534', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  createBtn: { marginTop: 12, backgroundColor: '#22C55E', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  createText: { color: '#fff', fontWeight: '700' },
  error: { color: '#dc2626', marginBottom: 8 },
  preview: { color: '#166534', marginTop: 6, fontWeight: '600' },
  previewBox: { marginTop: 12, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10 },
  previewLabel: { color: '#374151', fontWeight: '700', marginBottom: 6 },
  code: { color: '#111827' },
  sessionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  sessionTitle: { fontWeight: '700' },
  sessionMeta: { color: '#6b7280' },
  sessionOpenBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#E6F9EE', borderRadius: 8 },
  sessionOpenText: { color: '#166534', fontWeight: '700' },
});
