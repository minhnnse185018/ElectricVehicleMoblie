import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { closeSession, getChatSession, sendSessionMessage } from '../utils/api';

export default function SessionChatScreen({ route, navigation }) {
  const { sessionId } = route.params || {};
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const listRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getChatSession(sessionId);
      setSession(data?.data || data || null);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Load error');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  const onSend = async () => {
    if (!text.trim()) return;
    try {
      setSending(true);
      await sendSessionMessage(sessionId, { text });
      setText('');
      await load();
      setTimeout(() => { listRef.current?.scrollToEnd?.({ animated: true }); }, 50);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Send error');
    } finally {
      setSending(false);
    }
  };

  const onClose = async () => {
    try {
      await closeSession(sessionId);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Close error');
    }
  };

  const messages = session?.messages || session?.data?.messages || [];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>Back</Text></TouchableOpacity>
        <Text style={styles.title}>Session #{sessionId}</Text>
        <View style={{ width: 40 }} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView ref={listRef} contentContainerStyle={styles.listContent}>
            {messages.length === 0 ? (
              <Text style={styles.empty}>Chưa có tin nhắn</Text>
            ) : (
              messages.map((m, idx) => (
                <View key={m?.id || idx} style={[styles.msgRow, m?.userId === session?.ownerId ? styles.right : styles.left]}>
                  <View style={[styles.bubble, m?.userId === session?.ownerId ? styles.bubbleUser : styles.bubbleOther]}>
                    <Text style={styles.msgText}>{m?.text || m?.content || m?.message || ''}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Nhập tin nhắn..."
              value={text}
              onChangeText={setText}
              multiline
            />
            <TouchableOpacity style={styles.sendBtn} onPress={onSend} disabled={sending || session?.state === 'closed'}>
              <Text style={styles.sendText}>{sending ? '...' : 'Gửi'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.state}>Trạng thái: {session?.state}</Text>
            <TouchableOpacity style={[styles.closeBtn, session?.state === 'closed' && { opacity: 0.6 }]} onPress={onClose} disabled={session?.state === 'closed'}>
              <Text style={styles.closeText}>Đóng phiên</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { color: '#166534', fontWeight: '600' },
  title: { fontWeight: '700' },
  error: { color: '#dc2626', textAlign: 'center', marginTop: 8 },
  listContent: { padding: 16 },
  empty: { textAlign: 'center', color: '#6b7280' },
  msgRow: { flexDirection: 'row', marginBottom: 8 },
  right: { justifyContent: 'flex-end' },
  left: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12 },
  bubbleUser: { backgroundColor: '#DCFCE7' },
  bubbleOther: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  msgText: { color: '#111827' },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#fff' },
  input: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff' },
  sendBtn: { marginLeft: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#22C55E', borderRadius: 10 },
  sendText: { color: '#fff', fontWeight: '700' },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff' },
  state: { color: '#374151' },
  closeBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ef4444', borderRadius: 8 },
  closeText: { color: '#fff', fontWeight: '700' },
});

