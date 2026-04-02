// mobile/screens/ChatScreen.jsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function ChatScreen({ route, navigation }) {
  const { conversationId, groupId, groupName } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef();

  const isGroup = !!groupId;
  const chatTitle = isGroup ? groupName : 'Chargement...';

  // Charger les messages existants
  const loadMessages = async () => {
    let query = supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });
    if (isGroup) {
      query = query.eq('group_id', groupId);
    } else {
      query = query.eq('conversation_id', conversationId);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Erreur chargement messages:', error);
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  };

  // Souscription en temps réel
  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel('chat-channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: isGroup ? `group_id=eq.${groupId}` : `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, groupId]);

  // Envoyer un message
  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const newMessage = {
      content: inputText.trim(),
      sender_id: user.id,
      created_at: new Date().toISOString(),
    };
    if (isGroup) {
      newMessage.group_id = groupId;
    } else {
      newMessage.conversation_id = conversationId;
    }
    const { error } = await supabase.from('messages').insert(newMessage);
    if (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
      console.error(error);
    } else {
      setInputText('');
    }
  };

  // Rendu d'un message
  const renderMessage = ({ item }) => {
    const isMine = item.sender_id === user.id;
    return (
      <View style={[styles.messageRow, isMine ? styles.myMessageRow : styles.otherMessageRow]}>
        <View style={[styles.messageBubble, isMine ? styles.myBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isMine && styles.myBubbleText]}>{item.content}</Text>
          <Text style={styles.messageTime}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Chargement...</Text>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>{chatTitle}</Text>
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
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Envoyer</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  messageText: { fontSize: 14 },
  myBubbleText: { color: '#fff' },
  messageTime: { fontSize: 10, color: '#aaa', marginTop: 4, textAlign: 'right' },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, maxHeight: 100 },
  sendButton: { backgroundColor: '#2e7d32', borderRadius: 20, paddingHorizontal: 20, justifyContent: 'center', marginLeft: 10 },
  sendButtonText: { color: '#fff', fontWeight: 'bold' },
});