import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Image, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { closeSession, getChatSession, sendSpecialistMessage, assignSession } from '../../utils/api';
import { getCurrentUserId } from '../../utils/auth';

export default function SpecialistChatScreen({ route, navigation }) {
  const { sessionId } = route.params || {};
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);
  const [attachedImage, setAttachedImage] = useState(null);
  const listRef = useRef(null);
  const refreshTimerRef = useRef(null);

  // Load current user ID
  useEffect(() => {
    const loadUserId = async () => {
      const uid = await getCurrentUserId();
      setCurrentUserId(uid);
    };
    loadUserId();
  }, []);

  const load = useCallback(async () => {
    if (!sessionId) return;
    try {
      setError('');
      // GET /api/chat/sessions/{id}?includeMessages=true
      // Response: { success: true, data: { ...ChatSessionDto, messages: [] } }
      const data = await getChatSession(sessionId, { includeMessages: true });
      
      // Backend returns ServiceResult structure: { success: true, data: { session: {...}, messages: [] } }
      // Or sometimes: { success: true, data: { ...ChatSessionDto, messages: [] } }
      // Extract data field from ServiceResult
      const responseData = data?.data || data || {};
      
      // Handle nested structure: { session: {...}, messages: [] }
      // Or flat structure: { ...ChatSessionDto, messages: [] }
      let sessionData;
      if (responseData?.session) {
        // Nested structure: merge session object with messages
        sessionData = {
          ...responseData.session,
          messages: responseData.messages || responseData.Messages || [],
        };
      } else {
        // Flat structure: use as is
        sessionData = responseData;
      }
      
      setSession(sessionData);
      
      // Auto scroll to bottom after loading messages
      setTimeout(() => {
        listRef.current?.scrollToEnd?.({ animated: true });
      }, 100);
    } catch (e) {
      // Backend returns 404 if session not found, 403 if no access
      const errorMsg = e?.response?.data?.message || e?.message || 'Lỗi tải phiên chat';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
    // Auto refresh messages every 3 seconds
    refreshTimerRef.current = setInterval(() => {
      load();
    }, 3000);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [load]);

  const onSend = async () => {
    if (!text.trim()) return;
    if (!currentUserId) {
      setError('Chưa xác định người dùng');
      return;
    }
    if (!canSend) {
      if (isSpecialist && !isAssigned) {
        setError('Bạn cần nhận phiên này trước khi có thể chat');
      } else if (isClosed) {
        setError('Phiên chat đã được đóng');
      }
      return;
    }
    
    try {
      setSending(true);
      setError('');
      
      // POST /api/chat/sessions/{sessionId}/messages
      // For specialist channel: backend saves message without calling AI
      // Response: { success: true, data: { ...ChatMessageDto } }
      // Dùng sendSpecialistMessage với format đúng cho backend (Content, Image, SessionId, UserId)
      await sendSpecialistMessage(sessionId, {
        text,
        files: attachedImage
          ? [
              {
                uri: attachedImage.uri,
                name: attachedImage.name || 'attachment.jpg',
                type: attachedImage.type || 'image/jpeg',
              },
            ]
          : [],
      });
      
      setText('');
      setAttachedImage(null);
      // Reload session to get updated messages
      await load();
      setTimeout(() => {
        listRef.current?.scrollToEnd?.({ animated: true });
      }, 50);
    } catch (e) {
      // Backend returns 403 if specialist tries to send before assigning
      // Backend returns 409 if session is closed
      const errorMsg = e?.message || e?.response?.data?.message || 'Gửi tin nhắn thất bại';
      setError(errorMsg);
      Alert.alert('Lỗi', errorMsg);
    } finally {
      setSending(false);
    }
  };

  // ==== IMAGE PICKER ====
  const openCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Quyền truy cập', 'Cần quyền truy cập camera để chụp ảnh');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker?.MediaType?.Images ?? ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAttachedImage({
          uri: result.assets[0].uri,
          name: result.assets[0].fileName || 'camera.jpg',
          type: result.assets[0].type || 'image/jpeg',
        });
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể mở camera');
    }
  };

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh để chọn ảnh');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker?.MediaType?.Images ?? ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAttachedImage({
          uri: result.assets[0].uri,
          name: result.assets[0].fileName || 'image.jpg',
          type: result.assets[0].type || 'image/jpeg',
        });
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể mở thư viện ảnh');
    }
  };

  const onAssign = async () => {
    try {
      setError('');
      setLoading(true);
      
      // POST /api/chat/sessions/{sessionId}/assignments
      // Backend assigns session to current specialist (from JWT)
      // Response: { success: true, data: { ...ChatSessionDto } }
      const response = await assignSession(sessionId);
      
      // Backend returns ServiceResult: { success: true, data: { ...ChatSessionDto } }
      // Or sometimes: { success: true, data: { session: {...}, messages: [] } }
      // Extract session data from response
      const responseData = response?.data || response || {};
      
      // Handle nested structure: { session: {...}, messages: [] }
      // Or flat structure: { ...ChatSessionDto }
      let updatedSessionData;
      if (responseData?.session) {
        // Nested structure: merge session object with messages
        updatedSessionData = {
          ...responseData.session,
          messages: responseData.messages || responseData.Messages || session?.messages || session?.Messages || [],
        };
      } else {
        // Flat structure: use as is, preserve existing messages
        updatedSessionData = {
          ...responseData,
          messages: responseData.messages || responseData.Messages || session?.messages || session?.Messages || [],
        };
      }
      
      // Update session state immediately from response
      if (updatedSessionData && Object.keys(updatedSessionData).length > 0) {
        setSession(updatedSessionData);
      }
      
      // Also reload to get latest data with messages
      await load();
      
      Alert.alert('Thành công', 'Bạn đã nhận phiên này. Bây giờ bạn có thể chat!');
    } catch (e) {
      // Backend returns 409 if session already assigned or 403 if not allowed
      const errorMsg = e?.response?.data?.message || e?.message || 'Nhận phiên thất bại';
      setError(errorMsg);
      Alert.alert('Lỗi', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const onClose = async () => {
    if (sessionState === 'closed') {
      Alert.alert('Thông báo', 'Phiên chat đã được đóng');
      return;
    }
    
    // Backend allows closing: admin, user owner, or specialist assigned
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc chắn muốn đóng phiên chat này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đóng',
          style: 'destructive',
          onPress: async () => {
            try {
              // POST /api/chat/sessions/{sessionId}/closures
              // Response: { success: true, data: { ...ChatSessionDto } }
              await closeSession(sessionId);
              // Reload to get updated session state
              await load();
              Alert.alert('Thành công', 'Phiên chat đã được đóng');
            } catch (e) {
              // Backend returns 409 if already closed or invalid state
              const errorMsg = e?.response?.data?.message || e?.message || 'Đóng phiên thất bại';
              setError(errorMsg);
            }
          },
        },
      ]
    );
  };

  // Determine if current user is the session owner (user) or specialist
  // Backend ChatSessionDto: UserId (owner), SpecialistId (assigned specialist)
  // Support both camelCase and PascalCase from backend
  const sessionUserId = session?.userId || session?.UserId;
  const sessionSpecialistId = session?.specialistId || session?.SpecialistId;
  
  const isOwner = currentUserId && sessionUserId && currentUserId === sessionUserId;
  
  // Backend state values: 'waiting_specialist', 'assigned', 'closed'
  const sessionState = session?.state || session?.State || 'waiting_specialist';
  const isClosed = sessionState === 'closed';
  const isAssigned = sessionState === 'assigned';
  const isWaiting = sessionState === 'waiting_specialist';
  
  // Check if current user is the assigned specialist
  // If session is waiting, specialistId will be null, so isSpecialist will be false
  // If session is assigned, check if currentUserId matches sessionSpecialistId
  const isSpecialist = currentUserId && sessionSpecialistId && currentUserId === sessionSpecialistId;
  
  // If session is waiting (not assigned to anyone yet) and current user is not the owner,
  // then current user is likely a specialist trying to claim the session
  // (since SpecialistChatScreen is only accessible to specialists)
  // Only show assign button if session is waiting AND not already assigned to current user
  const canAssign = !isOwner && !isSpecialist && isWaiting && !isClosed && currentUserId && !sessionSpecialistId;
  
  // Specialist can send messages if session is assigned and not closed
  // User (owner) can send messages if session is not closed (even when waiting)
  // Backend will return 403 if specialist tries to send before assigning
  const canSend = !isClosed && (
    (isSpecialist && isAssigned) || 
    (isOwner && !isClosed)
  );
  
  // Only user (owner) can close the session (UI restriction)
  // Backend allows: admin, user owner, or specialist assigned
  // But UI only shows close button to owner as per requirements
  const canClose = isOwner && !isClosed;

  // Extract messages - support both camelCase and PascalCase from backend
  // Also support nested structure like session?.data?.messages (similar to SessionChatScreen)
  const messages = session?.messages || session?.Messages || session?.data?.messages || session?.data?.Messages || [];
  // Format session title and state
  // Backend ChatSessionDto fields: SessionId, UserId, Title, State, Channel, SpecialistId, AssignedAt, ClosedAt, CreatedAt
  // Support both camelCase and PascalCase
  const sessionTitle = session?.title || session?.Title || `Phiên #${sessionId?.substring(0, 8)}`;
  const stateText = sessionState === 'waiting_specialist' 
    ? 'Chờ chuyên viên' 
    : sessionState === 'assigned' 
    ? 'Đã gán' 
    : sessionState === 'closed' 
    ? 'Đã đóng' 
    : 'Đang hoạt động';
  
  // Show channel info - backend uses: 'ai', 'ai_admin', 'specialist'
  const channel = session?.channel || session?.Channel || 'specialist';
  const channelText = channel === 'specialist' 
    ? 'Chuyên viên' 
    : channel === 'ai' 
    ? 'AI' 
    : channel === 'ai_admin'
    ? 'AI Admin'
    : channel;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Quay lại</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title} numberOfLines={1}>{sessionTitle}</Text>
          <Text style={styles.subtitle}>
            {stateText} • {channelText}
            {isSpecialist && ' • Bạn là chuyên viên'}
            {isOwner && ' • Bạn là người dùng'}
          </Text>
        </View>
        <View style={{ width: 80 }} />
      </View>
      
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}
      
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={{ marginTop: 8, color: '#6b7280' }}>Đang tải...</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView 
            ref={listRef} 
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.empty}>Chưa có tin nhắn</Text>
                <Text style={styles.emptyHint}>Bắt đầu cuộc trò chuyện bằng cách gửi tin nhắn</Text>
              </View>
            ) : (
              messages.map((m, idx) => {
                // Backend ChatMessageDto fields: MessageId, SessionId, UserId, Content, ImageUrl, MessageType, Role, CreatedAt
                // For specialist channel: all messages have userId (either user or specialist)
                const messageUserId = m?.userId || m?.UserId || m?.user_id || '';
                const isMyMessage = currentUserId && messageUserId && messageUserId === currentUserId;
                
                // Determine message content
                const messageContent = m?.content || m?.Content || m?.text || m?.message || '';
                const messageImageUrl = m?.imageUrl || m?.ImageUrl || m?.image_url || null;
                const messageTime = m?.created_at || m?.createdAt || m?.CreatedAt;
                
                // Tin nhắn của mình -> hiển thị bên phải, màu xanh
                // Tin nhắn của đối phương -> hiển thị bên trái, màu xám
                const showOnRight = isMyMessage;
                
                return (
                  <View 
                    key={m?.message_id || m?.MessageId || m?.id || idx} 
                    style={[
                      styles.msgRow, 
                      showOnRight ? styles.right : styles.left
                    ]}
                  >
                    <View 
                      style={[
                        styles.bubble, 
                        showOnRight ? styles.bubbleMe : styles.bubbleOther
                      ]}
                    >
                      {/* IMAGE */}
                      {messageImageUrl ? (
                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => setViewingImage(messageImageUrl)}
                        >
                          <Image
                            source={{ uri: messageImageUrl }}
                            style={styles.messageImage}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      ) : null}
                      
                      {/* TEXT */}
                      {messageContent ? (
                        <Text style={[styles.msgText, showOnRight && styles.msgTextMe]}>
                          {messageContent}
                        </Text>
                      ) : null}
                      
                      {messageTime && (
                        <Text style={[styles.msgTime, showOnRight && styles.msgTimeMe]}>
                          {new Date(messageTime).toLocaleTimeString('vi-VN', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.inputRow}>
            {!canSend && canAssign && (
              <View style={styles.assignBanner}>
                <View style={styles.assignBannerContent}>
                  <Text style={styles.assignBannerText}>
                    ⚠️ Bạn cần nhận phiên này trước khi có thể chat
                  </Text>
                  <TouchableOpacity 
                    style={styles.assignBtn} 
                    onPress={onAssign}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.assignBtnText}>Nhận phiên</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {!canSend && isSpecialist && !isAssigned && !canAssign && !isClosed && (
              <View style={styles.infoBanner}>
                <Text style={styles.infoText}>
                  ⚠️ Bạn cần nhận phiên này trước khi có thể chat
                </Text>
              </View>
            )}
            {!canSend && isClosed && (
              <View style={styles.infoBanner}>
                <Text style={styles.infoText}>
                  🔒 Phiên chat đã được đóng
                </Text>
              </View>
            )}
            {attachedImage && (
              <View style={styles.attachedImageContainer}>
                <Image
                  source={{ uri: attachedImage.uri }}
                  style={styles.attachedImagePreview}
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setAttachedImage(null)}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputContainer}>
              <TouchableOpacity
                style={[styles.cameraBtn, !canSend && styles.cameraBtnDisabled]}
                onPress={pickImage}
                disabled={!canSend}
              >
                <Text style={styles.cameraBtnText}>📷</Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.input, !canSend && styles.inputDisabled]}
                placeholder={
                  !canSend && isSpecialist && !isAssigned
                    ? "Vui lòng nhận phiên trước"
                    : !canSend && isClosed
                    ? "Phiên chat đã đóng"
                    : "Nhập tin nhắn..."
                }
                value={text}
                onChangeText={setText}
                multiline
                editable={canSend}
              />
              <TouchableOpacity 
                style={[styles.sendBtn, (!canSend || (sending || (!text.trim() && !attachedImage))) && styles.sendBtnDisabled]} 
                onPress={onSend} 
                disabled={!canSend || sending || (!text.trim() && !attachedImage)}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.sendText}>Gửi</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {canClose && (
            <View style={styles.footerRow}>
              <TouchableOpacity 
                style={[styles.closeBtn, sessionState === 'closed' && styles.closeBtnDisabled]} 
                onPress={onClose} 
                disabled={sessionState === 'closed'}
              >
                <Text style={styles.closeText}>Đóng phiên</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Image Viewer Modal */}
      <Modal
        visible={!!viewingImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewingImage(null)}
      >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity
            style={styles.imageViewerCloseButton}
            onPress={() => setViewingImage(null)}
            activeOpacity={0.8}
          >
            <Text style={styles.imageViewerCloseText}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.imageViewerContent}
            activeOpacity={1}
            onPress={() => setViewingImage(null)}
          >
            {viewingImage && (
              <Image
                source={{ uri: viewingImage }}
                style={styles.imageViewerImage}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { color: '#166534', fontWeight: '600', fontSize: 16 },
  headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: 8 },
  title: { fontWeight: '700', fontSize: 16, color: '#111827' },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
  },
  error: { color: '#dc2626', textAlign: 'center', fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 20 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  empty: { textAlign: 'center', color: '#6b7280', fontSize: 16, fontWeight: '600' },
  emptyHint: { textAlign: 'center', color: '#9ca3af', fontSize: 14, marginTop: 8 },
  msgRow: { flexDirection: 'row', marginBottom: 12 },
  right: { justifyContent: 'flex-end' },
  left: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleMe: {
    backgroundColor: '#22C55E',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  messageImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
    marginBottom: 6,
  },
  msgText: { color: '#111827', fontSize: 15, lineHeight: 20 },
  msgTextMe: { color: '#fff' },
  msgTime: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  msgTimeMe: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  inputRow: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  attachedImageContainer: {
    position: 'relative',
    marginBottom: 8,
    marginHorizontal: 12,
    alignSelf: 'flex-start',
  },
  attachedImagePreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  infoBanner: {
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  infoText: {
    color: '#92400E',
    fontSize: 13,
    textAlign: 'center',
  },
  assignBanner: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  assignBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  assignBannerText: {
    color: '#92400E',
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  assignBtn: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  cameraBtn: {
    backgroundColor: '#E6F9EE',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    height: 44,
  },
  cameraBtnDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
    opacity: 0.5,
  },
  cameraBtnText: {
    fontSize: 20,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    maxHeight: 100,
    fontSize: 15,
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
  },
  sendBtn: {
    marginLeft: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#22C55E',
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#9ca3af',
  },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  closeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#ef4444',
    borderRadius: 20,
  },
  closeBtnDisabled: {
    backgroundColor: '#9ca3af',
  },
  closeText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerImage: {
    width: '100%',
    height: '100%',
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
});

