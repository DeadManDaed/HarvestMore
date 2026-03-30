// mobile/screens/SelectCropScreen.jsx

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function SelectCropScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Listes de données
  const [userCrops, setUserCrops] = useState([]);      // Cultures du profil
  const [allCrops, setAllCrops] = useState([]);        // Toutes les cultures (Backup)
  const [filteredCrops, setFilteredCrops] = useState([]); // Pour la recherche
  
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Charger TOUTES les cultures pour la recherche/sélection "Autre"
      const { data: allData, error: allErr } = await supabase
        .from('crops')
        .select('*')
        .order('name');
      
      if (allErr) throw allErr;
      setAllCrops(allData || []);

      // 2. Charger les cultures spécifiques à l'utilisateur (via la table de liaison user_crops)
      const { data: userData, error: userErr } = await supabase
        .from('user_crops')
        .select(`
          crop_id,
          crops (*)
        `)
        .eq('user_id', user.id);

      if (userErr) throw userErr;

      // On "aplatit" le résultat pour avoir une liste simple d'objets crops
      const flattenedUserCrops = userData?.map(item => item.crops).filter(Boolean) || [];
      setUserCrops(flattenedUserCrops);
      
    } catch (error) {
      console.error(error);
      Alert.alert("Erreur de chargement", "Impossible de récupérer les cultures.");
    } finally {
      setLoading(false);
    }
  };

  // Filtrage local (pas de requête réseau ici, c'est instantané)
  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredCrops([]);
    } else {
      const filtered = allCrops.filter(crop => 
        crop.name.toLowerCase().includes(text.toLowerCase()) ||
        (crop.scientific_name && crop.scientific_name.toLowerCase().includes(text.toLowerCase()))
      );
      setFilteredCrops(filtered);
    }
  };

  const handleCropSelect = (crop) => {
    navigation.navigate('SelectSymptoms', { 
      cropId: crop.id, 
      cropName: crop.name 
    });
  };

  const renderCropItem = ({ item }) => (
    <TouchableOpacity style={styles.cropCard} onPress={() => handleCropSelect(item)}>
      <View>
        <Text style={styles.cropName}>{item.name}</Text>
        {item.scientific_name && (
          <Text style={styles.scientificName}>{item.scientific_name}</Text>
        )}
      </View>
      <Text style={styles.selectArrow}>→</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={styles.loadingText}>Initialisation de votre catalogue...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.mainTitle}>Quel diagnostic aujourd'hui ?</Text>

      {/* Barre de Recherche */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une culture (ex: Maïs, Café...)"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      <FlatList
        data={searchQuery.length > 0 ? filteredCrops : userCrops}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCropItem}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>
            {searchQuery.length > 0 ? "Résultats de recherche" : "Mes cultures habituelles"}
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery.length > 0 
                ? "Aucune culture ne correspond à votre recherche." 
                : "Aucune culture enregistrée dans votre profil."}
            </Text>
            {searchQuery.length === 0 && (
              <TouchableOpacity 
                style={styles.addCropsButton}
                onPress={() => navigation.navigate('Profile')}
              >
                <Text style={styles.addCropsButtonText}>Gérer mes cultures dans mon profil</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mainTitle: { fontSize: 22, fontWeight: 'bold', paddingHorizontal: 20, marginBottom: 15, color: '#1b5e20' },
  searchContainer: { paddingHorizontal: 20, marginBottom: 20 },
  searchInput: { 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#e0e0e0',
    fontSize: 16,
    elevation: 2
  },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#666', textTransform: 'uppercase', marginBottom: 10, paddingHorizontal: 20 },
  listContent: { paddingBottom: 30 },
  cropCard: { 
    backgroundColor: '#fff', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: 18, 
    marginHorizontal: 20,
    borderRadius: 12, 
    marginBottom: 10,
    elevation: 1,
    borderLeftWidth: 4,
    borderLeftColor: '#2e7d32'
  },
  cropName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  scientificName: { fontSize: 13, fontStyle: 'italic', color: '#777', marginTop: 2 },
  selectArrow: { fontSize: 20, color: '#2e7d32', fontWeight: 'bold' },
  loadingText: { marginTop: 10, color: '#2e7d32' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { textAlign: 'center', color: '#999', marginBottom: 20 },
  addCropsButton: { backgroundColor: '#e8f5e9', padding: 12, borderRadius: 8 },
  addCropsButtonText: { color: '#2e7d32', fontWeight: '600' }
});
