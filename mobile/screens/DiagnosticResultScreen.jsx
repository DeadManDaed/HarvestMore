// mobile/screens/DiagnosticResultScreen.jsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { getProbability } from '../utils/diagnosticEngine';
import { cropDiagnosticsDatabase } from '../data/cropDiagnostics';
import BackHeader from '../components/BackHeader';

export default function DiagnosticResultScreen({ route, navigation }) {
  const { selectedSymptomIds, cropId, cropName, plantationId } = route.params;

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

  const handleAddToCart = (productNom) => {
    Alert.alert('Ajout au panier', `${productNom} sera ajouté à votre panier.`);
    // À implémenter : ajouter au panier
  };

  return (
    <View style={styles.container}>
      <BackHeader title="Résultat du diagnostic" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.cropName}>{cropName}</Text>
          <Text style={styles.subtitle}>Diagnostic basé sur vos observations</Text>
        </View>

        {diagnostics.length > 0 ? (
          diagnostics.map((d, index) => (
            <View key={index} style={[styles.card, index === 0 && styles.topMatch]}>
              <View style={styles.cardHeader}>
                <Text style={styles.diagnosisName}>{d.nom}</Text>
                <View style={[styles.probabilityBadge, { backgroundColor: getProbabilityColor(d.probabilite) }]}>
                  <Text style={styles.probabilityText}>{d.probabilite}%</Text>
                </View>
              </View>
              
              <Text style={styles.type}>Type : {d.type}</Text>
              <Text style={styles.advice}>💡 {d.conseil}</Text>
              
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.buyButton} onPress={() => handleBuy(d.lien_achat)}>
                  <Text style={styles.buyButtonText}>Acheter {d.produit_nom}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cartButton} onPress={() => handleAddToCart(d.produit_nom)}>
                  <Text style={styles.cartButtonText}>🛒 Ajouter au panier</Text>
                </TouchableOpacity>
              </View>
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
            <TouchableOpacity style={styles.contactButton} onPress={() => navigation.navigate('Conversations')}>
              <Text style={styles.contactButtonText}>📞 Contacter un technicien</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>← Retour aux symptômes</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const getProbabilityColor = (probabilite) => {
  if (probabilite >= 80) return '#f44336';
  if (probabilite >= 50) return '#ff9800';
  return '#4caf50';
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { flex: 1 },
  header: { backgroundColor: '#2e7d32', padding: 20, alignItems: 'center' },
  cropName: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 12, color: '#e0e0e0', marginTop: 5 },
  card: { backgroundColor: '#fff', margin: 15, padding: 15, borderRadius: 12, elevation: 2 },
  topMatch: { borderLeftWidth: 4, borderLeftColor: '#ff9800' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  diagnosisName: { fontSize: 18, fontWeight: 'bold', color: '#333', flex: 1 },
  probabilityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  probabilityText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  type: { fontSize: 12, color: '#666', marginBottom: 8 },
  advice: { fontSize: 14, color: '#333', marginBottom: 12, lineHeight: 20 },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  buyButton: { flex: 1, backgroundColor: '#2e7d32', padding: 12, borderRadius: 8, alignItems: 'center' },
  buyButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  cartButton: { flex: 1, backgroundColor: '#ff9800', padding: 12, borderRadius: 8, alignItems: 'center' },
  cartButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  noResult: { backgroundColor: '#fff', margin: 15, padding: 20, borderRadius: 12, alignItems: 'center' },
  noResultText: { fontSize: 16, color: '#d32f2f', textAlign: 'center', marginBottom: 10 },
  noResultSubtext: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  contactButton: { backgroundColor: '#2e7d32', padding: 12, borderRadius: 8, alignItems: 'center', width: '100%', marginBottom: 10 },
  contactButtonText: { color: '#fff', fontWeight: 'bold' },
  backButton: { padding: 12, borderRadius: 8, alignItems: 'center', width: '100%' },
  backButtonText: { color: '#666' }
});