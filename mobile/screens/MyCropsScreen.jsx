// mobile/screens/MyCropsScreen.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function MyCropsScreen({ route, navigation }) {
  const { user } = useAuth();
  const [plantations, setPlantations] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Formulaire aligné sur la table SQL
  const [formData, setFormData] = useState({
    crop_id: null,
    crop_name: '',
    area_size: '',
    plant_count: '',
    location_name: '',
    estimated_yield: '',
    initial_tech: ''
  });

  // Réception de la culture choisie depuis SelectCropScreen
  useEffect(() => {
    if (route.params?.selectedCropId) {
      setFormData(prev => ({ 
        ...prev, 
        crop_id: route.params.selectedCropId,
        crop_name: route.params.selectedCropName 
      }));
      setModalVisible(true);
    }
  }, [route.params]);

  useEffect(() => { fetchPlantations(); }, []);

  const fetchPlantations = async () => {
    const { data, error } = await supabase
      .from('user_plantations')
      .select('*, crops(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error) setPlantations(data);
  };

  const handleSave = async () => {
    if (!formData.crop_id || !formData.area_size) {
      Alert.alert("Champs requis", "La culture et la superficie sont obligatoires.");
      return;
    }

    setLoading(true);
    try {
      // Optionnel : Récupération GPS
      let location = await Location.getCurrentPositionAsync({});
      
      const { error } = await supabase.from('user_plantations').insert([{
        user_id: user.id,
        crop_id: formData.crop_id,
        area_size: parseFloat(formData.area_size),
        plant_count: parseInt(formData.plant_count) || 0,
        location_name: formData.location_name,
        estimated_yield: parseFloat(formData.estimated_yield) || 0,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        interventions: formData.initial_tech ? [{
          date: new Date().toISOString(),
          type: 'Préparation',
          detail: formData.initial_tech
        }] : []
      }]);

      if (error) throw error;
      
      Alert.alert("Succès", "Plantation enregistrée");
      setModalVisible(false);
      fetchPlantations();
    } catch (err) {
      Alert.alert("Erreur", err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
  <TouchableOpacity onPress={() => navigation.navigate('CropDetail', { plantation: item })}>
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cropTitle}>{item.crops?.name}</Text>
        <Text style={styles.statusBadge}>{item.status}</Text>
      </View>
      
      <Text style={styles.locationText}>📍 {item.location_name || 'Position inconnue'}</Text>

      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Surface</Text>
          <Text style={styles.value}>{item.area_size} Ha</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Plants</Text>
          <Text style={styles.value}>{item.plant_count}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Prévu</Text>
          <Text style={styles.value}>{item.estimated_yield} T</Text>
        </View>
      </View>

      <Text style={styles.sectionSub}>Dernière intervention :</Text>
      {item.interventions?.length > 0 ? (
        <Text style={styles.techText}>• {item.interventions[item.interventions.length - 1].detail}</Text>
      ) : (
        <Text style={styles.none}>Aucun suivi</Text>
      )}
    </View>
   </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList data={plantations} keyExtractor={i => i.id} renderItem={renderItem} />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('SelectCrop')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={isModalVisible} animationType="slide">
        <ScrollView style={styles.modalBody}>
          <Text style={styles.modalTitle}>Nouvelle Plantation</Text>
          
          <Text style={styles.fieldLabel}>Culture sélectionnée : {formData.crop_name}</Text>
          
          <TextInput 
            style={styles.input} 
            placeholder="Nom de la parcelle (ex: Champ Nord)" 
            onChangeText={t => setFormData({...formData, location_name: t})}
          />
          <TextInput 
            style={styles.input} 
            placeholder="Superficie (Ha)" 
            keyboardType="numeric"
            onChangeText={t => setFormData({...formData, area_size: t})}
          />
          <TextInput 
            style={styles.input} 
            placeholder="Nombre de plants" 
            keyboardType="numeric"
            onChangeText={t => setFormData({...formData, plant_count: t})}
          />
          <TextInput 
            style={styles.input} 
            placeholder="Rendement estimé (Tonnes)" 
            keyboardType="numeric"
            onChangeText={t => setFormData({...formData, estimated_yield: t})}
          />
          <TextInput 
            style={[styles.input, {height: 80}]} 
            placeholder="Première technique (ex: Labour, semis...)" 
            multiline
            onChangeText={t => setFormData({...formData, initial_tech: t})}
          />

          <View style={styles.btnRow}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.btnCancel}>
              <Text>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.btnSave} disabled={loading}>
              <Text style={{color: '#fff'}}>{loading ? 'Envoi...' : 'Enregistrer'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 10 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  cropTitle: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32' },
  statusBadge: { fontSize: 10, backgroundColor: '#e8f5e9', padding: 4, borderRadius: 5, color: '#2e7d32' },
  locationText: { fontSize: 12, color: '#666', marginBottom: 10 },
  grid: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fafafa', padding: 10, borderRadius: 8 },
  gridItem: { alignItems: 'center' },
  label: { fontSize: 10, color: '#888' },
  value: { fontSize: 14, fontWeight: 'bold' },
  sectionSub: { fontSize: 12, fontWeight: 'bold', marginTop: 10, color: '#444' },
  techText: { fontSize: 12, fontStyle: 'italic', color: '#666' },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#2e7d32', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  fabText: { color: '#fff', fontSize: 30 },
  modalBody: { padding: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#2e7d32' },
  fieldLabel: { marginBottom: 15, fontWeight: 'bold', color: '#1b5e20' },
  input: { borderBottomWidth: 1, borderBottomColor: '#ddd', marginBottom: 20, padding: 8 },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  btnSave: { backgroundColor: '#2e7d32', padding: 15, borderRadius: 8, flex: 1, marginLeft: 10, alignItems: 'center' },
  btnCancel: { padding: 15, flex: 1, alignItems: 'center' }
});
