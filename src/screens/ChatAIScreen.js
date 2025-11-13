import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  useWindowDimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  createChatSession,
  getChatSession,
  sendSessionMessage,
} from "../utils/api";
import { getCurrentUserId } from "../utils/auth";

export default function ChatAIScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);

  const mapServerMessages = useCallback(async (sess) => {
    const currentUser =
      sess?.ownerId || sess?.data?.ownerId || (await getCurrentUserId());
    const msgs = sess?.messages || sess?.data?.messages || [];
    return msgs.map((m) => ({
      id: m?.id || String(Math.random()),
      sender:
        m?.userId && currentUser && m.userId === currentUser ? "user" : "ai",
      text: m?.text || m?.content || m?.message || "",
    }));
  }, []);

  const load = useCallback(
    async (sid) => {
      const id = sid || sessionId;
      if (!id) return;
      try {
        const data = await getChatSession(id);
        const sess = data?.data || data || {};
        const mapped = await mapServerMessages(sess);
        setMessages(mapped);
        setTimeout(
          () => listRef.current?.scrollToEnd?.({ animated: true }),
          50
        );
      } catch (e) {
        // ignore periodic errors
      }
    },
    [sessionId, mapServerMessages]
  );

  useEffect(() => {
    let timer;
    const init = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await createChatSession({
          channel: "ai",
          title: "Tư vấn chăm sóc da",
        });
        console.log("Chat session created:", res);

        const sess = res?.data || res;
        const sid = sess?.id || sess?.sessionId;
        if (!sid) throw new Error("Không tạo được phiên chat");
        setSessionId(sid);
        await load(sid);
        timer = setInterval(() => load(sid), 2500);
      } catch (e) {
        setError(
          e?.response?.data?.message || e?.message || "Lỗi khởi tạo chat AI"
        );
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [load]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !sessionId) return;
    try {
      console.log("Sending message with sessionId:", sessionId);

      setSending(true);
      setError("");
      await sendSessionMessage(sessionId, { text });
      setInput("");
      await load(sessionId);
    } catch (e) {
      setError(
        e?.response?.data?.message || e?.message || "Gửi tin nhắn thất bại"
      );
    } finally {
      setSending(false);
    }
  };

  const pickSuggestion = (text) => setInput(text);

  const requestSpecialist = async () => {
    try {
      const res = await createChatSession({ channel: "specialist" });
      const session = res?.data || res;
      const sessionId = session?.id || session?.sessionId;
      if (sessionId)
        navigation.getParent()?.navigate("SessionChat", { sessionId });
    } catch (e) {
      // ignore
    }
  };

  const canGoBack = navigation?.canGoBack?.();

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {canGoBack ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color="#166534" />
            <Text style={styles.backText}>Quay lại</Text>
          </TouchableOpacity>
        ) : null}

        <View
          style={[
            styles.sectionWrap,
            isWide && { flexDirection: "row", gap: 16 },
          ]}
        >
          <View style={[styles.chatCard, isWide && { flex: 1 }]}>
            {messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.msgRow,
                  m.sender === "user"
                    ? { justifyContent: "flex-end" }
                    : { justifyContent: "flex-start" },
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    m.sender === "user" ? styles.bubbleUser : styles.bubbleAI,
                  ]}
                >
                  <Text
                    style={
                      m.sender === "user"
                        ? styles.bubbleUserText
                        : styles.bubbleAIText
                    }
                  >
                    {m.text}
                  </Text>
                </View>
              </View>
            ))}

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Nhập câu hỏi của bạn..."
                value={input}
                onChangeText={setInput}
                multiline
              />
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={sendMessage}
                disabled={sending || !sessionId}
              >
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.rightCol, isWide && { flex: 1 }]}>
            <View style={styles.featureCards}>
              <View style={styles.featureCard}>
                <Text style={styles.featureTitle}>Phân tích da</Text>
                <Text style={styles.featureText}>
                  AI phân tích tình trạng da của bạn và đưa ra lời khuyên cá
                  nhân hóa.
                </Text>
              </View>
              <View style={styles.featureCard}>
                <Text style={styles.featureTitle}>Tư vấn sản phẩm</Text>
                <Text style={styles.featureText}>
                  Gợi ý sản phẩm phù hợp với ngân sách và nhu cầu cụ thể.
                </Text>
              </View>
              <View style={styles.featureCard}>
                <Text style={styles.featureTitle}>Lộ trình chăm sóc</Text>
                <Text style={styles.featureText}>
                  Xây dựng quy trình chăm sóc da hàng ngày chi tiết.
                </Text>
              </View>
            </View>

            <View style={styles.consultBox}>
              <Text style={styles.consultTitle}>Bắt đầu tư vấn ngay</Text>
              <View style={styles.group}>
                <Text style={styles.groupTitle}>Các vấn đề phổ biến:</Text>
                {[
                  "Mụn trứng cá",
                  "Da khô",
                  "Da nhờn",
                  "Nám/tàn nhang",
                  "Lão hóa",
                ].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={styles.chip}
                    onPress={() => pickSuggestion(t)}
                  >
                    <Text style={styles.chipText}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.readyBox}>
              <Text style={styles.readyTitle}>Bạn đã sẵn sàng?</Text>
              <Text style={styles.readyText}>
                Bắt đầu trò chuyện với AI hoặc yêu cầu chuyên viên.
              </Text>
              <TouchableOpacity
                style={styles.requestBtn}
                onPress={requestSpecialist}
              >
                <Text style={styles.requestText}>Yêu cầu chuyên viên</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#fff" },
  backBtn: { flexDirection: "row", alignItems: "center", marginTop: 56 },
  backText: { marginLeft: 6, color: "#166534", fontWeight: "600" },
  sectionWrap: { flex: 1 },
  chatCard: {
    backgroundColor: "#F9FFF9",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  msgRow: { flexDirection: "row", marginBottom: 8 },
  bubble: {
    maxWidth: "85%",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  bubbleAI: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB" },
  bubbleUser: { backgroundColor: "#DCFCE7" },
  bubbleAIText: { color: "#111827" },
  bubbleUserText: { color: "#065F46" },
  inputRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  sendBtn: {
    marginLeft: 8,
    backgroundColor: "#22C55E",
    padding: 10,
    borderRadius: 10,
  },
  rightCol: { marginTop: 16 },
  featureCards: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featureCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    width: "100%",
  },
  featureTitle: { fontWeight: "700", marginBottom: 4, color: "#166534" },
  featureText: { color: "#374151" },
  consultBox: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    marginTop: 4,
  },
  consultTitle: { fontWeight: "700", color: "#14532d", marginBottom: 8 },
  group: { marginBottom: 12 },
  groupTitle: { fontWeight: "600", marginBottom: 6 },
  chip: {
    backgroundColor: "#E6F9EE",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  chipText: { color: "#166534" },
  readyBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 12,
  },
  readyTitle: { fontWeight: "700", marginBottom: 6 },
  readyText: { color: "#374151" },
  requestBtn: {
    marginTop: 10,
    backgroundColor: "#22C55E",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  requestText: { color: "#fff", fontWeight: "700" },
});
