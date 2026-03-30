// mobile/screens/MyCropsScreen.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function MyCropsScreen({ route, navigation }) {
  const { user } = useAuth();
  const { mode } = route.params || { mode: 'management' };
  
  const [plantations, setPlantations] = useState([]);

const [isModalVisible, setModalVisible] = useState(false);
const [formData, setFormData] = useState({
  crop_id: null,
  crop_name: '',
  area_size: '',
  plant_count: '',
  planting_date: '',
  location_name: '',
  estimated_yield: '',
  latitude: null,
  longitude: null,
  interventions: []
});

const getCurrentLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission refusée', 'Activez la localisation pour géolocaliser votre champ.');
    return;
  }

  const location = await Location.getCurrentPositionAsync({});
  const address = await Location.reverseGeocodeAsync(location.coords);
  const locationName = address[0]?.name || address[0]?.street || 
    `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`;

  setFormData(prev => ({
    ...prev,
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    location_name: locationName
  }));
};

const savePlantation = async () => {
  if (!formData.crop_id) {
    Alert.alert('Erreur', 'Veuillez sélectionner une culture');
    return;
  }

  setLoading(true);
  const { error } = await supabase
    .from('user_plantations')
    .insert({
      user_id: user.id,
      crop_id: formData.crop_id,
      area_size: parseFloat(formData.area_size) || null,
      plant_count: parseInt(formData.plant_count) || null,
      planting_date: formData.planting_date || null,
      location_name: formData.location_name || null,
      latitude: formData.latitude || null,
      longitude: formData.longitude || null,
      estimated_yield: parseFloat(formData.estimated_yield) || null,
      interventions: [],
      status: 'active'
    });

  if (error) {
    Alert.alert('Erreur', error.message);
  } else {
    Alert.alert('Succès', 'Plantation ajoutée');
    setModalVisible(false);
    setFormData({
      crop_id: null, crop_name: '', area_size: '', plant_count: '',
      planting_date: '', location_name: '', estimated_yield: '',
      latitude: null, longitude: null, interventions: []
    });
    fetchPlantations();
  }
  setLoading(false);
};

  useEffect(() => {
    fetchPlantations();
  }, []);

  // CORRECTION : On surveille route.params, mais on vide les params après utilisation
  useEffect(() => {
    if (route.params?.selectedCropId) {
      setFormData(prev => ({ 
        ...prev, 
        crop_id: route.params.selectedCropId,
        crop_name: route.params.selectedCropName 
      }));
      setModalVisible(true);

      // IMPORTANT : Nettoyer les paramètres de navigation pour éviter la boucle
      navigation.setParams({ selectedCropId: null, selectedCropName: null });
    }
  }, [route.params?.selectedCropId]);
  const fetchPlantations = async () => {
    const { data, error } = await supabase
      .from('user_plantations')
      .select('*, crops(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error) setPlantations(data);
  };

  // Titre dynamique selon l'origine
  const screenTitle = mode === 'selection_diagnostic' 
    ? "Quelle plantation diagnostiquer ?" 
    : "Mes Plantations";

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.card, mode === 'selection_diagnostic' && styles.cardHighlight]}
      onPress={() => {
        if (mode === 'selection_diagnostic') {
          // Cas A : On part au diagnostic avec les infos de la parcelle
          navigation.navigate('SelectSymptoms', { 
            cropId: item.crop_id, 
            plantationId: item.id 
          });
        } else {
          // Cas B : Consultation classique
          navigation.navigate('CropDetail', { plantation: item });
        }
      }}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cropTitle}>{item.crops?.name}</Text>
        {mode === 'selection_diagnostic' && (
          <View style={styles.selectBadge}><Text style={styles.selectBadgeText}>SÉLECTIONNER</Text></View>
        )}
      </View>
      <Text style={styles.locationText}>📍 {item.location_name || 'Champ non nommé'}</Text>
      <Text style={styles.detailsText}>{item.area_size} Ha • {item.plant_count} plants</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>{screenTitle}</Text>

      {/* Si on vient du Diagnostic, on permet de sauter cette étape pour un diagnostic libre */}
      {mode === 'selection_diagnostic' && (
        <TouchableOpacity 
          style={styles.freeDiagBtn}
          onPress={() => navigation.navigate('SelectCrop', { mode: 'diagnostic' })}
        >
          <Text style={styles.freeDiagText}>Faire un diagnostic pour une autre culture</Text>
        </TouchableOpacity>
      )}

      {plantations.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Vous n'avez pas encore de plantation enregistrée.</Text>
          {mode === 'selection_diagnostic' && (
            <TouchableOpacity 
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('SelectCrop', { mode: 'diagnostic' })}
            >
              <Text style={styles.primaryBtnText}>Choisir une culture dans le catalogue</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList 
          data={plantations} 
          keyExtractor={i => i.id} 
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {/* Le bouton + sert toujours à ajouter une plantation réelle */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('SelectCrop', { mode: 'register' })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa', padding: 15 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1b5e20', marginBottom: 15 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 12, elevation: 2 },
  cardHighlight: { borderColor: '#2e7d32', borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cropTitle: { fontSize: 18, fontWeight: 'bold' },
  selectBadge: { backgroundColor: '#2e7d32', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  selectBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  locationText: { color: '#666', fontSize: 13, marginTop: 5 },
  detailsText: { color: '#999', fontSize: 12, marginTop: 2 },
  freeDiagBtn: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: '#2e7d32', alignItems: 'center' },
  freeDiagText: { color: '#2e7d32', fontWeight: 'bold' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { textAlign: 'center', color: '#666', marginBottom: 20 },
  primaryBtn: { backgroundColor: '#2e7d32', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#2e7d32', width: 65, height: 65, borderRadius: 33, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { color: '#fff', fontSize: 35 }
});
