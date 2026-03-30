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

  const loadCultures = async (zone) => {
    setLoading(true);
    // 1. On utilise .contains car la colonne 'zone' est un ARRAY dans ta base
    // 2. On filtre par le nom de la zone (ou l'id si ton array contient des IDs)
     /**
      *  * Correction logique : 
       * 1. Ta colonne s'appelle 'zone' (et non 'zone_id').
        * 2. C'est un ARRAY qui contient l'ID sous forme de chaîne (ex: ["1"]).
         * 3. On utilise .contains() pour chercher l'ID converti en string dans ce tableau.
          */
          const { data, error } = await supabase
            .from('crops')
              .select('*')
                .contains('zone', [zoneId.toString()]); 

                if (error) {
                  console.error(error);
                    Alert.alert("Erreur Supabase", error.message); 
                    } else {
                      if (data && data.length === 0) {
                          Alert.alert("Info", "Aucune culture n'est liée à cet ID de zone dans la table 'crops'.");
                            }
                              setCultures(data || []);
                              }
                              setLoading(false);
      */
  };

  const handleZoneSelect = (zone) => {
    setSelectedZone(zone);
    loadCultures(zone); // On passe l'objet zone complet
  };

  const handleCropSelect = (crop) => {
    // Attention : Dans ta base c'est 'name', pas 'nom'
    navigation.navigate('SelectSymptoms', { cropId: crop.id, cropName: crop.name });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Zone agro-écologique</Text>
        <View style={{ height: 70 }}>
    <FlatList
      horizontal
      data={zones}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.zoneCard, selectedZone?.id === item.id && styles.zoneSelected]}
          onPress={() => handleZoneSelect(item)}
        >
          <Text style={[styles.zoneLabel, selectedZone?.id === item.id && { color: '#fff' }]}>
            {item.nom}
          </Text>
        </TouchableOpacity>
      )}
      contentContainerStyle={styles.zoneList}
      showsHorizontalScrollIndicator={false}
    />
  </View>

  {selectedZone && (
    <>
      <Text style={styles.subtitle}>Cultures disponibles (Zone {selectedZone.id})</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#2e7d32" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={cultures}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.cropCard} onPress={() => handleCropSelect(item)}>
              {/* Correction : On utilise 'name' car c'est le nom de la colonne SQL */}
              <Text style={styles.cropName}>{item.name}</Text>
              {item.scientific_name && (
                <Text style={styles.scientificName}>{item.scientific_name}</Text>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucune donnée trouvée.</Text>}
        />
      )}
    </>
  )}
</View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5', paddingTop: 50 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  zoneList: { paddingVertical: 5 },
  zoneCard: { backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#ccc', height: 45, justifyContent: 'center' },
  zoneSelected: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  zoneLabel: { fontSize: 14, color: '#333', fontWeight: '500' },
  subtitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 15, color: '#2e7d32' },
  cropCard: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 2 },
  cropName: { fontSize: 16, fontWeight: 'bold' },
  scientificName: { fontSize: 12, fontStyle: 'italic', color: '#666' }
});
