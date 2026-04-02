// mobile/screens/ConversationsScreen.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SectionList } from 'react-native';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function ConversationsScreen({ navigation }) {
  const { conversations, loading: convLoading } = useChat();
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  const fetchGroups = async () => {
    if (!user) return;
    setGroupsLoading(true);
    const { data, error } = await supabase
      .from('group_members')
      .select('group_id, conversation_groups(*)')
      .eq('user_id', user.id);
    if (!error && data) {
      const groupList = data.map(item => ({
        id: item.conversation_groups.id,
        name: item.conversation_groups.name,
        description: item.conversation_groups.description,
        type: item.conversation_groups.type,
      }));
      setGroups(groupList);
    }
    setGroupsLoading(false);
  };

  // Recharger au focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchGroups();
    });
    return unsubscribe;
  }, [navigation, user]);

  useEffect(() => {
    fetchGroups();
  }, [user]);

  const openConversation = (conv) => {
    navigation.navigate('Chat', { conversationId: conv.id });
  };

  const openGroup = (group) => {
    navigation.navigate('Chat', { groupId: group.id, groupName: group.name });
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

  const renderGroup = ({ item }) => (
    <TouchableOpacity style={styles.convCard} onPress={() => openGroup(item)}>
      <View style={[styles.convAvatar, { backgroundColor: '#ff9800' }]}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.convInfo}>
        <Text style={styles.convName}>{item.name}</Text>
        <Text style={styles.convLastMsg} numberOfLines={1}>
          {item.description || 'Groupe de discussion'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (convLoading || groupsLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  const sections = [];
  if (conversations.length > 0) {
    sections.push({ title: 'Messages privés', data: conversations, renderItem: renderConversation });
  }
  if (groups.length > 0) {
    sections.push({ title: 'Groupes et forums', data: groups, renderItem: renderGroup });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Messagerie</Text>
      <TouchableOpacity style={styles.newButton} onPress={() => navigation.navigate('Contacts')}>
        <Text style={styles.newButtonText}>+ Nouvelle conversation</Text>
      </TouchableOpacity>
      {sections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucune conversation ni groupe pour le moment.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
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
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 15,
    color: '#2e7d32',
  },
});