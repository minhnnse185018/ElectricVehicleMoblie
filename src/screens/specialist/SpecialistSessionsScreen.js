import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { listSpecialistSessions, assignSession } from '../../utils/api';

export default function SpecialistSessionsScreen() {
  const navigation = useNavigation();
  const [tab, setTab] = useState('waiting'); // waiting | mine
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState(''); // Debug info for mobile

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      // Tab 'waiting': state=waiting_specialist (no mine param)
      // Tab 'mine': state=assigned, mine=true (only sessions assigned to current specialist)
      const params = tab === 'waiting' 
        ? { state: 'waiting_specialist', pageNumber: 1, pageSize: 20 } 
        : { state: 'assigned', mine: true, pageNumber: 1, pageSize: 20 };
      
      const data = await listSpecialistSessions(params);
      
      // Debug: log response structure
      console.log('=== SpecialistSessionsScreen Load ===');
      console.log('Tab:', tab);
      console.log('Params:', params);
      console.log('Raw data from listSpecialistSessions:', JSON.stringify(data, null, 2));
      console.log('data?.items:', data?.items);
      console.log('data?.Items:', data?.Items);
      console.log('data?.data?.items:', data?.data?.items);
      console.log('data?.data:', data?.data);
      
      // Response: { items: [], totalCount: 0, pageNumber: 1, pageSize: 20 }
      // Support both camelCase and PascalCase from backend
      // Also check if data is directly ServiceResult: { success: true, data: { items: [] } }
      const list = Array.isArray(data?.items) ? data.items : 
                   Array.isArray(data?.Items) ? data.Items : 
                   Array.isArray(data?.data?.items) ? data.data.items :
                   Array.isArray(data?.data?.Items) ? data.data.Items :
                   Array.isArray(data) ? data : [];
      
      console.log('Final list:', list);
      console.log('List length:', list.length);
      
      // Debug info for mobile (visible on screen) - include more details
      const debugMsg = `Tab: ${tab}\nItems: ${list.length}\nHas items: ${!!data?.items}\nHas Items: ${!!data?.Items}\nHas data.items: ${!!data?.data?.items}\nData keys: ${Object.keys(data || {}).join(', ')}\nData type: ${typeof data}\nIs Array: ${Array.isArray(data)}`;
      setDebugInfo(debugMsg);
      
      setItems(list);
    } catch (e) {
      // Debug: log error
      console.error('=== SpecialistSessionsScreen Load ERROR ===');
      console.error('Error:', e);
      console.error('Error response:', e?.response);
      console.error('Error status:', e?.response?.status);
      console.error('Error data:', e?.response?.data);
      
      // Backend returns 404 if no sessions found
      if (e?.response?.status === 404) {
        setItems([]);
        setError('');
        // Debug info for 404
        setDebugInfo(`Tab: ${tab}\n404 - No sessions found\nStatus: 404\nMessage: ${e?.response?.data?.message || 'Not found'}`);
      } else {
        const errorMsg = e?.response?.data?.message || e?.message || 'Lỗi tải danh sách phiên';
        setError(errorMsg);
        setItems([]);
        // Debug info for error
        setDebugInfo(`Tab: ${tab}\nError: ${errorMsg}\nStatus: ${e?.response?.status || 'unknown'}\nMessage: ${e?.message || 'Unknown error'}`);
      }
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
      setError('');
      setLoading(true);
      // POST /api/chat/sessions/{sessionId}/assignments
      // Backend assigns session to current specialist (from JWT)
      // Response: { success: true, data: { ...ChatSessionDto } }
      await assignSession(id);
      
      // Reload to refresh list - session will move from 'waiting' to 'mine'
      await load(false);
      
      // Switch to 'mine' tab to show the newly assigned session
      setTab('mine');
    } catch (e) {
      // Backend returns 409 if session already assigned or 403 if not allowed
      const errorMsg = e?.response?.data?.message || e?.message || 'Nhận phiên thất bại';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    // Backend ChatSessionDto fields: SessionId, UserId, Title, State, Channel, SpecialistId, AssignedAt, ClosedAt, CreatedAt
    // Support both camelCase and PascalCase from backend response
    const sessionId = item?.sessionId || item?.SessionId || item?.id;
    const sessionTitle = item?.title || item?.Title || `Phiên #${sessionId?.substring(0, 8)}`;
    const sessionState = item?.state || item?.State || 'waiting_specialist';
    const channel = item?.channel || item?.Channel || 'specialist';
    const createdAt = item?.createdAt || item?.CreatedAt;
    const assignedAt = item?.assignedAt || item?.AssignedAt;
    const closedAt = item?.closedAt || item?.ClosedAt;
    const userId = item?.userId || item?.UserId;
    const specialistId = item?.specialistId || item?.SpecialistId;
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{sessionTitle}</Text>
            <Text style={[styles.stateBadge, stateColor(sessionState)]}>{formatState(sessionState)}</Text>
          </View>
          {createdAt && (
            <Text style={styles.meta}>
              Tạo: {new Date(createdAt).toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          )}
          {assignedAt && (
            <Text style={styles.meta}>
              Gán: {new Date(assignedAt).toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          )}
          {closedAt && (
            <Text style={styles.meta}>
              Đóng: {new Date(closedAt).toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          )}
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Kênh:</Text>
            <Text style={styles.metaValue}>
              {channel === 'specialist' ? 'Chuyên viên' : channel === 'ai' ? 'AI' : channel}
            </Text>
          </View>
          {userId && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Người dùng:</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {String(userId).substring(0, 8)}...
              </Text>
            </View>
          )}
          {specialistId && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Chuyên viên:</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {String(specialistId).substring(0, 8)}...
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.actionsRow}>
          {tab === 'waiting' ? (
            <TouchableOpacity 
              style={[styles.btn, styles.btnPrimary, sessionState === 'closed' && styles.btnDisabled]} 
              onPress={() => onClaim(sessionId)}
              disabled={sessionState === 'closed' || loading}
            >
              <Text style={styles.btnPrimaryText}>Nhận phiên</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.btn, styles.btnSecondary]} 
              onPress={() => {
                // Navigate to SpecialistChat screen in root Stack Navigator
                // Get parent navigator (Stack) from Tab navigator
                const rootNavigation = navigation.getParent()?.getParent();
                if (rootNavigation) {
                  rootNavigation.navigate('SpecialistChat', { sessionId });
                } else {
                  // Fallback: try direct navigation
                  navigation.navigate('SpecialistChat', { sessionId });
                }
              }}
            >
              <Text style={styles.btnSecondaryText}>Mở chat</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý phiên chat</Text>
        <Text style={styles.headerSubtitle}>Quản lý các phiên chat với người dùng</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, tab === 'waiting' && styles.tabActive]} 
          onPress={() => setTab('waiting')}
        >
          <Text style={[styles.tabText, tab === 'waiting' && styles.tabTextActive]}>Hàng chờ</Text>
          {tab === 'waiting' && items.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{items.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, tab === 'mine' && styles.tabActive]} 
          onPress={() => setTab('mine')}
        >
          <Text style={[styles.tabText, tab === 'mine' && styles.tabTextActive]}>Đã gán cho tôi</Text>
          {tab === 'mine' && items.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{items.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}
      
      {/* Debug info for mobile (temporary) - always show for debugging */}
      {debugInfo ? (
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>{debugInfo}</Text>
          <Text style={styles.debugText}>{error ? `\nError: ${error}` : ''}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, idx) => String(item?.id || item?.sessionId || idx)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#22C55E']}
              tintColor="#22C55E"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.empty}>Không có phiên nào</Text>
              <Text style={styles.emptyHint}>
                {tab === 'waiting' 
                  ? 'Hiện tại không có phiên nào đang chờ' 
                  : 'Bạn chưa nhận phiên nào'}
              </Text>
            </View>
          }
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
  if (state === 'waiting_specialist') {
    return { 
      color: '#fff',
      backgroundColor: '#F59E0B',
    };
  }
  if (state === 'assigned') {
    return { 
      color: '#fff',
      backgroundColor: '#22C55E',
    };
  }
  if (state === 'closed') {
    return { 
      color: '#fff',
      backgroundColor: '#6b7280',
    };
  }
  return { 
    color: '#111827',
    backgroundColor: '#F3F4F6',
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  tabs: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
  },
  tabText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#166534',
    fontWeight: '700',
  },
  badge: {
    backgroundColor: '#22C55E',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  error: {
    color: '#dc2626',
    textAlign: 'center',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  stateBadge: {
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  cardBody: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaLabel: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '500',
  },
  metaValue: {
    color: '#111827',
    fontSize: 13,
    flex: 1,
  },
  meta: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: '#22C55E',
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  btnSecondary: {
    backgroundColor: '#E6F9EE',
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  btnSecondaryText: {
    color: '#166534',
    fontWeight: '700',
    fontSize: 14,
  },
  btnDisabled: {
    backgroundColor: '#9ca3af',
    borderColor: '#9ca3af',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  empty: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyHint: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
  },
  debugContainer: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  debugText: {
    color: '#92400E',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

