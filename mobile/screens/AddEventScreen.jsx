// mobile/screens/AddEventScreen.jsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import BackHeader from '../components/BackHeader';

export default function AddEventScreen({ navigation }) {
  const { user, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('intervention');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 3600000));
  const [location, setLocation] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [participantEmail, setParticipantEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const addParticipant = async () => {
    if (!participantEmail.trim()) return;
    // Rechercher l'utilisateur par email
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('email', participantEmail)
      .maybeSingle();
    if (error || !data) {
      Alert.alert('Erreur', 'Utilisateur non trouvé');
      return;
    }
    if (participants.some(p => p.id === data.id)) {
      Alert.alert('Info', 'Déjà ajouté');
      return;
    }
    setParticipants([...participants, { id: data.id, name: data.full_name, confirmed: false }]);
    setParticipantEmail('');
  };

  const removeParticipant = (id) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Le titre est requis');
      return;
    }
    if (startDate >= endDate) {
      Alert.alert('Erreur', 'La date de fin doit être postérieure à la date de début');
      return;
    }
    setSubmitting(true);
    // Insérer l'événement
    const { data: event, error: eventError } = await supabase
      .from('shared_events')
      .insert({
        title,
        description,
        event_type: eventType,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        location,
        created_by: user.id,
        status: 'scheduled',
      })
      .select()
      .single();
    if (eventError) {
      Alert.alert('Erreur', 'Impossible de créer l\'événement');
      setSubmitting(false);
      return;
    }
    // Ajouter l'organisateur comme participant avec rôle organizer et confirmé
    const participantsData = [
      { event_id: event.id, user_id: user.id, role: 'organizer', confirmed: true },
      ...participants.map(p => ({ event_id: event.id, user_id: p.id, role: 'attendee', confirmed: false }))
    ];
    const { error: partError } = await supabase
      .from('event_participants')
      .insert(participantsData);
    if (partError) {
      console.error('Erreur ajout participants:', partError);
    }
    Alert.alert('Succès', 'Événement créé', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    setSubmitting(false);
  };

  return (
    <View style={styles.container}>
      <BackHeader title="Nouvel événement" />
      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.label}>Titre *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ex: Visite terrain" />

        <Text style={styles.label}>Type</Text>
        <View style={styles.typeContainer}>
          {['intervention', 'visit', 'reminder', 'training'].map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.typeButton, eventType === type && styles.typeButtonActive]}
              onPress={() => setEventType(type)}
            >
              <Text style={[styles.typeText, eventType === type && styles.typeTextActive]}>
                {type === 'intervention' ? 'Intervention' : type === 'visit' ? 'Visite' : type === 'reminder' ? 'Rappel' : 'Formation'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Date et heure de début</Text>
        <TouchableOpacity onPress={() => setShowStartPicker(true)} style={styles.dateButton}>
          <Text>{startDate.toLocaleString()}</Text>
        </TouchableOpacity>
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="datetime"
            display="default"
            onChange={(event, selectedDate) => {
              setShowStartPicker(false);
              if (selectedDate) setStartDate(selectedDate);
            }}
          />
        )}

        <Text style={styles.label}>Date et heure de fin</Text>
        <TouchableOpacity onPress={() => setShowEndPicker(true)} style={styles.dateButton}>
          <Text>{endDate.toLocaleString()}</Text>
        </TouchableOpacity>
        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="datetime"
            display="default"
            onChange={(event, selectedDate) => {
              setShowEndPicker(false);
              if (selectedDate) setEndDate(selectedDate);
            }}
          />
        )}

        <Text style={styles.label}>Lieu (optionnel)</Text>
        <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Adresse, parcelle..." />

        <Text style={styles.label}>Description (optionnel)</Text>
        <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline numberOfLines={4} />

        <Text style={styles.label}>Participants</Text>
        <View style={styles.participantRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 10 }]}
            placeholder="Email du participant"
            value={participantEmail}
            onChangeText={setParticipantEmail}
          />
          <TouchableOpacity style={styles.addButtonSmall} onPress={addParticipant}>
            <Text style={styles.addButtonSmallText}>Ajouter</Text>
          </TouchableOpacity>
        </View>
        {participants.map(p => (
          <View key={p.id} style={styles.participantItem}>
            <Text>{p.name}</Text>
            <TouchableOpacity onPress={() => removeParticipant(p.id)}>
              <Text style={styles.removeText}>Retirer</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.submitButtonText}>{submitting ? 'Création...' : 'Créer l\'événement'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  form: { padding: 20 },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 5, marginTop: 10, color: '#333' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  typeContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  typeButton: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e0e0e0', marginRight: 8, marginBottom: 8 },
  typeButtonActive: { backgroundColor: '#2e7d32' },
  typeText: { color: '#333' },
  typeTextActive: { color: '#fff' },
  dateButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 10 },
  participantRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  addButtonSmall: { backgroundColor: '#2e7d32', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8 },
  addButtonSmallText: { color: '#fff', fontWeight: 'bold' },
  participantItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 8, borderRadius: 8, marginBottom: 5 },
  removeText: { color: '#f44336' },
  submitButton: { backgroundColor: '#2e7d32', padding: 15, borderRadius: 8, marginTop: 20, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});