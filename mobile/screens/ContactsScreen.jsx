//mobile/screens/ContactsScreen.jsx

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';

export default function ContactsScreen({ navigation }) {
  const { user, profile } = useAuth();
  const { getOrCreateConversation } = useChat();
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    let query = supabase.from('profiles').select('id, full_name, username, role, allow_farmer_contact');

    if (profile?.role === 'farmer') {
      // Farmer : voir les autres farmers qui ont accepté d'être contactés
      // + les techniciens
      query = query.or(`and(role.eq.technician),and(role.eq.farmer,allow_farmer_contact.eq.true,id.neq.${user.id})`);
    } else if (profile?.role === 'technician' || profile?.role === 'admin' || profile?.role === 'sales' || profile?.role === 'store_manager') {
      // Personnel : voir tous les farmers (et les autres membres du personnel)
      query = query.neq('id', user.id);
    }

    const { data, error } = await query;
    if (error) console.error(error);
    else setContacts(data || []);
    setLoading(false);
  };

  const startConversation = async (contact) => {
    try {
      const conv = await getOrCreateConversation(contact.id);
      navigation.navigate('Chat', { conversationId: conv.id });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de démarrer la conversation');
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleLabel = (role) => {
    const labels = {
      farmer: '🌾 Agriculteur',
      technician: '🔧 Technicien',
      sales: '📊 Commercial',
      store_manager: '🏪 Responsable magasin',
      admin: '⚙️ Administrateur',
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Contacter</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Rechercher par nom..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {filteredContacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucun contact disponible</Text>
          {profile?.role === 'farmer' && (
            <Text style={styles.emptySubtext}>
              Pour être contacté par d’autres agriculteurs, activez l’option dans votre profil.
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.contactCard} onPress={() => startConversation(item)}>
              <View style={styles.contactAvatar}>
                <Text style={styles.avatarText}>{item.full_name?.charAt(0) || item.username?.charAt(0) || '?'}</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.full_name || item.username}</Text>
                <Text style={styles.contactRole}>{getRoleLabel(item.role)}</Text>
              </View>
              <Text style={styles.messageIcon}>💬</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', padding: 20, color: '#2e7d32' },
  searchInput: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  contactCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 15,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 2,
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2e7d32',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: 'bold' },
  contactRole: { fontSize: 12, color: '#666', marginTop: 2 },
  messageIcon: { fontSize: 24, color: '#2e7d32' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 8 },
});