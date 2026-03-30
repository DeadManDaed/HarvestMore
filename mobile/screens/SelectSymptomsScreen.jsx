// mobile/screens/SelectSymptomsScreen.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Button, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import BackHeader from '../components/BackHeader';

export default function SelectSymptomsScreen({ route, navigation }) {
  const { cropId, cropName, plantationId } = route.params;
  const [symptoms, setSymptoms] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSymptoms();
  }, []);

  const fetchSymptoms = async () => {
    setLoading(true);
    // Récupérer tous les symptômes (ou filtrer par crop_id si vous avez une colonne crop_id)
    const { data, error } = await supabase
      .from('symptoms')
      .select('*')
      .order('severity', { ascending: false });

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

  const getSeverityLabel = (severity) => {
    switch(severity) {
      case 1: return '⚠️ Faible';
      case 2: return '⚠️⚠️ Moyen';
      case 3: return '⚠️⚠️⚠️ Grave';
      default: return '⚠️ Non spécifié';
    }
  };

  const handleSubmit = async () => {
    if (selectedSymptoms.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un symptôme.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // Vérifier si un des symptômes nécessite un technicien
      const symptomsData = symptoms.filter(s => selectedSymptoms.includes(s.id));
      const requiresTechnician = symptomsData.some(s => s.requires_technician === true);

      // Préparer les données d'insertion
      const diagnosisData = {
        user_id: user.id,
        crop_id: cropId,
        symptom_ids: selectedSymptoms,
        status: requiresTechnician ? 'pending' : 'auto_resolved'
      };

      // Ajouter plantationId si présent
      if (plantationId) {
        diagnosisData.plantation_id = plantationId;
      }

      const { data: diagnosis, error: diagError } = await supabase
        .from('diagnosis_requests')
        .insert(diagnosisData)
        .select()
        .single();

      if (diagError) throw diagError;

      if (requiresTechnician) {
        Alert.alert(
          'Demande envoyée à un technicien',
          'Un technicien va analyser votre demande et vous répondra dans la messagerie.',
          [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
        );
      } else {
        // Navigation vers les résultats automatiques
        navigation.navigate('DiagnosticResult', {
          selectedSymptomIds: selectedSymptoms,
          cropId: cropId,
          cropName: cropName,
          plantationId: plantationId
        });
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de soumettre le diagnostic.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderSymptomItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.symptomItem, selectedSymptoms.includes(item.id) && styles.symptomItemSelected]}
      onPress={() => toggleSymptom(item.id)}
    >
      <View style={styles.symptomHeader}>
        <Text style={styles.symptomName}>{item.name}</Text>
        <Text style={styles.severityBadge}>{getSeverityLabel(item.severity)}</Text>
      </View>
      <Text style={styles.symptomDesc}>{item.description}</Text>
      
      {item.possible_causes && item.possible_causes.length > 0 && (
        <View style={styles.detailSection}>
          <Text style={styles.detailTitle}>🔍 Causes possibles :</Text>
          {item.possible_causes.map((cause, idx) => (
            <Text key={idx} style={styles.detailText}>• {cause}</Text>
          ))}
        </View>
      )}
      
      {item.preventive_measures && item.preventive_measures.length > 0 && (
        <View style={styles.detailSection}>
          <Text style={styles.detailTitle}>🛡️ Mesures préventives :</Text>
          {item.preventive_measures.map((measure, idx) => (
            <Text key={idx} style={styles.detailText}>• {measure}</Text>
          ))}
        </View>
      )}
      
      {item.requires_technician && (
        <Text style={styles.technicianNote}>👨‍🌾 Ce symptôme nécessite l’avis d’un technicien</Text>
      )}
      
      {selectedSymptoms.includes(item.id) && (
        <Text style={styles.selectedIcon}>✓</Text>
      )}
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
      <BackHeader title={`Symptômes - ${cropName}`} />
      <View style={styles.content}>
        <Text style={styles.subtitle}>Sélectionnez les symptômes observés :</Text>
        
        <FlatList
          data={symptoms}
          renderItem={renderSymptomItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
        
        <View style={styles.buttonContainer}>
          <Button
            title={submitting ? 'Envoi...' : `Valider (${selectedSymptoms.length} symptôme(s))`}
            onPress={handleSubmit}
            disabled={submitting || selectedSymptoms.length === 0}
            color="#2e7d32"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  subtitle: { fontSize: 14, color: '#666', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 5 },
  list: { padding: 15, paddingTop: 5 },
  symptomItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  symptomItemSelected: {
    borderColor: '#2e7d32',
    backgroundColor: '#f1f8e9',
  },
  symptomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  symptomName: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  severityBadge: { fontSize: 12, color: '#ff9800', fontWeight: '500' },
  symptomDesc: { fontSize: 13, color: '#555', marginBottom: 10 },
  detailSection: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  detailTitle: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  detailText: { fontSize: 11, color: '#666', marginLeft: 8, marginBottom: 2 },
  technicianNote: { fontSize: 11, color: '#ff9800', marginTop: 8, fontStyle: 'italic' },
  selectedIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
    fontSize: 18,
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  buttonContainer: { padding: 15, paddingBottom: 30 }
});