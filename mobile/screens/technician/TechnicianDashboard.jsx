// mobile/screens/technician/TechnicianDashboard.jsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BackHeader from '../../components/BackHeader';

export default function TechnicianDashboard() {
  return (
    <View style={styles.container}>
      <BackHeader title="Tableau de bord technicien" />
      <Text>Contenu à venir : diagnostics en attente, interventions terrain...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' }
});