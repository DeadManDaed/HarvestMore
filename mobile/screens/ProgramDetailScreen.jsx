// mobile/screens/ProgramDetailScreen.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import BackHeader from '../components/BackHeader';

export default function ProgramDetailScreen({ route, navigation }) {
  const { programId, plantationId, cropName } = route.params;
  const [program, setProgram] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgram();
  }, []);

  const fetchProgram = async () => {
    const { data: prog, error: progError } = await supabase
      .from('crop_programs')
      .select('*')
      .eq('id', programId)
      .single();
    if (progError) console.error(progError);
    else setProgram(prog);

    const { data: stepsData, error: stepsError } = await supabase
      .from('program_steps')
      .select('*')
      .eq('program_id', programId)
      .order('step_order', { ascending: true });
    if (stepsError) console.error(stepsError);
    else setSteps(stepsData);

    setLoading(false);
  };

  const startProgram = async () => {
    // Demander la date de début
    Alert.prompt('Date de début', 'JJ/MM/AAAA', async (dateStr) => {
      if (!dateStr) return;
      const parts = dateStr.split('/');
      const startDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      if (isNaN(startDate.getTime())) {
        Alert.alert('Date invalide');
        return;
      }
      const { data: userProg, error: progError } = await supabase
        .from('user_programs')
        .insert({
          plantation_id: plantationId,
          program_id: programId,
          start_date: startDate.toISOString().split('T')[0],
          status: 'pending'
        })
        .select()
        .single();
      if (progError) {
        Alert.alert('Erreur', progError.message);
        return;
      }
      const { error: genError } = await supabase.functions.invoke('generate-program-events', {
        body: { user_program_id: userProg.id }
      });
      if (genError) Alert.alert('Erreur', 'Programme créé mais les événements n\'ont pas pu être générés');
      else Alert.alert('Succès', 'Programme démarré !');
      navigation.navigate('MyCrops');
    });
  };

  if (loading) return <ActivityIndicator size="large" color="#2e7d32" style={{ marginTop: 50 }} />;
  if (!program) return <Text>Programme introuvable</Text>;

  return (
    <View style={styles.container}>
      <BackHeader title="Détail du programme" />
      <View style={styles.content}>
        <Text style={styles.name}>{program.name}</Text>
        <Text style={styles.duration}>Durée : {program.duration_days} jours</Text>
        <Text style={styles.budget}>Budget : {program.min_budget_estimate} - {program.max_budget_estimate} FCFA</Text>
        <Text style={styles.description}>{program.description}</Text>
        <Text style={styles.stepsTitle}>Étapes du programme :</Text>
        <FlatList
          data={steps}
          renderItem={({ item }) => (
            <View style={styles.stepItem}>
              <Text style={styles.stepOrder}>Étape {item.step_order}</Text>
              <Text style={styles.stepTitle}>{item.title}</Text>
              <Text style={styles.stepDesc}>{item.description}</Text>
              <Text style={styles.stepDay}>Jour {item.typical_day_offset} (durée {item.duration_days} jours)</Text>
            </View>
          )}
          keyExtractor={item => item.id}
        />
        <TouchableOpacity style={styles.startButton} onPress={startProgram}>
          <Text style={styles.startButtonText}>Démarrer ce programme</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 15 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#2e7d32', marginBottom: 5 },
  duration: { fontSize: 14, color: '#666', marginBottom: 3 },
  budget: { fontSize: 14, color: '#ff9800', marginBottom: 10 },
  description: { fontSize: 14, color: '#555', marginBottom: 15 },
  stepsTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 10, marginBottom: 10 },
  stepItem: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 8, elevation: 1 },
  stepOrder: { fontSize: 12, color: '#2e7d32', fontWeight: 'bold' },
  stepTitle: { fontSize: 16, fontWeight: 'bold', marginVertical: 4 },
  stepDesc: { fontSize: 13, color: '#555' },
  stepDay: { fontSize: 12, color: '#999', marginTop: 4 },
  startButton: { backgroundColor: '#2e7d32', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  startButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});