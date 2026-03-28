// mobile/screens/admin/AssignMission.jsx

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

const MISSION_TYPES = [
  { value: 'diagnostic', label: '🔍 Diagnostic terrain', icon: 'medical-services', roles: ['technician'] },
  { value: 'formation', label: '📚 Formation', icon: 'school', roles: ['technician', 'sales'] },
  { value: 'delivery', label: '🚚 Livraison', icon: 'local-shipping', roles: ['sales', 'store_manager'] },
  { value: 'site_visit', label: '🌾 Visite de champ', icon: 'grass', roles: ['technician'] },
  { value: 'client_meeting', label: '🤝 Rendez-vous client', icon: 'handshake', roles: ['sales'] },
  { value: 'stock_check', label: '📊 Contrôle stock', icon: 'inventory', roles: ['store_manager'] },
];

const MISSION_STATUS = [
  { value: 'pending', label: '⏳ En attente', color: '#ff9800' },
  { value: 'assigned', label: '👤 Assignée', color: '#2196f3' },
  { value: 'in_progress', label: '🔄 En cours', color: '#4caf50' },
  { value: 'completed', label: '✅ Terminée', color: '#2e7d32' },
  { value: 'cancelled', label: '❌ Annulée', color: '#f44336' },
];

export default function AssignMission({ navigation }) {
  const [missions, setMissions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [pendingRequests, setPendingRequests] = useState({
    diagnostics: [],
    orders: [],
    complaints: []
  });
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedMission, setSelectedMission] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [newMission, setNewMission] = useState({
    type: 'diagnostic',
    title: '',
    description: '',
    assigned_to: null,
    priority: 'normal',
    due_date: '',
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchMissions(),
      fetchEmployees(),
      fetchPendingRequests()
    ]);
    setLoading(false);
  };

  const fetchMissions = async () => {
    const { data, error } = await supabase
      .from('missions')
      .select(`
        *,
        assigned_to_profile:assigned_to (id, email, full_name, username, role),
        created_by_profile:created_by (id, email, full_name, username)
      `)
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    else setMissions(data || []);
  };

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, username, role')
      .in('role', ['technician', 'sales', 'store_manager']);

    if (error) console.error(error);
    else setEmployees(data || []);
  };

  const fetchPendingRequests = async () => {
    // Diagnostics en attente
    const { data: diagnostics } = await supabase
      .from('diagnosis_requests')
      .select('*, user:user_id (id, email, full_name, username)')
      .eq('status', 'pending')
      .limit(5);

    // Commandes en attente de traitement
    const { data: orders } = await supabase
      .from('orders')
      .select('*, user:user_id (id, email, full_name, username)')
      .eq('status', 'paid')
      .limit(5);

    // Réclamations (à créer si pas encore de table)
    const { data: complaints } = await supabase
      .from('complaints')
      .select('*, user:user_id (id, email, full_name, username)')
      .eq('status', 'pending')
      .limit(5);

    setPendingRequests({
      diagnostics: diagnostics || [],
      orders: orders || [],
      complaints: complaints || []
    });
  };

  const createMission = async () => {
    if (!newMission.title) {
      Alert.alert('Erreur', 'Veuillez saisir un titre');
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase
      .from('missions')
      .insert({
        type: newMission.type,
        title: newMission.title,
        description: newMission.description,
        assigned_to: newMission.assigned_to,
        priority: newMission.priority,
        due_date: newMission.due_date || null,
        status: newMission.assigned_to ? 'assigned' : 'pending',
        created_by: (await supabase.auth.getUser()).data.user.id,
        source_id: selectedRequest?.id || null,
        source_type: selectedRequest?.type || null
      })
      .select()
      .single();

    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      Alert.alert('Succès', 'Mission créée avec succès');
      if (selectedRequest) {
        // Mettre à jour le statut de la demande source
        await updateSourceStatus(selectedRequest);
      }
      setCreateModalVisible(false);
      setNewMission({
        type: 'diagnostic',
        title: '',
        description: '',
        assigned_to: null,
        priority: 'normal',
        due_date: '',
      });
      setSelectedRequest(null);
      fetchMissions();
    }
    setSubmitting(false);
  };

  const updateSourceStatus = async (request) => {
    if (request.type === 'diagnostic') {
      await supabase
        .from('diagnosis_requests')
        .update({ status: 'assigned' })
        .eq('id', request.id);
    } else if (request.type === 'order') {
      await supabase
        .from('orders')
        .update({ status: 'processing' })
        .eq('id', request.id);
    } else if (request.type === 'complaint') {
      await supabase
        .from('complaints')
        .update({ status: 'assigned' })
        .eq('id', request.id);
    }
  };

  const updateMissionStatus = async (missionId, newStatus) => {
    setSubmitting(true);
    const { error } = await supabase
      .from('missions')
      .update({ status: newStatus })
      .eq('id', missionId);

    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      Alert.alert('Succès', 'Statut de la mission mis à jour');
      fetchMissions();
      setModalVisible(false);
    }
    setSubmitting(false);
  };

  const getStatusBadge = (status) => {
    const statusInfo = MISSION_STATUS.find(s => s.value === status);
    return (
      <View style={[styles.statusBadge, { backgroundColor: statusInfo?.color || '#757575' }]}>
        <Text style={styles.statusText}>{statusInfo?.label || status}</Text>
      </View>
    );
  };

  const getMissionTypeIcon = (type) => {
    const typeInfo = MISSION_TYPES.find(t => t.value === type);
    return typeInfo?.icon || 'assignment';
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.full_name || emp?.username || emp?.email || 'Non assigné';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non définie';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const filteredMissions = missions.filter(mission => {
    if (filterStatus !== 'all' && mission.status !== filterStatus) return false;
    if (filterType !== 'all' && mission.type !== filterType) return false;
    return true;
  });

  const renderMissionItem = ({ item }) => (
    <TouchableOpacity style={styles.missionCard} onPress={() => {
      setSelectedMission(item);
      setModalVisible(true);
    }}>
      <View style={styles.missionHeader}>
        <View style={styles.missionType}>
          <MaterialIcons name={getMissionTypeIcon(item.type)} size={20} color="#2e7d32" />
          <Text style={styles.missionTypeText}>
            {MISSION_TYPES.find(t => t.value === item.type)?.label || item.type}
          </Text>
        </View>
        {getStatusBadge(item.status)}
      </View>
      <Text style={styles.missionTitle}>{item.title}</Text>
      <Text style={styles.missionDesc} numberOfLines={2}>{item.description}</Text>
      <View style={styles.missionFooter}>
        <View style={styles.missionAssignee}>
          <MaterialIcons name="person" size={14} color="#666" />
          <Text style={styles.missionAssigneeText}>
            {item.assigned_to ? getEmployeeName(item.assigned_to) : 'Non assigné'}
          </Text>
        </View>
        <Text style={styles.missionDue}>📅 {formatDate(item.due_date)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderRequestItem = (request, type, label) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => {
        setSelectedRequest({ ...request, type, label });
        setNewMission({
          ...newMission,
          title: `${label} : ${request.user?.full_name || request.user?.email || request.id.slice(0, 8)}`,
          description: request.description || request.message || `Demande de ${label}`
        });
        setCreateModalVisible(true);
      }}
    >
      <View style={styles.requestHeader}>
        <Text style={styles.requestType}>{label}</Text>
        <Text style={styles.requestDate}>{formatDate(request.created_at)}</Text>
      </View>
      <Text style={styles.requestClient}>
        {request.user?.full_name || request.user?.username || request.user?.email}
      </Text>
      <Text style={styles.requestDesc} numberOfLines={2}>
        {request.description || request.message || `ID: ${request.id.slice(0, 8)}`}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <BackHeader title="Assigner des missions" />
      <View style={styles.container}>
        {/* Demandes en attente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Demandes en attente</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.requestsScroll}>
            {pendingRequests.diagnostics.length > 0 && renderRequestItem(pendingRequests.diagnostics[0], 'diagnostic', '🔍 Diagnostic')}
            {pendingRequests.orders.length > 0 && renderRequestItem(pendingRequests.orders[0], 'order', '📦 Commande')}
            {pendingRequests.complaints.length > 0 && renderRequestItem(pendingRequests.complaints[0], 'complaint', '💬 Réclamation')}
            <TouchableOpacity
              style={styles.createCard}
              onPress={() => {
                setSelectedRequest(null);
                setCreateModalVisible(true);
              }}
            >
              <MaterialIcons name="add-circle" size={32} color="#2e7d32" />
              <Text style={styles.createCardText}>Créer une mission</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Filtres */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterChip, filterStatus === 'all' && styles.filterChipActive]}
              onPress={() => setFilterStatus('all')}
            >
              <Text style={[styles.filterText, filterStatus === 'all' && styles.filterTextActive]}>Tous statuts</Text>
            </TouchableOpacity>
            {MISSION_STATUS.map(status => (
              <TouchableOpacity
                key={status.value}
                style={[styles.filterChip, filterStatus === status.value && styles.filterChipActive]}
                onPress={() => setFilterStatus(status.value)}
              >
                <Text style={[styles.filterText, filterStatus === status.value && styles.filterTextActive]}>
                  {status.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
              onPress={() => setFilterType('all')}
            >
              <Text style={[styles.filterText, filterType === 'all' && styles.filterTextActive]}>Tous types</Text>
            </TouchableOpacity>
            {MISSION_TYPES.map(type => (
              <TouchableOpacity
                key={type.value}
                style={[styles.filterChip, filterType === type.value && styles.filterChipActive]}
                onPress={() => setFilterType(type.value)}
              >
                <Text style={[styles.filterText, filterType === type.value && styles.filterTextActive]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Liste des missions */}
        <FlatList
          data={filteredMissions}
          renderItem={renderMissionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucune mission trouvée</Text>
            </View>
          }
        />
      </View>

      {/* Modal de détails de mission */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedMission && (
              <>
                <Text style={styles.modalTitle}>{selectedMission.title}</Text>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Type</Text>
                  <Text style={styles.modalText}>
                    {MISSION_TYPES.find(t => t.value === selectedMission.type)?.label || selectedMission.type}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Description</Text>
                  <Text style={styles.modalText}>{selectedMission.description || 'Aucune description'}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Assigné à</Text>
                  <Text style={styles.modalText}>{getEmployeeName(selectedMission.assigned_to)}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Statut</Text>
                  {getStatusBadge(selectedMission.status)}
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Échéance</Text>
                  <Text style={styles.modalText}>{formatDate(selectedMission.due_date)}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Changer le statut</Text>
                  <View style={styles.statusButtons}>
                    {MISSION_STATUS.map(status => (
                      <TouchableOpacity
                        key={status.value}
                        style={[styles.statusButton, { backgroundColor: status.color }]}
                        onPress={() => updateMissionStatus(selectedMission.id, status.value)}
                        disabled={submitting}
                      >
                        <Text style={styles.statusButtonText}>{status.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeButtonText}>Fermer</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Modal de création de mission */}
      <Modal visible={createModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>
              {selectedRequest ? 'Assigner une mission' : 'Créer une mission'}
            </Text>

            {selectedRequest && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Demande source</Text>
                <Text style={styles.modalText}>{selectedRequest.label}</Text>
                <Text style={styles.modalSubText}>
                  Client : {selectedRequest.user?.full_name || selectedRequest.user?.email}
                </Text>
              </View>
            )}

            <Text style={styles.modalLabel}>Type de mission *</Text>
            <View style={styles.typeContainer}>
              {MISSION_TYPES.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[styles.typeOption, newMission.type === type.value && styles.typeOptionActive]}
                  onPress={() => setNewMission({ ...newMission, type: type.value })}
                >
                  <MaterialIcons name={type.icon} size={20} color={newMission.type === type.value ? '#fff' : '#666'} />
                  <Text style={[styles.typeOptionText, newMission.type === type.value && styles.typeOptionTextActive]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Titre *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Titre de la mission"
              value={newMission.title}
              onChangeText={(text) => setNewMission({ ...newMission, title: text })}
            />

            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              placeholder="Description détaillée..."
              value={newMission.description}
              onChangeText={(text) => setNewMission({ ...newMission, description: text })}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.modalLabel}>Assigner à</Text>
            <View style={styles.employeeContainer}>
              <TouchableOpacity
                style={[styles.employeeOption, !newMission.assigned_to && styles.employeeOptionActive]}
                onPress={() => setNewMission({ ...newMission, assigned_to: null })}
              >
                <Text style={styles.employeeOptionText}>Non assigné</Text>
              </TouchableOpacity>
              {employees
                .filter(e => MISSION_TYPES.find(t => t.value === newMission.type)?.roles.includes(e.role))
                .map(emp => (
                  <TouchableOpacity
                    key={emp.id}
                    style={[styles.employeeOption, newMission.assigned_to === emp.id && styles.employeeOptionActive]}
                    onPress={() => setNewMission({ ...newMission, assigned_to: emp.id })}
                  >
                    <Text style={styles.employeeOptionText}>{emp.full_name || emp.username}</Text>
                  </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.modalLabel}>Priorité</Text>
            <View style={styles.priorityContainer}>
              {['low', 'normal', 'high'].map(priority => (
                <TouchableOpacity
                  key={priority}
                  style={[styles.priorityOption, newMission.priority === priority && styles.priorityOptionActive]}
                  onPress={() => setNewMission({ ...newMission, priority })}
                >
                  <Text style={styles.priorityOptionText}>
                    {priority === 'low' ? 'Basse' : priority === 'normal' ? 'Normale' : 'Haute'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Date d'échéance</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="YYYY-MM-DD"
              value={newMission.due_date}
              onChangeText={(text) => setNewMission({ ...newMission, due_date: text })}
            />

            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={createMission}
              disabled={submitting}
            >
              <Text style={styles.modalButtonText}>
                {submitting ? 'Création...' : 'Créer la mission'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancel} onPress={() => {
              setCreateModalVisible(false);
              setSelectedRequest(null);
              setNewMission({
                type: 'diagnostic',
                title: '',
                description: '',
                assigned_to: null,
                priority: 'normal',
                due_date: '',
              });
            }}>
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
  section: { padding: 15, paddingBottom: 5 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#2e7d32' },
  requestsScroll: { flexDirection: 'row' },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    width: 200,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  requestType: { fontSize: 12, fontWeight: 'bold', color: '#ff9800' },
  requestDate: { fontSize: 10, color: '#999' },
  requestClient: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  requestDesc: { fontSize: 11, color: '#666' },
  createCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    width: 200,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  createCardText: { fontSize: 12, color: '#2e7d32', marginTop: 8 },
  filterContainer: { paddingHorizontal: 15, paddingBottom: 10 },
  filterScroll: { flexDirection: 'row', marginBottom: 8 },
  filterChip: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#ddd' },
  filterChipActive: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  filterText: { fontSize: 12, color: '#666' },
  filterTextActive: { color: '#fff' },
  list: { padding: 15, paddingTop: 5 },
  missionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 10, elevation: 2 },
  missionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  missionType: { flexDirection: 'row', alignItems: 'center' },
  missionTypeText: { fontSize: 12, color: '#2e7d32', marginLeft: 5, fontWeight: '500' },
  missionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  missionDesc: { fontSize: 13, color: '#666', marginBottom: 10 },
  missionFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  missionAssignee: { flexDirection: 'row', alignItems: 'center' },
  missionAssigneeText: { fontSize: 11, color: '#666', marginLeft: 4 },
  missionDue: { fontSize: 11, color: '#999' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#2e7d32' },
  modalSection: { marginBottom: 15 },
  modalSectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 5, color: '#333' },
  modalText: { fontSize: 14, color: '#555' },
  modalSubText: { fontSize: 12, color: '#999', marginTop: 4 },
  modalLabel: { fontSize: 14, fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
  modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 10 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  typeContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  typeOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  typeOptionActive: { backgroundColor: '#2e7d32' },
  typeOptionText: { fontSize: 12, color: '#666', marginLeft: 5 },
  typeOptionTextActive: { color: '#fff' },
  employeeContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  employeeOption: { backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  employeeOptionActive: { backgroundColor: '#2e7d32' },
  employeeOptionText: { fontSize: 12, color: '#666' },
  priorityContainer: { flexDirection: 'row', marginBottom: 10 },
  priorityOption: { backgroundColor: '#f0f0f0', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  priorityOptionActive: { backgroundColor: '#ff9800' },
  priorityOptionText: { fontSize: 12, color: '#666' },
  statusButtons: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
  statusButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  statusButtonText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  modalButton: { padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  saveButton: { backgroundColor: '#2e7d32' },
  modalButtonText: { color: '#fff', fontWeight: 'bold' },
  modalCancel: { marginTop: 10, alignItems: 'center', padding: 10 },
  modalCancelText: { color: '#777' },
  closeButton: { marginTop: 15, alignItems: 'center', padding: 10 },
  closeButtonText: { color: '#777' },
});