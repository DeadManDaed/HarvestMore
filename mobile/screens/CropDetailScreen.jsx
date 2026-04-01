// mobile/screens/CropDetailScreen.jsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function CropDetailScreen({ route, navigation }) {
  const { plantation } = route.params;
  const [interventions] = useState(plantation.interventions || []);

  const openInGoogleMaps = () => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${plantation.latitude},${plantation.longitude}`;
    const label = plantation.location_name || plantation.crops?.name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Carte de localisation */}
      {plantation.latitude && (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: plantation.latitude,
              longitude: plantation.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            <Marker
              coordinate={{ latitude: plantation.latitude, longitude: plantation.longitude }}
              title={plantation.location_name}
            />
          </MapView>
          <TouchableOpacity style={styles.mapOverlay} onPress={openInGoogleMaps}>
            <Text style={styles.mapBtnText}>Ouvrir dans Google Maps</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title}>{plantation.crops?.name}</Text>
        <Text style={styles.subtitle}>📍 {plantation.location_name || 'Parcelle sans nom'}</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Superficie</Text>
            <Text style={styles.statValue}>{plantation.area_size} Ha</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Plants</Text>
            <Text style={styles.statValue}>{plantation.plant_count}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Rendement Est.</Text>
            <Text style={styles.statValue}>{plantation.estimated_yield} T</Text>
          </View>
        </View>
<TouchableOpacity
  style={styles.addInterventionButton}
  onPress={() => navigation.navigate('AddIntervention', {
    plantationId: plantation.id,
    plantationName: plantation.crops?.name
  })}
>
  <MaterialIcons name="add-circle" size={24} color="#fff" />
  <Text style={styles.addInterventionText}>Ajouter une intervention</Text>
</TouchableOpacity>

        <Text style={styles.sectionTitle}>Historique des Techniques</Text>
        {interventions.length > 0 ? (
          interventions.map((item, index) => (
            <View key={index} style={styles.timelineItem}>
              <View style={styles.timelineLine}>
                <View style={styles.timelineDot} />
                {index !== interventions.length - 1 && <View style={styles.line} />}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.interDate}>{new Date(item.date).toLocaleDateString()}</Text>
                <Text style={styles.interType}>{item.type}</Text>
                <Text style={styles.interDetail}>{item.detail}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Aucune intervention enregistrée.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  mapContainer: { height: 200, width: '100%', position: 'relative' },
  map: { ...StyleSheet.absoluteFillObject },
  mapOverlay: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(46, 125, 50, 0.9)', padding: 8, borderRadius: 5 },
  mapBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  content: { padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1b5e20' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 20 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  statCard: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 10, flex: 0.32, alignItems: 'center' },
  statLabel: { fontSize: 10, color: '#888', textTransform: 'uppercase' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  timelineItem: { flexDirection: 'row', marginBottom: 20 },
  timelineLine: { alignItems: 'center', marginRight: 15 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2e7d32' },
  line: { width: 2, flex: 1, backgroundColor: '#e0e0e0', marginTop: 4 },
  timelineContent: { flex: 1, backgroundColor: '#fdfdfd', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#f0f0f0' },
  interDate: { fontSize: 11, color: '#9e9e9e' },
  interType: { fontSize: 14, fontWeight: 'bold', color: '#2e7d32' },
  interDetail: { fontSize: 13, color: '#555', marginTop: 2 },
  emptyText: { fontStyle: 'italic', color: '#999', textAlign: 'center' },
addInterventionButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#2e7d32',
  padding: 12,
  borderRadius: 10,
  marginBottom: 20,
  gap: 8
},
addInterventionText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});
