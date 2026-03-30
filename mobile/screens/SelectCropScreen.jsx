// mobile/screens/SelectCropScreen.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import BackHeader from '../components/BackHeader';

export default function SelectCropScreen({ route, navigation }) {
  const { mode } = route.params || { mode: 'register' };
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCrops();
  }, []);

  const fetchCrops = async () => {
    const { data, error } = await supabase
      .from('crops')
      .select('*')
      .order('name', { ascending: true });

    if (error) console.error(error);
    else setCrops(data);
    setLoading(false);
  };

  const filteredCrops = crops.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCropSelect = (crop) => {
    if (mode === 'diagnostic') {
      // Diagnostic rapide : aller directement aux symptômes
      navigation.navigate('SelectSymptoms', { cropId: crop.id, cropName: crop.name });
    } else {
      // Enregistrement de parcelle : revenir à MyCrops avec la culture sélectionnée
      navigation.navigate('MyCrops', { 
        selectedCropId: crop.id, 
        selectedCropName: crop.name 
      });
    }
  };

  const renderCrop = ({ item }) => (
    <TouchableOpacity 
      style={styles.cropItem}
      onPress={() => handleCropSelect(item)}
    >
      <View style={styles.cropIcon}>
        <Text style={styles.cropEmoji}>
          {item.category === 'Céréale' ? '🌾' : item.category === 'Légume' ? '🥬' : '🌿'}
        </Text>
      </View>
      <View style={styles.cropInfo}>
        <Text style={styles.cropName}>{item.name}</Text>
        <Text style={styles.cropType}>{item.type || item.category || 'Culture'}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BackHeader title="Choisir une culture" />
      <View style={styles.content}>
        <Text style={styles.subtitle}>
          {mode === 'diagnostic' 
            ? 'Sélectionnez la culture à diagnostiquer' 
            : 'Sélectionnez la culture à planter'}
        </Text>
        <TextInput
          style={styles.searchBar}
          placeholder="Rechercher une culture..."
          value={search}
          onChangeText={setSearch}
        />
        <FlatList
          data={filteredCrops}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCrop}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: 16 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 12, textAlign: 'center' },
  searchBar: { 
    backgroundColor: '#f0f0f0', 
    borderRadius: 25, 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 14
  },
  list: { paddingBottom: 20 },
  cropItem: { 
    flexDirection: 'row', 
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center', 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee' 
  },
  cropIcon: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#e8f5e9', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15 
  },
  cropEmoji: { fontSize: 24 },
  cropInfo: { flex: 1 },
  cropName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  cropType: { fontSize: 12, color: '#666', marginTop: 2 }
});