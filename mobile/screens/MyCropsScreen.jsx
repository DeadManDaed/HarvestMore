//mobile/screens/MyCropsScreen.jsx

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function MyCropsScreen() {
  const { user } = useAuth();
  const [plantations, setPlantations] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [newEntry, setNewEntry] = useState({ area: '', plants: '', tech: '', products: '' });

  useEffect(() => { fetchMyPlantations(); }, []);

  const fetchMyPlantations = async () => {
    const { data, error } = await supabase
      .from('user_plantations')
      .select('*, crops(name)')
      .eq('user_id', user.id);
    if (!error) setPlantations(data);
  };

  const renderPlantation = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.cropName}>{item.crops?.name}</Text>
      <View style={styles.row}>
        <Text style={styles.detail}>📏 {item.area_size} Ha</Text>
        <Text style={styles.detail}>🌱 {item.plant_count} plants</Text>
      </View>
      <Text style={styles.techTitle}>Techniques & Produits :</Text>
      <Text style={styles.techText}>{item.techniques_applied || "Standard"}</Text>
      <Text style={styles.date}>Planté le : {item.planting_date}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={plantations}
        keyExtractor={(item) => item.id}
        renderItem={renderPlantation}
        ListEmptyComponent={<Text style={styles.empty}>Aucune parcelle enregistrée.</Text>}
      />
      
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal d'ajout à implémenter ici avec les champs Superficie, GPS, etc. */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 10 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 12, elevation: 3 },
  cropName: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  detail: { fontSize: 14, color: '#555' },
  techTitle: { fontSize: 12, fontWeight: 'bold', marginTop: 5, color: '#888' },
  techText: { fontSize: 13, color: '#333', fontStyle: 'italic' },
  date: { fontSize: 11, textAlign: 'right', color: '#bbb', marginTop: 10 },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#2e7d32', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { color: '#fff', fontSize: 30 },
  empty: { textAlign: 'center', marginTop: 50, color: '#999' }
});
