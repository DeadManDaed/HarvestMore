// mobile/screens/EventDetailScreen.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import BackHeader from '../components/BackHeader';

export default function EventDetailScreen({ route, navigation }) {
  const { eventId } = route.params;
  const { user, profile } = useAuth();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myConfirmation, setMyConfirmation] = useState(false);

  const fetchEvent = async () => {
    const { data, error } = await supabase
      .from('shared_events')
      .select('*, created_by_profile:profiles!created_by(full_name, username)')
      .eq('id', eventId)
      .single();
    if (error) {
      console.error(error);
    } else {
      setEvent(data);
    }
    // Participants
    const { data: parts, error: partsError } = await supabase
      .from('event_participants')
      .select('*, profile:profiles(id, full_name, username)')
      .eq('event_id', eventId);
    if (!partsError) {
      setParticipants(parts);
      const myPart = parts.find(p => p.user_id === user.id);
      setMyConfirmation(myPart?.confirmed || false);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const confirmParticipation = async (confirmed) => {
    const { error } = await supabase
      .from('event_participants')
      .update({ confirmed })
      .eq('event_id', eventId)
      .eq('user_id', user.id);
    if (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour');
    } else {
      setMyConfirmation(confirmed);
      Alert.alert('Merci', `Vous avez ${confirmed ? 'confirmé' : 'refusé'} votre participation.`);
    }
  };

  const cancelEvent = async () => {
    if (profile.role !== 'admin' && event.created_by !== user.id) {
      Alert.alert('Non autorisé', 'Seul l\'organisateur ou un admin peut annuler.');
      return;
    }
    Alert.alert('Annuler', 'Voulez-vous vraiment annuler cet événement ?', [
      { text: 'Non', style: 'cancel' },
      { text: 'Oui', onPress: async () => {
        const { error } = await supabase
          .from('shared_events')
          .update({ status: 'cancelled' })
          .eq('id', eventId);
        if (error) Alert.alert('Erreur', error.message);
        else {
          setEvent({ ...event, status: 'cancelled' });
          Alert.alert('Annulé', 'L\'événement a été annulé.');
        }
      } }
    ]);
  };

  if (loading) return <ActivityIndicator size="large" color="#2e7d32" style={{ marginTop: 50 }} />;
  if (!event) return <Text>Événement introuvable</Text>;

  const isOrganizer = event.created_by === user.id;
  const isAdmin = profile.role === 'admin';
  const canEdit = isOrganizer || isAdmin;

  return (
    <View style={styles.container}>
      <BackHeader title="Détail événement" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.type}>{event.event_type}</Text>
        <Text style={styles.date}>
          📅 {new Date(event.start_time).toLocaleString()} → {new Date(event.end_time).toLocaleString()}
        </Text>
        {event.location && <Text style={styles.location}>📍 {event.location}</Text>}
        <Text style={styles.status}>Statut : {event.status}</Text>
        <Text style={styles.description}>{event.description || 'Aucune description'}</Text>

        <Text style={styles.sectionTitle}>Participants</Text>
        {participants.map(p => (
          <View key={p.id} style={styles.participantRow}>
            <Text>{p.profile?.full_name || p.profile?.username}</Text>
            {p.role === 'organizer' && <Text style={styles.organizerBadge}>Organisateur</Text>}
            {p.confirmed && <Text style={styles.confirmedBadge}>✓ Confirmé</Text>}
          </View>
        ))}

        {event.status !== 'cancelled' && (
          <View style={styles.confirmContainer}>
            <Text style={styles.confirmLabel}>Ma participation :</Text>
            <TouchableOpacity
              style={[styles.confirmButton, myConfirmation && styles.confirmButtonActive]}
              onPress={() => confirmParticipation(true)}
            >
              <Text style={styles.confirmButtonText}>Confirmer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, myConfirmation === false && styles.refuseButtonActive]}
              onPress={() => confirmParticipation(false)}
            >
              <Text style={styles.confirmButtonText}>Refuser</Text>
            </TouchableOpacity>
          </View>
        )}

        {canEdit && event.status !== 'cancelled' && (
          <TouchableOpacity style={styles.cancelButton} onPress={cancelEvent}>
            <Text style={styles.cancelButtonText}>Annuler l'événement</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5, color: '#2e7d32' },
  type: { fontSize: 14, color: '#ff9800', textTransform: 'capitalize', marginBottom: 10 },
  date: { fontSize: 16, marginBottom: 5 },
  location: { fontSize: 16, marginBottom: 5 },
  status: { fontSize: 14, marginBottom: 15, fontStyle: 'italic' },
  description: { fontSize: 14, color: '#555', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 10, marginBottom: 10 },
  participantRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 0.5, borderColor: '#eee' },
  organizerBadge: { backgroundColor: '#2e7d32', color: '#fff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, overflow: 'hidden' },
  confirmedBadge: { color: '#2e7d32', fontWeight: 'bold' },
  confirmContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 20, flexWrap: 'wrap' },
  confirmLabel: { marginRight: 10, fontWeight: 'bold' },
  confirmButton: { backgroundColor: '#ccc', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, marginHorizontal: 5 },
  confirmButtonActive: { backgroundColor: '#2e7d32' },
  refuseButtonActive: { backgroundColor: '#f44336' },
  confirmButtonText: { color: '#fff' },
  cancelButton: { backgroundColor: '#f44336', padding: 12, borderRadius: 8, marginTop: 20, alignItems: 'center' },
  cancelButtonText: { color: '#fff', fontWeight: 'bold' },
});