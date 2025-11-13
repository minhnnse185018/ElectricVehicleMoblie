import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import { getChatSession, closeSession, sendSessionMessage } from "../utils/api";
import { getCurrentUserId } from "../utils/auth";

export default function SessionChatScreen({ route, navigation }) {
  const { sessionId, title: initialTitle } = route.params || {};
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [pendingMessages, setPendingMessages] = useState([]);
  const [attachedImage, setAttachedImage] = useState(null);

  const listRef = useRef(null);

  // ==== LOAD SESSION ====
  const load = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const data = await getChatSession(sessionId);
        setSession(data?.data || data || null);
      } catch (e) {
        setError("Lỗi tải dữ liệu");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [sessionId]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Load current user id
  useEffect(() => {
    (async () => {
      try {
        const uid = await getCurrentUserId();
        if (uid) setCurrentUserId(uid);
      } catch {}
    })();
  }, []);

  // Auto refresh AI
  useEffect(() => {
    if (!sessionId) return;
    const isAI = (session?.channel || "").toLowerCase() === "ai";
    if (!isAI) return;

    const interval = setInterval(() => load(true), 2000);
    return () => clearInterval(interval);
  }, [session, load]);

  // ==== SEND MESSAGE ====
  const onSend = async () => {
    if (!text.trim() && !attachedImage) return;

    try {
      setSending(true);

      // Add pending bubble immediately
      const local = {
        id: `local-${Date.now()}`,
        userId: currentUserId,
        content: text,
        imageUrl: attachedImage?.uri,
        createdAt: new Date().toISOString(),
      };
      setPendingMessages((prev) => [...prev, local]);

      const messageText = text;
      setText("");

      await sendSessionMessage(sessionId, {
        text: messageText,
        files: attachedImage
          ? [
              {
                uri: attachedImage.uri,
                name: attachedImage.name || "attachment.jpg",
                type: attachedImage.type || "image/jpeg",
              },
            ]
          : [],
      });

      await load(true);
      setPendingMessages([]);
      setAttachedImage(null);
    } catch (e) {
      setError("Gửi tin thất bại");
      setPendingMessages([]);
    } finally {
      setSending(false);
    }
  };

  // ==== CAMERA ====
  const openCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError("Bạn cần cấp quyền camera");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes:
          ImagePicker?.MediaType?.Images ?? ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setAttachedImage({
          uri,
          name: `photo_${Date.now()}.jpg`,
          type: "image/jpeg",
        });
      }
    } catch (e) {
      setError("Không thể mở camera");
    }
  };

  // CLOSE SESSION
  const onClose = async () => {
    try {
      await closeSession(sessionId);
      await load();
    } catch (e) {
      setError("Không thể đóng phiên");
    }
  };

  // === MERGE + SORT ===
  const baseMsg = session?.messages || session?.data?.messages || [];
  const messages = [...baseMsg, ...pendingMessages];

  // CHÈN SORT Ở ĐÂY — ĐÚNG VỊ TRÍ
  messages.sort((a, b) => {
    const timeA = a?.createdAt
      ? new Date(a.createdAt).getTime()
      : Number.MAX_SAFE_INTEGER;
    const timeB = b?.createdAt
      ? new Date(b.createdAt).getTime()
      : Number.MAX_SAFE_INTEGER;
    return timeA - timeB;
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 95 : 0}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {initialTitle || session?.title || `Session #${sessionId}`}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* MESSAGE LIST */}
          <ScrollView ref={listRef} contentContainerStyle={styles.list}>
            {messages.map((m, idx) => {
              const mine = m.userId === currentUserId;

              return (
                <View
                  key={m.messageId || m.id || idx}
                  style={[styles.row, mine ? styles.right : styles.left]}
                >
                  <View
                    style={[
                      styles.bubble,
                      mine ? styles.bubbleMine : styles.bubbleOther,
                    ]}
                  >
                    {/* IMAGE */}
                    {m.imageUrl ? (
                      <Image
                        source={{ uri: m.imageUrl }}
                        style={styles.image}
                      />
                    ) : null}

                    {/* TEXT */}
                    {m.content ? (
                      <Text
                        style={[
                          styles.msg,
                          mine ? styles.msgMine : styles.msgOther,
                        ]}
                      >
                        {m.content}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* INPUT AREA */}
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.camBtn} onPress={openCamera}>
              <Text style={{ fontSize: 24 }}>📷</Text>
            </TouchableOpacity>

            {attachedImage ? (
              <TouchableOpacity
                onPress={() => setAttachedImage(null)}
                style={{ marginRight: 8 }}
              >
                <Image
                  source={{ uri: attachedImage.uri }}
                  style={{ width: 44, height: 44, borderRadius: 8 }}
                />
              </TouchableOpacity>
            ) : null}

            <TextInput
              style={styles.input}
              placeholder="Nhập tin nhắn..."
              value={text}
              onChangeText={setText}
              multiline
            />

            <TouchableOpacity
              style={styles.sendBtn}
              onPress={onSend}
              disabled={sending}
            >
              <Text style={styles.sendText}>{sending ? "..." : "Gửi"}</Text>
            </TouchableOpacity>
          </View>

          {/* FOOTER */}
          <View style={styles.footerRow}>
            <Text style={styles.state}>Trạng thái: {session?.state}</Text>

            <TouchableOpacity
              style={[
                styles.closeBtn,
                session?.state === "closed" && { opacity: 0.5 },
              ]}
              disabled={session?.state === "closed"}
              onPress={onClose}
            >
              <Text style={styles.closeText}>Đóng phiên</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  back: { fontSize: 16, color: "#166534", fontWeight: "600" },
  title: { fontWeight: "700", fontSize: 17 },
  error: { color: "red", textAlign: "center" },
  list: { padding: 16 },

  row: { flexDirection: "row", marginBottom: 10 },
  right: { justifyContent: "flex-end" },
  left: { justifyContent: "flex-start" },

  bubble: {
    maxWidth: "80%",
    padding: 10,
    borderRadius: 12,
  },
  bubbleMine: { backgroundColor: "#22C55E" },
  bubbleOther: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },

  msg: { fontSize: 15 },
  msgMine: { color: "#fff" },
  msgOther: { color: "#333" },

  image: { width: 180, height: 180, borderRadius: 12, marginBottom: 6 },

  inputRow: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  camBtn: {
    backgroundColor: "#E6F9EE",
    padding: 8,
    borderRadius: 10,
    marginRight: 8,
  },
  input: {
    flex: 1,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  sendBtn: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 8,
  },
  sendText: { color: "#fff", fontWeight: "700" },

  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  state: { color: "#333" },
  closeBtn: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeText: { color: "#fff", fontWeight: "600" },
});
