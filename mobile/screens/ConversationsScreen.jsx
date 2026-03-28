//mobile/screens/ConversationScreen.jsx -

import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';

export default function ConversationsScreen({ navigation }) {
  const { conversations, loading } = useChat();
  const { user } = useAuth();

  const openConversation = (conv) => {
    navigation.navigate('Chat', { conversationId: conv.id });
  };

  const getOtherParticipant = (conv) => {
    if (conv.user_id === user.id) {
      return conv.technician?.full_name || conv.technician?.username || 'Technicien';
    }
    return conv.user?.full_name || conv.user?.username || 'Agriculteur';
  };

  const renderConversation = ({ item }) => (
    <TouchableOpacity style={styles.convCard} onPress={() => openConversation(item)}>
      <View style={styles.convAvatar}>
        <Text style={styles.avatarText}>{getOtherParticipant(item).charAt(0)}</Text>
      </View>
      <View style={styles.convInfo}>
        <Text style={styles.convName}>{getOtherParticipant(item)}</Text>
        <Text style={styles.convLastMsg} numberOfLines={1}>
          {item.last_message || 'Aucun message'}
        </Text>
      </View>
      {item.last_message_at && (
        <Text style={styles.convTime}>
          {new Date(item.last_message_at).toLocaleDateString()}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes conversations</Text>
<TouchableOpacity style={styles.newButton} onPress={() => navigation.navigate('Contacts')}>
  <Text style={styles.newButtonText}>+ Nouvelle conversation</Text>
</TouchableOpacity>
      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucune conversation pour le moment.</Text>
          <Text style={styles.emptySubtext}>
            Vos échanges avec les techniciens apparaîtront ici.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', padding: 20, color: '#2e7d32' },
  list: { paddingHorizontal: 15 },
  convCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 2,
  },
  convAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2e7d32',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
newButton: {
  backgroundColor: '#2e7d32',
  padding: 12,
  borderRadius: 8,
  margin: 15,
  alignItems: 'center',
},
newButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  convInfo: { flex: 1 },
  convName: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  convLastMsg: { fontSize: 13, color: '#666' },
  convTime: { fontSize: 11, color: '#999' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 8 },
});