// mobile/screens/ProgramSuggestionsScreen.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import BackHeader from '../components/BackHeader';

export default function ProgramSuggestionsScreen({ route, navigation }) {
  const { plantationId, cropId, cropName, budget, zaeId, seasonId } = route.params;
  const { user } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('suggest-programs', {
      body: { crop_id: cropId, zae_id: zaeId, budget, season_id: seasonId }
    });
    if (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de charger les suggestions');
    } else {
      setPrograms(data.programs || []);
    }
    setLoading(false);
  };

  const selectProgram = async (program) => {
    // Demander à l'utilisateur la date de début
    Alert.prompt(
      'Date de début',
      'Quand souhaitez-vous commencer ce programme ? (JJ/MM/AAAA)',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Démarrer',
          onPress: async (dateStr) => {
            // Validation simple de la date
            const parts = dateStr.split('/');
            if (parts.length !== 3) {
              Alert.alert('Format invalide', 'Utilisez JJ/MM/AAAA');
              return;
            }
            const startDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            if (isNaN(startDate.getTime())) {
              Alert.alert('Date invalide', 'Veuillez entrer une date valide');
              return;
            }
            setGenerating(true);
            // 1. Créer user_program
            const { data: userProg, error: progError } = await supabase
              .from('user_programs')
              .insert({
                plantation_id: plantationId,
                program_id: program.id,
                start_date: startDate.toISOString().split('T')[0],
                status: 'pending'
              })
              .select()
              .single();
            if (progError) {
              Alert.alert('Erreur', 'Impossible de créer le programme');
              setGenerating(false);
              return;
            }
            // 2. Générer les événements
            const { error: genError } = await supabase.functions.invoke('generate-program-events', {
              body: { user_program_id: userProg.id }
            });
            if (genError) {
              Alert.alert('Erreur', 'Le programme a été créé mais les événements n\'ont pas pu être générés');
            } else {
              Alert.alert('Succès', 'Votre programme a été créé ! Rendez-vous dans l\'agenda pour voir les étapes.');
            }
            setGenerating(false);
            navigation.navigate('MyCrops'); // retour à la liste des parcelles
          }
        }
      ]
    );
  };

  const renderProgram = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => selectProgram(item)}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.duration}>Durée : {item.duration_days} jours</Text>
      <Text style={styles.budget}>
        Budget estimé : {item.min_budget_estimate?.toLocaleString()} - {item.max_budget_estimate?.toLocaleString()} FCFA
      </Text>
      {item.description && <Text style={styles.description}>{item.description}</Text>}
      <TouchableOpacity style={styles.selectButton} onPress={() => selectProgram(item)}>
        <Text style={styles.selectButtonText}>Démarrer ce programme</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BackHeader title="Programmes suggérés" />
      <Text style={styles.subtitle}>Pour {cropName}</Text>
      {programs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucun programme disponible pour cette culture.</Text>
          <Text style={styles.emptySubtext}>Vous pouvez suivre un accompagnement personnalisé avec un technicien.</Text>
        </View>
      ) : (
        <FlatList
          data={programs}
          renderItem={renderProgram}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
      {generating && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.overlayText}>Création du programme...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  subtitle: { fontSize: 16, color: '#2e7d32', textAlign: 'center', marginVertical: 10 },
  list: { padding: 15 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2
  },
  name: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32', marginBottom: 5 },
  duration: { fontSize: 14, color: '#666', marginBottom: 3 },
  budget: { fontSize: 14, color: '#ff9800', marginBottom: 5 },
  description: { fontSize: 13, color: '#555', marginBottom: 10 },
  selectButton: { backgroundColor: '#2e7d32', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  selectButtonText: { color: '#fff', fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 8 },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  overlayText: { color: '#fff', marginTop: 10, fontSize: 16 }
});