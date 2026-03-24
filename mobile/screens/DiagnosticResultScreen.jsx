// mobile/screens/DiagnosticResultScreen.jsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { getProbability } from '../utils/diagnosticEngine';
import { cropDiagnosticsDatabase } from '../data/cropDiagnostics';

export default function DiagnosticResultScreen({ route, navigation }) {
  const { selectedSymptomIds, cropId, cropName } = route.params;

  // Calculer les diagnostics probables
  const diagnostics = getProbability(selectedSymptomIds, cropId, cropDiagnosticsDatabase);

  const handleBuy = async (url) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Erreur', 'Impossible d\'ouvrir le lien');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Diagnostic pour {cropName}</Text>
      </View>

      {diagnostics.length > 0 ? (
        diagnostics.map((d, index) => (
          <View key={index} style={[styles.card, index === 0 && styles.topMatch]}>
            <Text style={styles.diagnosisName}>{d.nom}</Text>
            <Text style={styles.probability}>Probabilité : {d.probabilite}%</Text>
            <Text style={styles.type}>Type : {d.type}</Text>
            <Text style={styles.advice}>Conseil : {d.conseil}</Text>
            {d.lien_achat && (
              <TouchableOpacity style={styles.buyButton} onPress={() => handleBuy(d.lien_achat)}>
                <Text style={styles.buyButtonText}>Acheter {d.produit_nom}</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      ) : (
        <View style={styles.noResult}>
          <Text style={styles.noResultText}>
            Aucune pathologie identifiée avec les symptômes sélectionnés.
          </Text>
          <Text style={styles.noResultSubtext}>
            Veuillez sélectionner plus de symptômes ou contacter un technicien.
          </Text>
          <TouchableOpacity style={styles.contactButton} onPress={() => navigation.goBack()}>
            <Text style={styles.contactButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2e7d32',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  topMatch: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  diagnosisName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  probability: {
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: 'bold',
    marginTop: 5,
  },
  type: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },
  advice: {
    fontSize: 14,
    color: '#333',
    marginTop: 10,
    lineHeight: 20,
  },
  buyButton: {
    backgroundColor: '#2e7d32',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  noResult: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  noResultText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 10,
  },
  noResultSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  contactButton: {
    backgroundColor: '#ff9800',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});