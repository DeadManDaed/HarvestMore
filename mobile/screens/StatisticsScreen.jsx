// mobile/screens/StatisticsScreen.jsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Dimensions, Modal, FlatList
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import BackHeader from '../components/BackHeader';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function StatisticsScreen({ navigation }) {
  const { user } = useAuth();
  const [plantations, setPlantations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlantation, setSelectedPlantation] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [stats, setStats] = useState({
    totalArea: 0,
    totalPlants: 0,
    totalYield: 0,
    averageYield: 0,
    totalInterventions: 0,
    totalCost: 0,
    yieldPerHa: 0
  });
  const [yearlyStats, setYearlyStats] = useState([]);
  const [cropDistribution, setCropDistribution] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Récupérer toutes les plantations de l'utilisateur
      const { data: plantationsData, error: plantationsError } = await supabase
        .from('user_plantations')
        .select(`
          *,
          crops: crops (id, name, category)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (plantationsError) throw plantationsError;
      setPlantations(plantationsData || []);

      // Calculer les statistiques globales
      calculateGlobalStats(plantationsData || []);
      calculateCropDistribution(plantationsData || []);
      calculateYearlyStats(plantationsData || []);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calculateGlobalStats = (data) => {
    let totalArea = 0;
    let totalPlants = 0;
    let totalYield = 0;
    let totalInterventions = 0;
    let totalCost = 0;
    let yieldCount = 0;

    data.forEach(p => {
      totalArea += p.area_size || 0;
      totalPlants += p.plant_count || 0;
      if (p.estimated_yield) {
        totalYield += p.estimated_yield;
        yieldCount++;
      }
      const interventions = p.interventions || [];
      totalInterventions += interventions.length;
      interventions.forEach(i => {
        totalCost += i.cost || 0;
      });
    });

    setStats({
      totalArea: Math.round(totalArea * 100) / 100,
      totalPlants,
      totalYield: Math.round(totalYield * 100) / 100,
      averageYield: yieldCount > 0 ? Math.round((totalYield / yieldCount) * 100) / 100 : 0,
      totalInterventions,
      totalCost: Math.round(totalCost),
      yieldPerHa: totalArea > 0 ? Math.round((totalYield / totalArea) * 100) / 100 : 0
    });
  };

  const calculateCropDistribution = (data) => {
    const distribution = {};
    data.forEach(p => {
      const cropName = p.crops?.name || 'Inconnu';
      const area = p.area_size || 0;
      distribution[cropName] = (distribution[cropName] || 0) + area;
    });
    const sorted = Object.entries(distribution)
      .map(([name, area]) => ({ name, area: Math.round(area * 100) / 100 }))
      .sort((a, b) => b.area - a.area);
    setCropDistribution(sorted);
  };

  const calculateYearlyStats = (data) => {
    const years = {};
    data.forEach(p => {
      const year = new Date(p.created_at).getFullYear();
      if (!years[year]) {
        years[year] = { year, area: 0, yield: 0, interventions: 0, cost: 0 };
      }
      years[year].area += p.area_size || 0;
      years[year].yield += p.estimated_yield || 0;
      const interventions = p.interventions || [];
      years[year].interventions += interventions.length;
      interventions.forEach(i => {
        years[year].cost += i.cost || 0;
      });
    });
    const sortedYears = Object.values(years).sort((a, b) => b.year - a.year);
    setYearlyStats(sortedYears);
  };

  const getCropIcon = (category) => {
    const icons = {
      'Céréale': '🌾',
      'Tubercule': '🥔',
      'Légume': '🥬',
      'Fruitier': '🍎',
      'Légumineuse': '🫘'
    };
    return icons[category] || '🌿';
  };

  const StatCard = ({ title, value, unit, icon, color }) => (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <View style={styles.statCardHeader}>
        <MaterialIcons name={icon} size={24} color={color} />
        <Text style={styles.statCardTitle}>{title}</Text>
      </View>
      <Text style={[styles.statCardValue, { color }]}>{value}</Text>
      {unit && <Text style={styles.statCardUnit}>{unit}</Text>}
    </View>
  );

  const YearCard = ({ data }) => (
    <View style={styles.yearCard}>
      <Text style={styles.yearTitle}>{data.year}</Text>
      <View style={styles.yearStats}>
        <View style={styles.yearStatItem}>
          <Text style={styles.yearStatValue}>{data.area} Ha</Text>
          <Text style={styles.yearStatLabel}>Superficie</Text>
        </View>
        <View style={styles.yearStatItem}>
          <Text style={styles.yearStatValue}>{data.yield} T</Text>
          <Text style={styles.yearStatLabel}>Rendement</Text>
        </View>
        <View style={styles.yearStatItem}>
          <Text style={styles.yearStatValue}>{data.interventions}</Text>
          <Text style={styles.yearStatLabel}>Interventions</Text>
        </View>
        <View style={styles.yearStatItem}>
          <Text style={styles.yearStatValue}>{data.cost.toLocaleString()} FCFA</Text>
          <Text style={styles.yearStatLabel}>Coût total</Text>
        </View>
      </View>
    </View>
  );

  const handlePlantationPress = (plantation) => {
    setSelectedPlantation(plantation);
    setModalVisible(true);
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
      <BackHeader title="Statistiques" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Vue d'ensemble */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Vue d'ensemble</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Superficie totale"
              value={stats.totalArea}
              unit="Ha"
              icon="landscape"
              color="#2e7d32"
            />
            <StatCard
              title="Nombre de plants"
              value={stats.totalPlants.toLocaleString()}
              icon="grass"
              color="#4caf50"
            />
            <StatCard
              title="Rendement total"
              value={stats.totalYield}
              unit="T"
              icon="harvest"
              color="#ff9800"
            />
            <StatCard
              title="Rendement moyen"
              value={stats.averageYield}
              unit="T/ha"
              icon="trending-up"
              color="#2196f3"
            />
            <StatCard
              title="Interventions"
              value={stats.totalInterventions}
              icon="history"
              color="#9c27b0"
            />
            <StatCard
              title="Coût total"
              value={stats.totalCost.toLocaleString()}
              unit="FCFA"
              icon="attach-money"
              color="#f44336"
            />
          </View>
        </View>

        {/* Distribution par culture */}
        {cropDistribution.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌾 Répartition par culture</Text>
            <View style={styles.distributionContainer}>
              {cropDistribution.map((crop, index) => (
                <View key={index} style={styles.distributionItem}>
                  <View style={styles.distributionHeader}>
                    <Text style={styles.distributionName}>{crop.name}</Text>
                    <Text style={styles.distributionValue}>{crop.area} Ha</Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        { width: `${(crop.area / stats.totalArea) * 100}%` }
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Évolution annuelle */}
        {yearlyStats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Évolution annuelle</Text>
            {yearlyStats.map((year, index) => (
              <YearCard key={index} data={year} />
            ))}
          </View>
        )}

        {/* Liste des parcelles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌱 Mes parcelles</Text>
          {plantations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucune parcelle enregistrée</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('MyCrops')}
              >
                <Text style={styles.addButtonText}>+ Ajouter une parcelle</Text>
              </TouchableOpacity>
            </View>
          ) : (
            plantations.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.plantationCard}
                onPress={() => handlePlantationPress(p)}
              >
                <View style={styles.plantationHeader}>
                  <Text style={styles.plantationName}>
                    {getCropIcon(p.crops?.category)} {p.crops?.name}
                  </Text>
                  <Text style={styles.plantationDate}>
                    {new Date(p.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.plantationDetails}>
                  <Text style={styles.plantationDetail}>📍 {p.location_name || 'Non géolocalisée'}</Text>
                  <Text style={styles.plantationDetail}>📏 {p.area_size || 0} Ha • 🌿 {p.plant_count || 0} plants</Text>
                  {p.estimated_yield && (
                    <Text style={styles.plantationYield}>📈 Rendement est. : {p.estimated_yield} T</Text>
                  )}
                </View>
                <Text style={styles.plantationInterventions}>
                  {p.interventions?.length || 0} intervention(s)
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal de détails d'une parcelle */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedPlantation && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {selectedPlantation.crops?.name}
                  </Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <MaterialIcons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="location-on" size={20} color="#666" />
                    <Text style={styles.modalInfoText}>
                      {selectedPlantation.location_name || 'Non géolocalisée'}
                    </Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="straighten" size={20} color="#666" />
                    <Text style={styles.modalInfoText}>
                      Superficie : {selectedPlantation.area_size || 0} Ha
                    </Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="grass" size={20} color="#666" />
                    <Text style={styles.modalInfoText}>
                      Plants : {selectedPlantation.plant_count || 0}
                    </Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="bar-chart" size={20} color="#666" />
                    <Text style={styles.modalInfoText}>
                      Rendement estimé : {selectedPlantation.estimated_yield || 'Non renseigné'} T
                    </Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="history" size={20} color="#666" />
                    <Text style={styles.modalInfoText}>
                      Interventions : {selectedPlantation.interventions?.length || 0}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => {
                      setModalVisible(false);
                      navigation.navigate('CropDetail', { plantation: selectedPlantation });
                    }}
                  >
                    <Text style={styles.modalButtonText}>Voir les détails</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: 15 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32', marginBottom: 15 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { width: (width - 40) / 2 - 5, backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, elevation: 2, borderTopWidth: 3 },
  statCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statCardTitle: { fontSize: 12, color: '#666', marginLeft: 5 },
  statCardValue: { fontSize: 22, fontWeight: 'bold' },
  statCardUnit: { fontSize: 11, color: '#999', marginTop: 2 },
  distributionContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 15, elevation: 2 },
  distributionItem: { marginBottom: 12 },
  distributionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  distributionName: { fontSize: 14, fontWeight: '500' },
  distributionValue: { fontSize: 12, color: '#2e7d32', fontWeight: 'bold' },
  progressBarContainer: { height: 6, backgroundColor: '#e0e0e0', borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#2e7d32', borderRadius: 3 },
  yearCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 10, elevation: 2 },
  yearTitle: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32', marginBottom: 10 },
  yearStats: { flexDirection: 'row', justifyContent: 'space-between' },
  yearStatItem: { alignItems: 'center' },
  yearStatValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  yearStatLabel: { fontSize: 10, color: '#999', marginTop: 2 },
  plantationCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 10, elevation: 2 },
  plantationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  plantationName: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32' },
  plantationDate: { fontSize: 10, color: '#999' },
  plantationDetails: { marginBottom: 8 },
  plantationDetail: { fontSize: 12, color: '#666', marginBottom: 4 },
  plantationYield: { fontSize: 12, color: '#ff9800', fontWeight: '500' },
  plantationInterventions: { fontSize: 11, color: '#2196f3' },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#999', marginBottom: 15 },
  addButton: { backgroundColor: '#2e7d32', padding: 12, borderRadius: 8 },
  addButtonText: { color: '#fff', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 15, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32' },
  modalBody: { padding: 15 },
  modalInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  modalInfoText: { fontSize: 14, color: '#333', flex: 1 },
  modalButton: { backgroundColor: '#2e7d32', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  modalButtonText: { color: '#fff', fontWeight: 'bold' }
});