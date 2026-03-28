// screens/admin/DiagnosticsList.jsx
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
  ScrollView,
  Image
} from 'react-native';
import { supabase } from '../../lib/supabase';
import BackHeader from '../../components/BackHeader';
import { MaterialIcons } from '@expo/vector-icons';

const DIAGNOSIS_STATUS = [
  { value: 'pending', label: '⏳ En attente', color: '#ff9800' },
  { value: 'assigned', label: '👤 Assigné', color: '#2196f3' },
  { value: 'in_progress', label: '🔄 En cours', color: '#4caf50' },
  { value: 'resolved', label: '✅ Résolu', color: '#2e7d32' },
  { value: 'rejected', label: '❌ Rejeté', color: '#f44336' },
];

export default function DiagnosticsList({ navigation }) {
  const [diagnostics, setDiagnostics] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedDiagnostic, setSelectedDiagnostic] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [updating, setUpdating] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    assigned: 0,
    in_progress: 0,
    resolved: 0,
    avgResponseTime: 0,
  });

  useEffect(() => {
    fetchDiagnostics();
    fetchTechnicians();
  }, [filterStatus]);

  const fetchDiagnostics = async () => {
    setLoading(true);
    let query = supabase
      .from('diagnosis_requests')
      .select(`
        *,
        user:user_id (id, email, full_name, username, phone),
        crop:crop_id (id, name),
        assigned_technician:assigned_technician_id (id, email, full_name, username)
      `)
      .order('created_at', { ascending: false });

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query;
    if (error) console.error(error);
    else {
      setDiagnostics(data || []);
      calculateStats(data || []);
    }
    setLoading(false);
  };

  const calculateStats = (data) => {
    const resolved = data.filter(d => d.status === 'resolved').length;
    const avgResponseTime = resolved > 0
      ? data
          .filter(d => d.status === 'resolved' && d.resolved_at)
          .reduce((sum, d) => {
            const created = new Date(d.created_at);
            const resolved = new Date(d.resolved_at);
            return sum + (resolved - created);
          }, 0) / resolved / (1000 * 60 * 60) // heures
      : 0;

    setStats({
      total: data.length,
      pending: data.filter(d => d.status === 'pending').length,
      assigned: data.filter(d => d.status === 'assigned').length,
      in_progress: data.filter(d => d.status === 'in_progress').length,
      resolved: resolved,
      avgResponseTime: Math.round(avgResponseTime),
    });
  };

  const fetchTechnicians = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, username')
      .eq('role', 'technician');

    if (error) console.error(error);
    else setTechnicians(data || []);
  };

  const assignDiagnostic = async () => {
    if (!selectedTechnician) {
      Alert.alert('Erreur', 'Veuillez sélectionner un technicien');
      return;
    }

    setUpdating(true);
    const { error } = await supabase
      .from('diagnosis_requests')
      .update({
        assigned_technician_id: selectedTechnician,
        status: 'assigned'
      })
      .eq('id', selectedDiagnostic.id);

    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      Alert.alert('Succès', 'Diagnostic assigné');
      // Créer une conversation automatique
      await createConversation(selectedDiagnostic.id, selectedTechnician);
      fetchDiagnostics();
      setAssignModalVisible(false);
    }
    setUpdating(false);
  };

  const createConversation = async (diagnosisId, technicianId) => {
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('diagnosis_request_id', diagnosisId)
      .maybeSingle();

    if (!existing) {
      await supabase
        .from('conversations')
        .insert({
          user_id: selectedDiagnostic.user_id,
          technician_id: technicianId,
          diagnosis_request_id: diagnosisId,
          last_message: 'Diagnostic assigné',
          last_message_at: new Date()
        });
    }
  };

  const updateStatus = async (newStatus) => {
    setUpdating(true);
    const updates = { status: newStatus };
    if (newStatus === 'resolved') {
      updates.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('diagnosis_requests')
      .update(updates)
      .eq('id', selectedDiagnostic.id);

    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      Alert.alert('Succès', 'Statut mis à jour');
      fetchDiagnostics();
      setModalVisible(false);
    }
    setUpdating(false);
  };

  const sendReply = async () => {
    if (!replyText.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir une réponse');
      return;
    }

    setUpdating(true);
    try {
      // Trouver ou créer la conversation
      let conversationId = null;
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('diagnosis_request_id', selectedDiagnostic.id)
        .maybeSingle();

      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            user_id: selectedDiagnostic.user_id,
            technician_id: selectedDiagnostic.assigned_technician_id,
            diagnosis_request_id: selectedDiagnostic.id,
            last_message: replyText,
            last_message_at: new Date()
          })
          .select()
          .single();
        conversationId = newConv.id;
      }

      // Envoyer le message
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: (await supabase.auth.getUser()).data.user.id,
          content: replyText
        });

      if (msgError) throw msgError;

      // Mettre à jour la conversation
      await supabase
        .from('conversations')
        .update({
          last_message: replyText,
          last_message_at: new Date()
        })
        .eq('id', conversationId);

      // Mettre à jour le diagnostic si besoin
      if (selectedDiagnostic.status !== 'resolved') {
        await supabase
          .from('diagnosis_requests')
          .update({ technician_response: replyText })
          .eq('id', selectedDiagnostic.id);
      }

      Alert.alert('Succès', 'Réponse envoyée');
      setReplyModalVisible(false);
      setReplyText('');
      fetchDiagnostics();
    } catch (error) {
      Alert.alert('Erreur', error.message);
    }
    setUpdating(false);
  };

  const getStatusBadge = (status) => {
    const statusInfo = DIAGNOSIS_STATUS.find(s => s.value === status);
    return (
      <View style={[styles.statusBadge, { backgroundColor: statusInfo?.color || '#757575' }]}>
        <Text style={styles.statusText}>{statusInfo?.label || status}</Text>
      </View>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSeverityIcon = (severity) => {
    if (severity === 3) return 'error';
    if (severity === 2) return 'warning';
    return 'info';
  };

  const filteredDiagnostics = diagnostics.filter(d => {
    const matchesSearch = d.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.crop?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const renderDiagnosticItem = ({ item }) => (
    <TouchableOpacity style={styles.diagnosticCard} onPress={() => {
      setSelectedDiagnostic(item);
      setModalVisible(true);
    }}>
      <View style={styles.diagnosticHeader}>
        <View style={styles.diagnosticInfo}>
          <Text style={styles.diagnosticCrop}>{item.crop?.name || 'Culture inconnue'}</Text>
          {item.severity && (
            <MaterialIcons name={getSeverityIcon(item.severity)} size={16} color={item.severity === 3 ? '#f44336' : item.severity === 2 ? '#ff9800' : '#2196f3'} />
          )}
        </View>
        {getStatusBadge(item.status)}
      </View>
      <Text style={styles.diagnosticUser}>
        {item.user?.full_name || item.user?.username || item.user?.email}
      </Text>
      <Text style={styles.diagnosticDate}>{formatDate(item.created_at)}</Text>
      {item.assigned_technician && (
        <Text style={styles.diagnosticTechnician}>
          👤 {item.assigned_technician.full_name || item.assigned_technician.username}
        </Text>
      )}
      {item.symptom_ids && item.symptom_ids.length > 0 && (
        <Text style={styles.diagnosticSymptoms}>
          📋 {item.symptom_ids.length} symptôme(s) signalé(s)
        </Text>
      )}
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
      <BackHeader title="Gestion des diagnostics" />
      <View style={styles.container}>
        {/* Statistiques */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
          <StatCard label="Total" value={stats.total} color="#757575" />
          <StatCard label="En attente" value={stats.pending} color="#ff9800" />
          <StatCard label="Assignés" value={stats.assigned} color="#2196f3" />
          <StatCard label="En cours" value={stats.in_progress} color="#4caf50" />
          <StatCard label="Résolus" value={stats.resolved} color="#2e7d32" />
          <StatCard label="Tps moyen" value={`${stats.avgResponseTime}h`} color="#2e7d32" />
        </ScrollView>

        {/* Barre de recherche */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par client ou culture..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filtres */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'all' && styles.filterChipActive]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.filterText, filterStatus === 'all' && styles.filterTextActive]}>Tous</Text>
          </TouchableOpacity>
          {DIAGNOSIS_STATUS.map(status => (
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

        <FlatList
          data={filteredDiagnostics}
          renderItem={renderDiagnosticItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun diagnostic trouvé</Text>
            </View>
          }
        />
      </View>

      {/* Modal de détails */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedDiagnostic && (
              <>
                <Text style={styles.modalTitle}>Diagnostic #{selectedDiagnostic.id.slice(0, 8)}</Text>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Client</Text>
                  <Text style={styles.modalText}>
                    {selectedDiagnostic.user?.full_name || selectedDiagnostic.user?.username || selectedDiagnostic.user?.email}
                  </Text>
                  <Text style={styles.modalSubText}>{selectedDiagnostic.user?.email}</Text>
                  {selectedDiagnostic.user?.phone && (
                    <Text style={styles.modalSubText}>📞 {selectedDiagnostic.user?.phone}</Text>
                  )}
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Culture</Text>
                  <Text style={styles.modalText}>{selectedDiagnostic.crop?.name || 'Non spécifiée'}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Symptômes</Text>
                  {selectedDiagnostic.symptom_ids && selectedDiagnostic.symptom_ids.length > 0 ? (
                    <Text style={styles.modalText}>{selectedDiagnostic.symptom_ids.length} symptôme(s) sélectionné(s)</Text>
                  ) : (
                    <Text style={styles.modalText}>Aucun symptôme spécifié</Text>
                  )}
                </View>

                {selectedDiagnostic.images && selectedDiagnostic.images.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Images</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {selectedDiagnostic.images.map((img, idx) => (
                        <Image key={idx} source={{ uri: img }} style={styles.modalImage} />
                      ))}
                    </ScrollView>
                  </View>
                )}

                {selectedDiagnostic.location && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Localisation</Text>
                    <Text style={styles.modalText}>{selectedDiagnostic.location}</Text>
                  </View>
                )}

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Statut</Text>
                  {getStatusBadge(selectedDiagnostic.status)}
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Technicien assigné</Text>
                  <Text style={styles.modalText}>
                    {selectedDiagnostic.assigned_technician?.full_name ||
                     selectedDiagnostic.assigned_technician?.username ||
                     'Non assigné'}
                  </Text>
                </View>

                {selectedDiagnostic.technician_response && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Réponse du technicien</Text>
                    <Text style={styles.modalText}>{selectedDiagnostic.technician_response}</Text>
                  </View>
                )}

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Dates</Text>
                  <Text style={styles.modalText}>Créé le : {formatDate(selectedDiagnostic.created_at)}</Text>
                  {selectedDiagnostic.resolved_at && (
                    <Text style={styles.modalText}>Résolu le : {formatDate(selectedDiagnostic.resolved_at)}</Text>
                  )}
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Actions</Text>
                  <View style={styles.actionButtons}>
                    {!selectedDiagnostic.assigned_technician_id && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.assignButton]}
                        onPress={() => {
                          setModalVisible(false);
                          setAssignModalVisible(true);
                        }}
                      >
                        <Text style={styles.actionButtonText}>👤 Assigner</Text>
                      </TouchableOpacity>
                    )}
                    {(selectedDiagnostic.status === 'assigned' || selectedDiagnostic.status === 'in_progress') && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.replyButton]}
                        onPress={() => {
                          setModalVisible(false);
                          setReplyModalVisible(true);
                        }}
                      >
                        <Text style={styles.actionButtonText}>💬 Répondre</Text>
                      </TouchableOpacity>
                    )}
                    {selectedDiagnostic.status !== 'resolved' && selectedDiagnostic.status !== 'rejected' && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.resolveButton]}
                        onPress={() => updateStatus('resolved')}
                        disabled={updating}
                      >
                        <Text style={styles.actionButtonText}>✅ Marquer résolu</Text>
                      </TouchableOpacity>
                    )}
                    {selectedDiagnostic.status !== 'rejected' && selectedDiagnostic.status !== 'resolved' && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => updateStatus('rejected')}
                        disabled={updating}
                      >
                        <Text style={styles.actionButtonText}>❌ Rejeter</Text>
                      </TouchableOpacity>
                    )}
                    {selectedDiagnostic.status === 'assigned' && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.progressButton]}
                        onPress={() => updateStatus('in_progress')}
                        disabled={updating}
                      >
                        <Text style={styles.actionButtonText}>🔄 Marquer en cours</Text>
                      </TouchableOpacity>
                    )}
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

      {/* Modal d'assignation */}
      <Modal visible={assignModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assigner à un technicien</Text>

            <Text style={styles.modalLabel}>Sélectionner un technicien</Text>
            <View style={styles.technicianContainer}>
              {technicians.map(tech => (
                <TouchableOpacity
                  key={tech.id}
                  style={[styles.technicianOption, selectedTechnician === tech.id && styles.technicianOptionActive]}
                  onPress={() => setSelectedTechnician(tech.id)}
                >
                  <Text style={[styles.technicianOptionText, selectedTechnician === tech.id && styles.technicianOptionTextActive]}>
                    {tech.full_name || tech.username}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={assignDiagnostic}
              disabled={updating}
            >
              <Text style={styles.modalButtonText}>{updating ? 'Assignation...' : 'Assigner'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancel} onPress={() => {
              setAssignModalVisible(false);
              setSelectedTechnician(null);
            }}>
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de réponse */}
      <Modal visible={replyModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Répondre au diagnostic</Text>

            <Text style={styles.modalLabel}>Votre réponse</Text>
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              placeholder="Saisissez votre réponse..."
              value={replyText}
              onChangeText={setReplyText}
              multiline
              numberOfLines={5}
            />

            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={sendReply}
              disabled={updating}
            >
              <Text style={styles.modalButtonText}>{updating ? 'Envoi...' : 'Envoyer'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancel} onPress={() => {
              setReplyModalVisible(false);
              setReplyText('');
            }}>
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const StatCard = ({ label, value, color }) => (
  <View style={[styles.statCard, { borderTopColor: color }]}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsScroll: { paddingHorizontal: 15, paddingVertical: 10, flexGrow: 0 },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    minWidth: 80,
    alignItems: 'center',
    borderTopWidth: 4,
    elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 15, marginBottom: 10, borderRadius: 25, paddingHorizontal: 15, borderWidth: 1, borderColor: '#ddd' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14 },
  filterScroll: { paddingHorizontal: 15, paddingBottom: 10, flexGrow: 0 },
  filterChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#ddd' },
  filterChipActive: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  filterText: { fontSize: 12, color: '#666' },
  filterTextActive: { color: '#fff' },
  list: { padding: 15, paddingTop: 5 },
  diagnosticCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 10, elevation: 2 },
  diagnosticHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  diagnosticInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  diagnosticCrop: { fontSize: 14, fontWeight: 'bold', color: '#2e7d32' },
  diagnosticUser: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  diagnosticDate: { fontSize: 11, color: '#999', marginBottom: 4 },
  diagnosticTechnician: { fontSize: 12, color: '#666', marginBottom: 4 },
  diagnosticSymptoms: { fontSize: 11, color: '#2196f3', marginTop: 4 },
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
  modalSubText: { fontSize: 12, color: '#999', marginTop: 2 },
  modalImage: { width: 100, height: 100, borderRadius: 8, marginRight: 8, backgroundColor: '#f0f0f0' },
  modalLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 15 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  actionButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 5 },
  actionButton: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, minWidth: 120, alignItems: 'center' },
  assignButton: { backgroundColor: '#2196f3' },
  replyButton: { backgroundColor: '#4caf50' },
  resolveButton: { backgroundColor: '#2e7d32' },
  rejectButton: { backgroundColor: '#f44336' },
  progressButton: { backgroundColor: '#ff9800' },
  actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  technicianContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  technicianOption: { backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  technicianOptionActive: { backgroundColor: '#2e7d32' },
  technicianOptionText: { fontSize: 12, color: '#666' },
  technicianOptionTextActive: { color: '#fff' },
  modalButton: { padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  saveButton: { backgroundColor: '#2e7d32' },
  modalButtonText: { color: '#fff', fontWeight: 'bold' },
  modalCancel: { marginTop: 10, alignItems: 'center', padding: 10 },
  modalCancelText: { color: '#777' },
  closeButton: { marginTop: 15, alignItems: 'center', padding: 10 },
  closeButtonText: { color: '#777' },
});
     