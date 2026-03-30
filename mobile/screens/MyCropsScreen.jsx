//mobile/screens/MyCropsScreen.jsx

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function MyCropsScreen() {
  const { user } = useAuth();
  const [plantations, setPlantations] = useState([]);
  const [cropsList, setCropsList] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // État du formulaire
  const [formData, setFormData] = useState({
    crop_id: '',
    area_size: '',
    plant_count: '',
    initial_tech: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 1. Récupérer les cultures disponibles pour le sélecteur
    const { data: crops } = await supabase.from('crops').select('id, name');
    setCropsList(crops || []);

    // 2. Récupérer les parcelles de l'utilisateur
    const { data: plants, error } = await supabase
      .from('user_plantations')
      .select('*, crops(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (!error) setPlantations(plants);
  };

  const handleAddPlantation = async () => {
    if (!formData.crop_id || !formData.area_size) {
      Alert.alert("Erreur", "Veuillez remplir au moins la culture et la superficie.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('user_plantations').insert([{
      user_id: user.id,
      crop_id: formData.crop_id,
      area_size: parseFloat(formData.area_size),
      plant_count: parseInt(formData.plant_count) || 0,
      interventions: formData.initial_tech ? [{
        date: new Date().toISOString(),
        type: 'Initialisation',
        detail: formData.initial_tech
      }] : []
    }]);

    if (error) {
      Alert.alert("Erreur", error.message);
    } else {
      setModalVisible(false);
      setFormData({ crop_id: '', area_size: '', plant_count: '', initial_tech: '' });
      fetchData();
    }
    setLoading(false);
  };

  const renderPlantation = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cropName}>{item.crops?.name}</Text>
        <Text style={styles.dateBadge}>{new Date(item.planting_date).toLocaleDateString()}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Superficie</Text>
          <Text style={styles.statValue}>{item.area_size} Ha</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Plants</Text>
          <Text style={styles.statValue}>{item.plant_count}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Historique des techniques :</Text>
      {item.interventions && item.interventions.length > 0 ? (
        item.interventions.map((inter, index) => (
          <View key={index} style={styles.interventionItem}>
            <Text style={styles.interventionBullet}>•</Text>
            <Text style={styles.interventionText}>
              <Text style={{fontWeight: 'bold'}}>{inter.type}:</Text> {inter.detail}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.none}>Aucune technique enregistrée</Text>
      )}
      
      <TouchableOpacity style={styles.addInterventionBtn}>
        <Text style={styles.addInterventionText}>+ Ajouter une intervention</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={plantations}
        keyExtractor={(item) => item.id}
        renderItem={renderPlantation}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={isModalVisible} animationType="slide">
        <ScrollView style={styles.modalContent}>
          <Text style={styles.modalTitle}>Nouvelle Plantation</Text>
          
          <Text style={styles.label}>Culture</Text>
          <View style={styles.pickerContainer}>
            {cropsList.map(c => (
              <TouchableOpacity 
                key={c.id} 
                onPress={() => setFormData({...formData, crop_id: c.id})}
                style={[styles.chip, formData.crop_id === c.id && styles.chipActive]}
              >
                <Text style={formData.crop_id === c.id ? styles.chipTextActive : styles.chipText}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Superficie (Ha)</Text>
          <TextInput 
            style={styles.input} 
            keyboardType="numeric" 
            placeholder="Ex: 1.5" 
            onChangeText={(t) => setFormData({...formData, area_size: t})}
          />

          <Text style={styles.label}>Nombre de plants</Text>
          <TextInput 
            style={styles.input} 
            keyboardType="numeric" 
            placeholder="Ex: 500" 
            onChangeText={(t) => setFormData({...formData, plant_count: t})}
          />

          <Text style={styles.label}>Première technique appliquée</Text>
          <TextInput 
            style={[styles.input, {height: 80}]} 
            multiline 
            placeholder="Ex: Brûlis, engrais de fond..." 
            onChangeText={(t) => setFormData({...formData, initial_tech: t})}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)}>
              <Text style={{color: '#d32f2f'}}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnConfirm} onPress={handleAddPlantation} disabled={loading}>
              <Text style={{color: '#fff', fontWeight: 'bold'}}>{loading ? 'En cours...' : 'Enregistrer'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5', padding: 10 },
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cropName: { fontSize: 20, fontWeight: 'bold', color: '#1b5e20' },
  dateBadge: { backgroundColor: '#e8f5e9', color: '#2e7d32', paddingHorizontal: 8, borderRadius: 10, fontSize: 12 },
  statsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10, marginBottom: 10 },
  stat: { flex: 1 },
  statLabel: { fontSize: 12, color: '#888' },
  statValue: { fontSize: 16, fontWeight: 'bold' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 5 },
  interventionItem: { flexDirection: 'row', marginBottom: 3 },
  interventionBullet: { color: '#2e7d32', marginRight: 5, fontWeight: 'bold' },
  interventionText: { fontSize: 13, color: '#444' },
  addInterventionBtn: { marginTop: 10, padding: 8, borderDash: 1, borderWidth: 1, borderColor: '#2e7d32', borderRadius: 5, borderStyle: 'dashed' },
  addInterventionText: { color: '#2e7d32', textAlign: 'center', fontSize: 12 },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#2e7d32', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { color: '#fff', fontSize: 35 },
  modalContent: { padding: 20, backgroundColor: '#fff' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#2e7d32', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16 },
  pickerContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { padding: 8, backgroundColor: '#f0f0f0', borderRadius: 20, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: '#2e7d32' },
  chipTextActive: { color: '#fff' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, marginBottom: 50 },
  btnConfirm: { backgroundColor: '#2e7d32', padding: 15, borderRadius: 10, flex: 1, marginLeft: 10, alignItems: 'center' },
  btnCancel: { padding: 15, flex: 1, alignItems: 'center' }
});
