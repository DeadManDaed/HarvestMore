// mobile/screens/SelectCropScreen.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';

export default function SelectCropScreen({ navigation }) {
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

  const renderCrop = ({ item }) => (
    <TouchableOpacity 
      style={styles.cropItem}
      onPress={() => navigation.navigate('MyCrops', { 
        selectedCropId: item.id, 
        selectedCropName: item.name 
      })}
    >
      <View style={styles.cropIcon}>
        <Text style={styles.cropEmoji}>{item.category === 'Céréale' ? '🌾' : '🥦'}</Text>
      </View>
      <View>
        <Text style={styles.cropName}>{item.name}</Text>
        <Text style={styles.cropType}>{item.type || item.category}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator color="#2e7d32" /></View>;

  return (
    <View style={styles.container}>
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchBar: { margin: 15, padding: 12, backgroundColor: '#f0f0f0', borderRadius: 10 },
  cropItem: { flexDirection: 'row', padding: 15, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  cropIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#e8f5e9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cropEmoji: { fontSize: 24 },
  cropName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  cropType: { fontSize: 12, color: '#666' }
});
