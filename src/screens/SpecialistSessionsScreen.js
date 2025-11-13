import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, Platform } from 'react-native';
import { listSpecialistSessions, assignSession } from '../utils/api';

export default function SpecialistSessionsScreen({ navigation }) {
  const [tab, setTab] = useState('waiting'); // waiting | mine
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const params = tab === 'waiting' ? { state: 'waiting_specialist' } : { state: 'assigned', mine: true };
      const data = await listSpecialistSessions(params);
      const list = data?.items || data?.data || data?.results || [];
      setItems(list);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Load error');
      setItems([]);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [tab, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const onClaim = async (id) => {
    try {
      await assignSession(id);
      setTab('mine');
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Claim error');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>Session #{item?.id || item?.sessionId}</Text>
        <Text style={[styles.state, stateColor(item?.state)]}>{formatState(item?.state)}</Text>
      </View>
      <Text style={styles.meta}>Channel: {item?.channel}</Text>
      {!!item?.specialistId && <Text style={styles.meta}>Specialist: {item.specialistId}</Text>}
      <View style={styles.actionsRow}>
        {tab === 'waiting' ? (
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => onClaim(item?.id || item?.sessionId)}>
            <Text style={styles.btnPrimaryText}>Claim</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => navigation.navigate('SessionChat', { sessionId: item?.id || item?.sessionId })}>
            <Text style={styles.btnSecondaryText}>Open</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'waiting' && styles.tabActive]} onPress={() => setTab('waiting')}>
          <Text style={[styles.tabText, tab === 'waiting' && styles.tabTextActive]}>Hàng chờ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'mine' && styles.tabActive]} onPress={() => setTab('mine')}>
          <Text style={[styles.tabText, tab === 'mine' && styles.tabTextActive]}>Đã gán cho tôi</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, idx) => String(item?.id || item?.sessionId || idx)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.empty}>Không có phiên nào</Text>}
        />
      )}
    </View>
  );
}

function formatState(state) {
  switch (state) {
    case 'waiting_specialist': return 'Chờ chuyên viên';
    case 'assigned': return 'Đã gán';
    case 'closed': return 'Đã đóng';
    default: return String(state || 'N/A');
  }
}

function stateColor(state) {
  if (state === 'waiting_specialist') return { color: '#b45309' };
  if (state === 'assigned') return { color: '#166534' };
  if (state === 'closed') return { color: '#6b7280' };
  return { color: '#374151' };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  tabs: { flexDirection: 'row', padding: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
  tabActive: { backgroundColor: '#F0FDF4', borderColor: '#bbf7d0' },
  tabText: { color: '#374151', fontWeight: '600' },
  tabTextActive: { color: '#166534' },

  card: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontWeight: '700', fontSize: 16 },
  state: { fontWeight: '700' },
  meta: { color: '#6b7280', marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  btnPrimary: { backgroundColor: '#22C55E' },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btnSecondary: { backgroundColor: '#E6F9EE' },
  btnSecondaryText: { color: '#166534', fontWeight: '700' },
  error: { color: '#dc2626', textAlign: 'center', marginTop: 8 },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 24 },
});

