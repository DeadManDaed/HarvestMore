// mobile/screens/SelectSymptomsScreen.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Button, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';

export default function SelectSymptomsScreen({ route, navigation }) {
  const { cropId, cropName } = route.params;
  const [symptoms, setSymptoms] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSymptoms();
  }, []);

  const fetchSymptoms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('symptoms')
      .select('*');
      // Note : nous chargeons tous les symptômes, mais vous pouvez filtrer par cropId
      // si votre table symptoms a une colonne crop_id
    if (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de charger les symptômes');
    } else {
      setSymptoms(data || []);
    }
    setLoading(false);
  };

  const toggleSymptom = (symptomId) => {
    if (selectedSymptoms.includes(symptomId)) {
      setSelectedSymptoms(selectedSymptoms.filter(id => id !== symptomId));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptomId]);
    }
  };

  const handleSubmit = async () => {
    if (selectedSymptoms.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un symptôme.');
      return;
    }

    setSubmitting(true);
    try {
      // Récupérer l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // Créer la demande de diagnostic
      const { data: diagnosis, error: diagError } = await supabase
        .from('diagnosis_requests')
        .insert({
          user_id: user.id,
          crop_id: cropId,
          symptom_ids: selectedSymptoms,
          status: 'pending',
        })
        .select()
        .single();

      if (diagError) throw diagError;

      Alert.alert(
        'Demande envoyée',
        'Un technicien va analyser votre demande et vous répondra dans la messagerie.',
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de soumettre le diagnostic.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Symptômes observés sur {cropName}</Text>
      <FlatList
        data={symptoms}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.symptomItem}
            onPress={() => toggleSymptom(item.id)}
          >
            <Text style={styles.symptomName}>{item.name}</Text>
            <Text style={styles.symptomDesc}>{item.description}</Text>
            {selectedSymptoms.includes(item.id) && (
              <Text style={styles.selected}>✓</Text>
            )}
          </TouchableOpacity>
        )}
      />
      <Button
        title={submitting ? 'Envoi...' : 'Valider le diagnostic'}
        onPress={handleSubmit}
        disabled={submitting}
        color="#2e7d32"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#2e7d32' },
  symptomItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    position: 'relative',
  },
  symptomName: { fontSize: 16, fontWeight: 'bold' },
  symptomDesc: { fontSize: 12, color: '#555', marginTop: 5 },
  selected: {
    position: 'absolute',
    right: 15,
    top: 15,
    fontSize: 18,
    color: '#2e7d32',
    fontWeight: 'bold',
  },
});