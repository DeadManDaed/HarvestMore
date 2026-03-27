//mobile/screens/ChatScreen.jsx

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';

export default function ChatScreen({ route, navigation }) {
  const { conversationId } = route.params;
  const { currentConversation, messages, sendMessage, leaveConversation, getOrCreateConversation } = useChat();
  const { user } = useAuth();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef();

  useEffect(() => {
    // Charger la conversation
    if (conversationId) {
      // La conversation est déjà chargée via le contexte
      // On pourrait appeler loadMessages si nécessaire
    }
    return () => {
      leaveConversation();
    };
  }, []);

  const handleSend = () => {
    if (inputText.trim()) {
      sendMessage(inputText);
      setInputText('');
    }
  };

  const renderMessage = ({ item }) => {
    const isMine = item.sender_id === user.id;
    return (
      <View style={[styles.messageRow, isMine ? styles.myMessageRow : styles.otherMessageRow]}>
        <View style={[styles.messageBubble, isMine ? styles.myBubble : styles.otherBubble]}>
          <Text style={styles.messageText}>{item.content}</Text>
          <Text style={styles.messageTime}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const getOtherName = () => {
    if (!currentConversation) return '...';
    if (currentConversation.user_id === user.id) {
      return currentConversation.technician?.full_name || 'Technicien';
    }
    return currentConversation.user?.full_name || 'Agriculteur';
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getOtherName()}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Écrivez votre message..."
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendButtonText}>Envoyer</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#2e7d32',
    elevation: 4,
  },
  backButton: { fontSize: 28, color: '#fff', marginRight: 15 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  messagesList: { padding: 15, flexGrow: 1 },
  messageRow: { marginBottom: 12, flexDirection: 'row' },
  myMessageRow: { justifyContent: 'flex-end' },
  otherMessageRow: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '80%', padding: 10, borderRadius: 15 },
  myBubble: { backgroundColor: '#2e7d32', borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: '#e0e0e0', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 14, color: '#fff' },
  myBubble: { backgroundColor: '#2e7d32' },
  otherBubble: { backgroundColor: '#fff' },
  messageText: { fontSize: 14 },
  myBubble: { backgroundColor: '#2e7d32' },
  myBubbleText: { color: '#fff' },
  messageTime: { fontSize: 10, color: '#aaa', marginTop: 4, textAlign: 'right' },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, maxHeight: 100 },
  sendButton: { backgroundColor: '#2e7d32', borderRadius: 20, paddingHorizontal: 20, justifyContent: 'center', marginLeft: 10 },
  sendButtonText: { color: '#fff', fontWeight: 'bold' },
});