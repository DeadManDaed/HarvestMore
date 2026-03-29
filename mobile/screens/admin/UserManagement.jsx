// mobile/screens/admin/UserManagement.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { supabase } from '../../lib/supabase';
import BackHeader from '../../components/BackHeader';
import { MaterialIcons } from '@expo/vector-icons';

const ROLES = [
  { value: 'farmer', label: '🌾 Agriculteur', color: '#4caf50' },
  { value: 'technician', label: '🔧 Technicien', color: '#2196f3' },
  { value: 'sales', label: '📊 Commercial', color: '#ff9800' },
  { value: 'store_manager', label: '🏪 Responsable magasin', color: '#9c27b0' },
  { value: 'admin', label: '⚙️ Administrateur', color: '#f44336' },
];

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState('');
  const [suspensionReason, setSuspensionReason] = useState('');
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    username: '',
    phone: '',
    role: 'farmer'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [filterRole]);

  const fetchUsers = async () => {
    setLoading(true);
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (filterRole !== 'all') {
      query = query.eq('role', filterRole);
    }

    const { data, error } = await query;
    if (error) console.error(error);
    else setUsers(data || []);
    setLoading(false);
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openUserModal = (user) => {
    setSelectedUser(user);
    setEditingRole(user.role);
    setSuspensionReason('');
    setModalVisible(true);
  };

  const updateUserRole = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    const { error } = await supabase
      .from('profiles')
      .update({ role: editingRole })
      .eq('id', selectedUser.id);
    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      Alert.alert('Succès', 'Rôle mis à jour');
      fetchUsers();
      setModalVisible(false);
    }
    setSubmitting(false);
  };

  const toggleUserStatus = async () => {
    if (!selectedUser) return;
    const newStatus = selectedUser.is_suspended ? false : true;
    setSubmitting(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        is_suspended: newStatus,
        suspension_reason: newStatus ? suspensionReason : null,
        suspended_at: newStatus ? new Date().toISOString() : null
      })
      .eq('id', selectedUser.id);
    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      Alert.alert('Succès', newStatus ? 'Utilisateur suspendu' : 'Utilisateur réactivé');
      fetchUsers();
      setModalVisible(false);
    }
    setSubmitting(false);
  };

  const deleteUser = async () => {
    Alert.alert(
      'Confirmation',
      `Êtes-vous sûr de vouloir supprimer définitivement ${selectedUser?.full_name || selectedUser?.email} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            const { error } = await supabase
              .from('profiles')
              .delete()
              .eq('id', selectedUser.id);
            if (error) {
              Alert.alert('Erreur', error.message);
            } else {
              Alert.alert('Succès', 'Utilisateur supprimé');
              fetchUsers();
              setModalVisible(false);
            }
            setSubmitting(false);
          }
        }
      ]
    );
  };

  const createUser = async () => {
  if (!newUser.email || !newUser.password) {
    Alert.alert('Erreur', 'Email et mot de passe requis');
    return;
  }
  setSubmitting(true);
  try {
    // Appeler l'Edge Function
    const { data, error } = await supabase.functions.invoke('createUser', {
      body: {
        email: newUser.email,
        password: newUser.password,
        full_name: newUser.full_name,
        username: newUser.username,
        phone: newUser.phone,
        role: newUser.role
      }
    });

    if (error) throw new Error(error.message);
    if (!data.success) throw new Error(data.error);

    Alert.alert('Succès', 'Utilisateur créé avec succès');
    setCreateModalVisible(false);
    setNewUser({
      email: '',
      password: '',
      full_name: '',
      username: '',
      phone: '',
      role: 'farmer'
    });
    fetchUsers();
  } catch (error) {
    Alert.alert('Erreur', error.message);
  } finally {
    setSubmitting(false);
  }
};

  const renderUserItem = ({ item }) => (
    <TouchableOpacity style={styles.userCard} onPress={() => openUserModal(item)}>
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.full_name || item.username || item.email}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: ROLES.find(r => r.value === item.role)?.color || '#757575' }]}>
          <Text style={styles.roleText}>{ROLES.find(r => r.value === item.role)?.label || item.role}</Text>
        </View>
      </View>
      {item.phone && <Text style={styles.userPhone}>📞 {item.phone}</Text>}
      {item.is_suspended && (
        <View style={styles.suspendedBadge}>
          <Text style={styles.suspendedText}>⚠️ Suspendu</Text>
        </View>
      )}
      <Text style={styles.userDate}>
        Inscrit le {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  const getRoleColor = (role) => {
    return ROLES.find(r => r.value === role)?.color || '#757575';
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <BackHeader title="Gestion des utilisateurs" />
      <View style={styles.container}>
        {/* Barre de recherche et filtres */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity style={styles.addButton} onPress={() => setCreateModalVisible(true)}>
            <MaterialIcons name="person-add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, filterRole === 'all' && styles.filterChipActive]}
            onPress={() => setFilterRole('all')}
          >
            <Text style={[styles.filterText, filterRole === 'all' && styles.filterTextActive]}>Tous</Text>
          </TouchableOpacity>
          {ROLES.map(role => (
            <TouchableOpacity
              key={role.value}
              style={[styles.filterChip, filterRole === role.value && styles.filterChipActive]}
              onPress={() => setFilterRole(role.value)}
            >
              <Text style={[styles.filterText, filterRole === role.value && styles.filterTextActive]}>
                {role.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun utilisateur trouvé</Text>
            </View>
          }
        />
      </View>

      {/* Modal d'édition */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Modifier {selectedUser?.full_name || selectedUser?.email}</Text>

            <Text style={styles.modalLabel}>Rôle</Text>
            <View style={styles.roleContainer}>
              {ROLES.map(role => (
                <TouchableOpacity
                  key={role.value}
                  style={[styles.roleOption, editingRole === role.value && styles.roleOptionActive]}
                  onPress={() => setEditingRole(role.value)}
                >
                  <Text style={[styles.roleOptionText, editingRole === role.value && styles.roleOptionTextActive]}>
                    {role.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Suspension</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Motif de suspension (optionnel)"
              value={suspensionReason}
              onChangeText={setSuspensionReason}
            />
            <TouchableOpacity
              style={[styles.modalButton, selectedUser?.is_suspended ? styles.reactivateButton : styles.suspendButton]}
              onPress={toggleUserStatus}
              disabled={submitting}
            >
              <Text style={styles.modalButtonText}>
                {selectedUser?.is_suspended ? 'Réactiver' : 'Suspendre'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={updateUserRole}
              disabled={submitting}
            >
              <Text style={styles.modalButtonText}>Enregistrer le rôle</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.deleteButton]}
              onPress={deleteUser}
              disabled={submitting}
            >
              <Text style={styles.modalButtonText}>🗑️ Supprimer définitivement</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de création */}
      <Modal visible={createModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>Créer un nouvel utilisateur</Text>

            <Text style={styles.modalLabel}>Email *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="email@exemple.com"
              value={newUser.email}
              onChangeText={(text) => setNewUser({ ...newUser, email: text })}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.modalLabel}>Mot de passe *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="••••••••"
              value={newUser.password}
              onChangeText={(text) => setNewUser({ ...newUser, password: text })}
              secureTextEntry
            />

            <Text style={styles.modalLabel}>Nom complet</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nom et prénom"
              value={newUser.full_name}
              onChangeText={(text) => setNewUser({ ...newUser, full_name: text })}
            />

            <Text style={styles.modalLabel}>Nom d'utilisateur</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="username"
              value={newUser.username}
              onChangeText={(text) => setNewUser({ ...newUser, username: text })}
              autoCapitalize="none"
            />

            <Text style={styles.modalLabel}>Téléphone</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="6XXXXXXXX"
              value={newUser.phone}
              onChangeText={(text) => setNewUser({ ...newUser, phone: text })}
              keyboardType="phone-pad"
            />

            <Text style={styles.modalLabel}>Rôle</Text>
            <View style={styles.roleContainer}>
              {ROLES.map(role => (
                <TouchableOpacity
                  key={role.value}
                  style={[styles.roleOption, newUser.role === role.value && styles.roleOptionActive]}
                  onPress={() => setNewUser({ ...newUser, role: role.value })}
                >
                  <Text style={[styles.roleOptionText, newUser.role === role.value && styles.roleOptionTextActive]}>
                    {role.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={createUser}
              disabled={submitting}
            >
              <Text style={styles.modalButtonText}>Créer l'utilisateur</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancel} onPress={() => setCreateModalVisible(false)}>
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', padding: 15, alignItems: 'center' },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#2e7d32',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterScroll: { paddingHorizontal: 15, paddingBottom: 10, flexGrow: 0 },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterChipActive: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  filterText: { fontSize: 12, color: '#666' },
  filterTextActive: { color: '#fff' },
  list: { padding: 15, paddingTop: 5 },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
  },
  userHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: 'bold' },
  userEmail: { fontSize: 12, color: '#666', marginTop: 2 },
  userPhone: { fontSize: 12, color: '#2e7d32', marginTop: 6 },
  userDate: { fontSize: 10, color: '#999', marginTop: 8 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15 },
  roleText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  suspendedBadge: { backgroundColor: '#f44336', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, alignSelf: 'flex-start', marginTop: 8 },
  suspendedText: { color: '#fff', fontSize: 10 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#2e7d32' },
  modalLabel: { fontSize: 14, fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
  modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 10 },
  roleContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  roleOption: { backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  roleOptionActive: { backgroundColor: '#2e7d32' },
  roleOptionText: { color: '#333', fontSize: 12 },
  roleOptionTextActive: { color: '#fff' },
  modalButton: { padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  suspendButton: { backgroundColor: '#ff9800' },
  reactivateButton: { backgroundColor: '#4caf50' },
  saveButton: { backgroundColor: '#2e7d32' },
  deleteButton: { backgroundColor: '#f44336' },
  modalButtonText: { color: '#fff', fontWeight: 'bold' },
  modalCancel: { marginTop: 10, alignItems: 'center', padding: 10 },
  modalCancelText: { color: '#777' },
});