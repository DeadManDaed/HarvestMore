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
  const [locationPermission, setLocationPermission] = useState(null);

  const [formData, setFormData] = useState({
    crop_id: null, crop_name: '', area_size: '', plant_count: '',
    location_name: '', estimated_yield: '', initial_tech: ''
  });

  // 1. Demander la permission GPS dès le chargement
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    })();
    fetchPlantations();
  }, []);

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
      let coords = { latitude: null, longitude: null };
      
      // On ne demande le GPS que si on a la permission
      if (locationPermission) {
        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        coords.latitude = loc.coords.latitude;
        coords.longitude = loc.coords.longitude;
      }

      const { error } = await supabase.from('user_plantations').insert([{
        user_id: user.id,
        crop_id: formData.crop_id,
        area_size: parseFloat(formData.area_size),
        plant_count: parseInt(formData.plant_count) || 0,
        location_name: formData.location_name,
        estimated_yield: parseFloat(formData.estimated_yield) || 0,
        latitude: coords.latitude,
        longitude: coords.longitude,
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
      Alert.alert("Erreur", "Impossible d'enregistrer la localisation. Vérifiez votre GPS.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER D'ACTION RAPIDE */}
      <View style={styles.quickActionBox}>
        <Text style={styles.quickActionTitle}>Un problème sur une culture ?</Text>
        <TouchableOpacity 
          style={styles.diagnosticBtn}
          onPress={() => navigation.navigate('SelectCrop', { mode: 'diagnostic' })}
        >
          <Text style={styles.diagnosticBtnText}>Lancer un diagnostic rapide</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.listTitle}>Mes parcelles enregistrées ({plantations.length})</Text>

      <FlatList 
        data={plantations} 
        keyExtractor={i => i.id} 
        renderItem={({item}) => (
          <TouchableOpacity 
            style={styles.card}
            onPress={() => navigation.navigate('CropDetail', { plantation: item })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cropTitle}>{item.crops?.name}</Text>
              <TouchableOpacity 
                 style={styles.miniDiagBtn}
                 onPress={() => navigation.navigate('SelectSymptoms', { cropId: item.crop_id, plantationId: item.id })}
              >
                <Text style={styles.miniDiagText}>Diagnostiquer</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.locationText}>📍 {item.location_name || 'Position enregistrée'}</Text>
          </TouchableOpacity>
        )} 
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('SelectCrop', { mode: 'register' })}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* MODAL D'AJOUT (Inchangé mais plus fluide grâce au useEffect GPS) */}
      <Modal visible={isModalVisible} animationType="slide">
         <ScrollView style={styles.modalBody}>
            <Text style={styles.modalTitle}>Nouvelle Plantation</Text>
            {!locationPermission && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>⚠️ Le GPS est désactivé. La parcelle ne sera pas cartographiée.</Text>
              </View>
            )}
            {/* ... Reste des inputs TextInput ... */}
            <TouchableOpacity onPress={handleSave} style={styles.btnSave} disabled={loading}>
              <Text style={{color: '#fff'}}>{loading ? 'Enregistrement...' : 'Confirmer'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={{marginTop: 20, alignItems: 'center'}}>
              <Text style={{color: '#666'}}>Annuler</Text>
            </TouchableOpacity>
         </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5', padding: 10 },
  quickActionBox: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 20, elevation: 3, borderLeftWidth: 5, borderLeftColor: '#ff9800' },
  quickActionTitle: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 10 },
  diagnosticBtn: { backgroundColor: '#ff9800', padding: 12, borderRadius: 8, alignItems: 'center' },
  diagnosticBtnText: { color: '#fff', fontWeight: 'bold' },
  listTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#2e7d32' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cropTitle: { fontSize: 18, fontWeight: 'bold' },
  miniDiagBtn: { backgroundColor: '#e8f5e9', padding: 6, borderRadius: 6 },
  miniDiagText: { color: '#2e7d32', fontSize: 12, fontWeight: 'bold' },
  locationText: { color: '#888', fontSize: 12, marginTop: 5 },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#2e7d32', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { color: '#fff', fontSize: 30 },
  warningBox: { backgroundColor: '#fff3e0', padding: 10, borderRadius: 8, marginBottom: 15 },
  warningText: { color: '#e65100', fontSize: 12 },
  modalBody: { padding: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#2e7d32', marginBottom: 20 },
  btnSave: { backgroundColor: '#2e7d32', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 }
});
