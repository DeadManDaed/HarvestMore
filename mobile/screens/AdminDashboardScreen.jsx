// screens/admin/AdminDashboardScreen.jsx

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import BackHeader from '../../components/BackHeader';

export default function AdminDashboard({ navigation }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingDiagnostics: 0,
    pendingOrders: 0,
    activeConversations: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [
        { count: totalUsers },
        { count: pendingDiagnostics },
        { count: pendingOrders },
        { count: activeConversations }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('diagnosis_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending_payment'),
        supabase.from('conversations').select('*', { count: 'exact', head: true }).gt('last_message_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      ]);
      setStats({ totalUsers, pendingDiagnostics, pendingOrders, activeConversations });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (screen) => {
    navigation.navigate(screen);
  };

  return (
    <View style={{ flex: 1 }}>
      <BackHeader title="Administration" />
      <ScrollView style={styles.container}>
        <View style={styles.statsGrid}>
          <StatCard label="Utilisateurs" value={stats.totalUsers} color="#2196f3" />
          <StatCard label="Diagnostics en attente" value={stats.pendingDiagnostics} color="#ff9800" />
          <StatCard label="Commandes en attente" value={stats.pendingOrders} color="#f44336" />
          <StatCard label="Conversations actives" value={stats.activeConversations} color="#4caf50" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gestion des utilisateurs</Text>
          <TouchableOpacity style={styles.card} onPress={() => navigateTo('UserManagement')}>
            <Text style={styles.cardTitle}>👥 Gérer les utilisateurs</Text>
            <Text style={styles.cardDesc}>Créer, modifier, suspendre des comptes</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activités</Text>
          <TouchableOpacity style={styles.card} onPress={() => navigateTo('DiagnosticsList')}>
            <Text style={styles.cardTitle}>🔍 Diagnostics</Text>
            <Text style={styles.cardDesc}>Consulter toutes les demandes de diagnostic</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => navigateTo('OrdersList')}>
            <Text style={styles.cardTitle}>📦 Commandes</Text>
            <Text style={styles.cardDesc}>Suivi des commandes clients</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => navigateTo('MessagesAudit')}>
            <Text style={styles.cardTitle}>💬 Messages</Text>
            <Text style={styles.cardDesc}>Surveiller les conversations (audit)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assignations</Text>
          <TouchableOpacity style={styles.card} onPress={() => navigateTo('AssignMission')}>
            <Text style={styles.cardTitle}>📋 Assigner une mission</Text>
            <Text style={styles.cardDesc}>Affecter des tâches aux techniciens/commerciaux</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingTop: 15, justifyContent: 'space-between' },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderTopWidth: 4,
    elevation: 2,
  },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 5 },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#2e7d32' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 10, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  cardDesc: { fontSize: 12, color: '#666', marginTop: 4 },
});