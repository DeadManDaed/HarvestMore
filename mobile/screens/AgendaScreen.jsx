// mobile/screens/AgendaScreen.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import BackHeader from '../components/BackHeader';

export default function AgendaScreen({ navigation }) {
  const { user, profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [markedDates, setMarkedDates] = useState({});

  const fetchEvents = async () => {
    if (!user) return;
    setLoading(true);
    // Récupérer les événements où l'utilisateur est participant ou créateur
    const { data, error } = await supabase
      .from('shared_events')
      .select(`
        *,
        event_participants!inner(user_id, confirmed),
        created_by_profile:profiles!created_by(full_name, username)
      `)
      .or(`created_by.eq.${user.id},event_participants.user_id.eq.${user.id}`)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Erreur fetchEvents:', error);
    } else {
      setEvents(data || []);
      // Marquer les dates avec événements
      const marks = {};
      data.forEach(event => {
        const date = event.start_time.split('T')[0];
        marks[date] = { marked: true, dotColor: '#2e7d32' };
      });
      setMarkedDates(marks);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
    const unsubscribe = navigation.addListener('focus', fetchEvents);
    return unsubscribe;
  }, [navigation, user]);

  const getEventStatus = (event) => {
    const now = new Date();
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    if (event.status === 'cancelled') return 'Annulé';
    if (now > end) return 'Terminé';
    if (now >= start && now <= end) return 'En cours';
    return 'À venir';
  };

  const getParticipantStatus = (event) => {
    const myParticipation = event.event_participants?.find(p => p.user_id === user.id);
    if (!myParticipation) return null;
    return myParticipation.confirmed ? 'Confirmé' : 'En attente';
  };

  const renderEvent = ({ item }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
    >
      <View style={styles.eventHeader}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <Text style={[styles.eventStatus, 
          item.status === 'cancelled' && styles.statusCancelled,
          getEventStatus(item) === 'En cours' && styles.statusOngoing
        ]}>
          {getEventStatus(item)}
        </Text>
      </View>
      <Text style={styles.eventType}>{item.event_type}</Text>
      <Text style={styles.eventDate}>
        📅 {new Date(item.start_time).toLocaleDateString()} {new Date(item.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
        {' → '}
        {new Date(item.end_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
      </Text>
      {item.location && <Text style={styles.eventLocation}>📍 {item.location}</Text>}
      {getParticipantStatus(item) && (
        <Text style={styles.participantStatus}>
          Participation : {getParticipantStatus(item)}
        </Text>
      )}
    </TouchableOpacity>
  );

  const filteredEvents = events.filter(event => event.start_time.split('T')[0] === selectedDate);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BackHeader title="Mon agenda" />
      <Calendar
        current={selectedDate}
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={{
          ...markedDates,
          [selectedDate]: { selected: true, selectedColor: '#2e7d32' }
        }}
        theme={{
          todayTextColor: '#2e7d32',
          selectedDayBackgroundColor: '#2e7d32',
        }}
      />
      <View style={styles.eventsContainer}>
        <Text style={styles.sectionTitle}>
          Événements du {new Date(selectedDate).toLocaleDateString()}
        </Text>
        {filteredEvents.length === 0 ? (
          <Text style={styles.noEvents}>Aucun événement ce jour</Text>
        ) : (
          <FlatList
            data={filteredEvents}
            renderItem={renderEvent}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
      {/* Bouton d'ajout (selon rôle) */}
      {profile?.role !== 'farmer' && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddEvent')}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  eventsContainer: { flex: 1, padding: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#2e7d32' },
  list: { paddingBottom: 20 },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
  },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  eventTitle: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  eventStatus: { fontSize: 12, color: '#666' },
  statusCancelled: { color: '#f44336' },
  statusOngoing: { color: '#ff9800' },
  eventType: { fontSize: 12, color: '#2e7d32', textTransform: 'capitalize', marginBottom: 5 },
  eventDate: { fontSize: 13, color: '#555', marginBottom: 3 },
  eventLocation: { fontSize: 13, color: '#555' },
  participantStatus: { fontSize: 12, color: '#2e7d32', marginTop: 5, fontStyle: 'italic' },
  noEvents: { textAlign: 'center', color: '#999', marginTop: 20 },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2e7d32',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  addButtonText: { fontSize: 28, color: '#fff' },
});