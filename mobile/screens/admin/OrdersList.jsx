// screens/admin/OrdersList.jsx
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

const ORDER_STATUS = [
  { value: 'pending_payment', label: '⏳ En attente de paiement', color: '#ff9800' },
  { value: 'paid', label: '✅ Payé', color: '#4caf50' },
  { value: 'processing', label: '📦 En traitement', color: '#2196f3' },
  { value: 'shipped', label: '🚚 Expédié', color: '#9c27b0' },
  { value: 'delivered', label: '🏠 Livré', color: '#2e7d32' },
  { value: 'cancelled', label: '❌ Annulé', color: '#f44336' },
];

const PAYMENT_METHODS = [
  { value: 'mobile_money', label: 'Mobile Money', icon: 'phone-android' },
  { value: 'pickup', label: 'Paiement à la livraison', icon: 'store' },
];

export default function OrdersList({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending_payment: 0,
    paid: 0,
    shipped: 0,
    delivered: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    fetchOrders();
  }, [filterStatus]);

  const fetchOrders = async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select(`
        *,
        user:user_id (id, email, full_name, username),
        payment_transactions (id, status, provider, ussd_code)
      `)
      .order('created_at', { ascending: false });

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query;
    if (error) console.error(error);
    else {
      setOrders(data || []);
      calculateStats(data || []);
    }
    setLoading(false);
  };

  const calculateStats = (ordersData) => {
    const statsData = {
      total: ordersData.length,
      pending_payment: ordersData.filter(o => o.status === 'pending_payment').length,
      paid: ordersData.filter(o => o.status === 'paid').length,
      shipped: ordersData.filter(o => o.status === 'shipped').length,
      delivered: ordersData.filter(o => o.status === 'delivered').length,
      totalRevenue: ordersData
        .filter(o => o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered')
        .reduce((sum, o) => sum + (o.total || 0), 0),
    };
    setStats(statsData);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    setUpdatingStatus(true);
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      Alert.alert('Succès', 'Statut de la commande mis à jour');
      fetchOrders();
      setModalVisible(false);
    }
    setUpdatingStatus(false);
  };

  const confirmPayment = async (orderId) => {
    setUpdatingStatus(true);
    // Mettre à jour la transaction
    const { error: txError } = await supabase
      .from('payment_transactions')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('order_id', orderId);

    if (txError) {
      Alert.alert('Erreur', txError.message);
    } else {
      // Mettre à jour la commande
      await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', orderId);
      Alert.alert('Succès', 'Paiement confirmé');
      fetchOrders();
      setModalVisible(false);
    }
    setUpdatingStatus(false);
  };

  const filteredOrders = orders.filter(order =>
    order.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const statusInfo = ORDER_STATUS.find(s => s.value === status);
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

  const formatPrice = (price) => {
    return `${price.toLocaleString()} FCFA`;
  };

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity style={styles.orderCard} onPress={() => {
      setSelectedOrder(item);
      setModalVisible(true);
    }}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>#{item.id.slice(0, 8)}</Text>
        {getStatusBadge(item.status)}
      </View>
      <Text style={styles.orderCustomer}>
        {item.user?.full_name || item.user?.username || item.user?.email}
      </Text>
      <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>{formatPrice(item.total)}</Text>
        <Text style={styles.orderMethod}>
          {PAYMENT_METHODS.find(m => m.value === item.payment_method)?.label || item.payment_method}
        </Text>
      </View>
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
      <BackHeader title="Gestion des commandes" />
      <View style={styles.container}>
        {/* Statistiques */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
          <StatCard label="Total" value={stats.total} color="#757575" />
          <StatCard label="En attente" value={stats.pending_payment} color="#ff9800" />
          <StatCard label="Payées" value={stats.paid} color="#4caf50" />
          <StatCard label="Expédiées" value={stats.shipped} color="#2196f3" />
          <StatCard label="Livrées" value={stats.delivered} color="#2e7d32" />
          <StatCard label="CA" value={`${(stats.totalRevenue / 1000).toFixed(0)}k`} color="#2e7d32" />
        </ScrollView>

        {/* Barre de recherche */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par client ou ID..."
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
            <Text style={[styles.filterText, filterStatus === 'all' && styles.filterTextActive]}>Toutes</Text>
          </TouchableOpacity>
          {ORDER_STATUS.map(status => (
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
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucune commande trouvée</Text>
            </View>
          }
        />
      </View>

      {/* Modal de détails */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedOrder && (
              <>
                <Text style={styles.modalTitle}>Commande #{selectedOrder.id.slice(0, 8)}</Text>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Client</Text>
                  <Text style={styles.modalText}>
                    {selectedOrder.user?.full_name || selectedOrder.user?.username || selectedOrder.user?.email}
                  </Text>
                  <Text style={styles.modalSubText}>{selectedOrder.user?.email}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Statut actuel</Text>
                  {getStatusBadge(selectedOrder.status)}
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Détails</Text>
                  <Text style={styles.modalText}>💰 Total : {formatPrice(selectedOrder.total)}</Text>
                  <Text style={styles.modalText}>
                    💳 Paiement : {PAYMENT_METHODS.find(m => m.value === selectedOrder.payment_method)?.label}
                  </Text>
                  <Text style={styles.modalText}>📅 Date : {formatDate(selectedOrder.created_at)}</Text>
                  {selectedOrder.delivery_address && (
                    <Text style={styles.modalText}>📍 Livraison : {selectedOrder.delivery_address}</Text>
                  )}
                </View>

                {selectedOrder.payment_transactions && selectedOrder.payment_transactions.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Transaction</Text>
                    <Text style={styles.modalText}>
                      Code USSD : {selectedOrder.payment_transactions[0].ussd_code}
                    </Text>
                    <Text style={styles.modalText}>
                      Statut : {selectedOrder.payment_transactions[0].status}
                    </Text>
                  </View>
                )}

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Changer le statut</Text>
                  <View style={styles.statusButtons}>
                    {ORDER_STATUS.map(status => (
                      <TouchableOpacity
                        key={status.value}
                        style={[
                          styles.statusButton,
                          { backgroundColor: status.color },
                          selectedOrder.status === status.value && styles.statusButtonActive
                        ]}
                        onPress={() => updateOrderStatus(selectedOrder.id, status.value)}
                        disabled={updatingStatus}
                      >
                        <Text style={styles.statusButtonText}>{status.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {selectedOrder.status === 'pending_payment' && (
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={() => confirmPayment(selectedOrder.id)}
                    disabled={updatingStatus}
                  >
                    <Text style={styles.confirmButtonText}>✅ Confirmer le paiement</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeButtonText}>Fermer</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
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
  orderCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 10, elevation: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderId: { fontSize: 14, fontWeight: 'bold', color: '#2e7d32' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  orderCustomer: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  orderDate: { fontSize: 11, color: '#999', marginBottom: 8 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  orderTotal: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32' },
  orderMethod: { fontSize: 11, color: '#666' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#2e7d32' },
  modalSection: { marginBottom: 20 },
  modalSectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  modalText: { fontSize: 14, color: '#555', marginBottom: 4 },
  modalSubText: { fontSize: 12, color: '#999' },
  statusButtons: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
  statusButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  statusButtonActive: { opacity: 0.7 },
  statusButtonText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  confirmButton: { backgroundColor: '#4caf50', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  confirmButtonText: { color: '#fff', fontWeight: 'bold' },
  closeButton: { marginTop: 15, alignItems: 'center', padding: 10 },
  closeButtonText: { color: '#777' },
});