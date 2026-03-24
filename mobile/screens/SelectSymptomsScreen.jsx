//mobile/screens/SelectSymptomsScreen.jsx

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

  useEffect(() => {
  const fetchSymptoms = async () => {
    const { data, error } = await supabase
      .from('symptomes')
      .select(`
        id,
        code,
        description,
        poids,
        pathologie:pathologies!inner (
          id,
          nom,
          type,
          conseil,
          produit_cafcoop_nom,
          produit_cafcoop_slug,
          culture_id
        )
      `)
      .eq('pathologie.culture_id', cropId);
    if (error) console.error(error);
    else setSymptoms(data);
    setLoading(false);
  };
  fetchSymptoms();
}, []);

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
      // 1. Récupérer les recommandations pour chaque symptôme
      const { data: recommendations, error: recError } = await supabase
        .from('recommendations')
        .select('*, products(*)')
        .in('symptom_id', selectedSymptoms)
        .eq('crop_id', cropId);

      if (recError) throw recError;

      // 2. Analyser si une réponse automatique est possible
      let autoResponse = null;
      let requiresTechnician = false;
      let recommendedProducts = [];

      for (const rec of recommendations) {
        if (rec.automatic_response) {
          autoResponse = rec.response_text;
          recommendedProducts = [...recommendedProducts, ...(rec.product_ids || [])];
        }
        if (rec.requires_technician) requiresTechnician = true;
      }

      // 3. Si réponse automatique trouvée, on l'affiche et on propose d'ajouter au panier
      if (autoResponse && !requiresTechnician) {
        Alert.alert('Diagnostic automatique', autoResponse, [
          { text: 'Ajouter les produits au panier', onPress: () => addToCart(recommendedProducts) },
          { text: 'Terminer', style: 'cancel' }
        ]);
        navigation.goBack(); // ou naviguer vers l'accueil
      } else {
        // Créer une demande de diagnostic pour technicien
        const { data: diagnosis, error: diagError } = await supabase
          .from('diagnosis_requests')
          .insert({
            user_id: (await supabase.auth.getUser()).data.user.id,
            crop_id: cropId,
            symptom_ids: selectedSymptoms,
            status: 'pending',
          })
          .select()
          .single();

        if (diagError) throw diagError;

        Alert.alert('Demande envoyée', 'Un technicien va analyser votre demande et vous répondra dans la messagerie.');
        navigation.navigate('Home');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de soumettre le diagnostic.');
    } finally {
      setSubmitting(false);
    }
  };

  const addToCart = (productIds) => {
    // Logique pour ajouter les produits au panier (à implémenter)
    Alert.alert('Ajout au panier', 'Produits recommandés ajoutés au panier.');
  };

  if (loading) return <ActivityIndicator size="large" color="#2e7d32" />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Symptômes observés sur {cropName}</Text>
      <FlatList
        data={symptoms}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.symptomItem} onPress={() => toggleSymptom(item.id)}>
            <Text style={styles.symptomName}>{item.name}</Text>
            <Text style={styles.symptomDesc}>{item.description}</Text>
            {selectedSymptoms.includes(item.id) && <Text style={styles.selected}>✓</Text>}
          </TouchableOpacity>
        )}
      />
      <Button title={submitting ? 'Envoi...' : 'Valider le diagnostic'} onPress={handleSubmit} disabled={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  symptomItem: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#ddd' },
  symptomName: { fontSize: 16, fontWeight: 'bold' },
  symptomDesc: { fontSize: 12, color: '#555', marginTop: 5 },
  selected: { position: 'absolute', right: 15, top: 15, fontSize: 18, color: 'green' },
});