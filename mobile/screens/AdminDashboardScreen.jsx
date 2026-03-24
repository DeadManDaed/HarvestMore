//mobile/screens/AdminDashboardScreen.jsx

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';

export default function AdminDashboardScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState('');
  const [editingAssignment, setEditingAssignment] = useState('');

  const roles = ['farmer', 'technician', 'sales', 'store_manager', 'admin'];
  const roleLabels = {
    farmer: 'Agriculteur',
    technician: 'Technicien',
    sales: 'Commercial',
    store_manager: 'Responsable magasin',
    admin: 'Administrateur'
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) console.error(error);
    else setUsers(data);
    setLoading(false);
  };

  const updateUserRole = async (userId, newRole) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);
    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      Alert.alert('Succès', 'Rôle mis à jour');
      fetchUsers();
      setModalVisible(false);
    }
  };

  const updateUserAssignment = async (userId, assignment) => {
    const updates = {};
    if (editingRole === 'technician') updates.technician_region = assignment;
    if (editingRole === 'store_manager') updates.assigned_store_id = parseInt(assignment);
    
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      Alert.alert('Succès', 'Affectation mise à jour');
      fetchUsers();
      setModalVisible(false);
    }
  };

  const openUserModal = (user) => {
    setSelectedUser(user);
    setEditingRole(user.role);
    setEditingAssignment(user.technician_region || user.assigned_store_id || '');
    setModalVisible(true);
  };

  const renderUserCard = ({ item }) => (
    <TouchableOpacity style={styles.userCard} onPress={() => openUserModal(item)}>
      <View style={styles.userHeader}>
        <Text style={styles.userName}>{item.full_name || item.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
          <Text style={styles.roleText}>{roleLabels[item.role]}</Text>
        </View>
      </View>
      <Text style={styles.userEmail}>{item.email}</Text>
      {item.phone && <Text style={styles.userPhone}>{item.phone}</Text>}
      {item.region && <Text style={styles.userLocation}>📍 {item.region} - {item.department || ''}</Text>}
    </TouchableOpacity>
  );

  const getRoleColor = (role) => {
    const colors = {
      farmer: '#4caf50',
      technician: '#2196f3',
      sales: '#ff9800',
      store_manager: '#9c27b0',
      admin: '#f44336'
    };
    return colors[role] || '#757575';
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestion des utilisateurs</Text>
        <Text style={styles.subtitle}>Cliquez sur un utilisateur pour modifier son rôle</Text>
      </View>

      <FlatList
        data={users}
        renderItem={renderUserCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Modifier {selectedUser?.full_name || selectedUser?.email}</Text>
            
            <Text style={styles.modalLabel}>Rôle</Text>
            <View style={styles.roleContainer}>
              {roles.map(role => (
                <TouchableOpacity
                  key={role}
                  style={[styles.roleOption, editingRole === role && styles.roleOptionActive]}
                  onPress={() => setEditingRole(role)}
                >
                  <Text style={[styles.roleOptionText, editingRole === role && styles.roleOptionTextActive]}>
                    {roleLabels[role]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {(editingRole === 'technician' || editingRole === 'store_manager') && (
              <>
                <Text style={styles.modalLabel}>
                  {editingRole === 'technician' ? 'Région d\'affectation' : 'ID du magasin'}
                </Text>
                <TextInput
                  style={styles.modalInput}
                  value={editingAssignment}
                  onChangeText={setEditingAssignment}
                  placeholder={editingRole === 'technician' ? 'Ex: Centre, Littoral...' : 'Numéro du magasin'}
                />
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={() => {
                  updateUserRole(selectedUser.id, editingRole);
                  if (editingRole === 'technician' || editingRole === 'store_manager') {
                    updateUserAssignment(selectedUser.id, editingAssignment);
                  }
                }}
              >
                <Text style={styles.modalSaveText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#2e7d32', padding: 20, paddingTop: 50 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#e0e0e0', marginTop: 5 },
  list: { padding: 15 },
  userCard: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3 },
  userHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15 },
  roleText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  userEmail: { fontSize: 12, color: '#666', marginBottom: 4 },
  userPhone: { fontSize: 12, color: '#666', marginBottom: 4 },
  userLocation: { fontSize: 12, color: '#2e7d32', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 20, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalLabel: { fontSize: 14, fontWeight: 'bold', color: '#333', marginTop: 10, marginBottom: 5 },
  roleContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  roleOption: { backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  roleOptionActive: { backgroundColor: '#2e7d32' },
  roleOptionText: { color: '#333', fontSize: 12 },
  roleOptionTextActive: { color: '#fff' },
  modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 15 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  modalCancel: { flex: 1, backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8, marginRight: 8, alignItems: 'center' },
  modalCancelText: { color: '#666' },
  modalSave: { flex: 1, backgroundColor: '#2e7d32', padding: 12, borderRadius: 8, marginLeft: 8, alignItems: 'center' },
  modalSaveText: { color: '#fff', fontWeight: 'bold' }
});