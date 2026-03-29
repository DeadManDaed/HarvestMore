// mobile/screens/SelectCropScreen.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../lib/supabase';

export default function SelectCropScreen({ navigation }) {
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [cultures, setCultures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    const { data, error } = await supabase.from('zones').select('*');
    if (error) {
      console.error(error);
      Alert.alert("Erreur Zones", error.message);
    } else {
      setZones(data);
    }
    setLoading(false);
  };

  const loadCultures = async (zoneId) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('crops')
      .select('*')
      .eq('zone_id', zoneId);
      
    if (error) {
      console.error(error);
      // On affiche l'erreur SQL directement sur le téléphone
      Alert.alert("Erreur Supabase", error.message); 
    } else {
      // Si la requête réussit mais qu'il n'y a rien, on s'en rendra compte
      if (data.length === 0) {
        Alert.alert("Info", "Aucune culture trouvée pour cette zone dans la base de données.");
      }
      setCultures(data);
    }
    setLoading(false);
  };

  const handleZoneSelect = (zone) => {
    setSelectedZone(zone);
    loadCultures(zone.id);
  };

  const handleCropSelect = (crop) => {
    navigation.navigate('SelectSymptoms', { cropId: crop.id, cropName: crop.nom });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Zone agro-écologique</Text>
      <FlatList
        horizontal
        data={zones}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.zoneCard, selectedZone?.id === item.id && styles.zoneSelected]}
            onPress={() => handleZoneSelect(item)}
          >
            <Text style={styles.zoneLabel}>{item.nom}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.zoneList}
        showsHorizontalScrollIndicator={false}
      />

      {selectedZone && (
        <>
          <Text style={styles.subtitle}>Cultures recommandées pour {selectedZone.nom}</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#2e7d32" style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={cultures}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.cropCard} onPress={() => handleCropSelect(item)}>
                  <Text style={styles.cropName}>{item.nom}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  zoneList: { paddingVertical: 10, maxHeight: 60 },
  zoneCard: { backgroundColor: '#fff', padding: 10, borderRadius: 8, marginRight: 10, borderWidth: 1, borderColor: '#ccc', justifyContent: 'center' },
  zoneSelected: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  zoneLabel: { fontSize: 14, color: '#333' },
  subtitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 15 },
  cropCard: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 2 },
  cropName: { fontSize: 16, fontWeight: 'bold' },
});
