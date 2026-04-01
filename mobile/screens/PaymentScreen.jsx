// mobile/screens/PaymentScreen.jsx

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Clipboard,
  Linking,
  ScrollView
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useCart } from '../contexts/CartContext';

export default function PaymentScreen({ route, navigation }) {
  const { cartItems = [], totalAmount = 0, orderId } = route.params || {};
  const { user } = useAuth();
  const { clearCart } = useCart();

  // --- ÉTATS ---
  const [isPaid, setIsPaid] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // --- LOGIQUE DE TRANSACTION ---
  
  // useMemo est crucial ici : il empêche le code de changer si l'écran se rafraîchit
  const transactionCode = useMemo(() => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const userCode = user?.id?.slice(-4) || '0000';
    return `${timestamp}${random}${userCode}`;
  }, [user?.id]);

  const ussdCode = `*126*${transactionCode}#`;

  const handleCopyCode = () => {
    Clipboard.setString(transactionCode);
    Alert.alert('✅ Code copié', 'Le code a été copié dans le presse-papier');
  };

  const handleDialUSSD = () => {
    const url = `tel:${ussdCode.replace(/#/g, '%23')}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert(
          'Erreur',
          'Impossible de composer le code USSD. Veuillez le composer manuellement.',
          [
            { text: 'OK', style: 'cancel' },
            { text: 'Copier le code', onPress: handleCopyCode }
          ]
        );
      }
    }).catch(err => {
      console.error('Erreur:', err);
      Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application Téléphone');
    });
  };

  const showPaymentOptions = () => {
    Alert.alert(
      '💳 Paiement Mobile Money',
      `Code de transaction: ${transactionCode}\n\nComment souhaitez-vous procéder ?`,
      [
        { text: '📞 Composer USSD', onPress: handleDialUSSD },
        { text: '📋 Copier le code', onPress: handleCopyCode },
        { text: 'Annuler', style: 'cancel' }
      ]
    );
  };

  // --- CONFIRMATION FINALE ---
  const handleConfirmPayment = async () => {
    if (!isPaid) {
      showPaymentOptions();
      setIsPaid(true); 
      return;
    }

    try {
      setIsConfirming(true);

      // 1. Mettre à jour la commande (Assure-toi que les colonnes existent en DB)
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'processing',
          payment_status: 'processing',
          transaction_code: transactionCode,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // 2. Vider le panier (DB + État local)
      await clearCart();

      Alert.alert(
        '✅ Paiement enregistré',
        'Votre commande est en cours de validation. Vous recevrez une confirmation.',
        [{ text: 'Voir mes commandes', onPress: () => navigation.navigate('Orders') }]
      );
    } catch (error) {
      console.error('Erreur confirmation:', error);
      Alert.alert('Erreur', 'Impossible de confirmer le paiement. Vérifiez votre connexion.');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>💳 Paiement Mobile Money</Text>

        {/* Résumé */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Résumé de la commande</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Nombre d'articles:</Text>
            <Text style={styles.summaryValue}>{cartItems.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total à payer:</Text>
            <Text style={styles.totalAmount}>{totalAmount.toLocaleString()} FCFA</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Code transaction:</Text>
            <Text style={styles.transactionCode}>{transactionCode}</Text>
          </View>
        </View>

        {/* Instructions détaillées */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>📱 Comment payer ?</Text>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>Cliquez sur le bouton "💰 J'ai payé" ci-dessous.</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>Choisissez "Composer USSD" ou "Copier le code".</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>Effectuez le transfert sur votre téléphone.</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>4</Text>
            <Text style={styles.stepText}>Revenez ici et cliquez sur "✅ J'ai payé" pour valider.</Text>
          </View>
        </View>

        <View style={styles.helpCard}>
          <Text style={styles.helpText}>
            ℹ️ Votre commande sera traitée dès réception de la confirmation de transfert.
          </Text>
        </View>

        {/* Bouton d'action */}
        <TouchableOpacity
          style={[styles.payButton, isConfirming && styles.disabledButton]}
          onPress={handleConfirmPayment}
          disabled={isConfirming}
        >
          {isConfirming ? (
            <View style={{ flexDirection: 'row' }}>
              <ActivityIndicator color="#fff" style={styles.buttonSpinner} />
              <Text style={styles.payButtonText}>Traitement...</Text>
            </View>
          ) : (
            <Text style={styles.payButtonText}>
              {isPaid ? '✅ J\'ai payé (Confirmer)' : '💰 J\'ai payé'}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          Note: Pensez bien à noter le code {transactionCode} dans le motif du transfert.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2e7d32', textAlign: 'center', marginBottom: 20 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, elevation: 3 },
  summaryTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  summaryLabel: { fontSize: 14, color: '#666' },
  summaryValue: { fontSize: 14, color: '#333', fontWeight: '500' },
  totalAmount: { fontSize: 20, fontWeight: 'bold', color: '#f57c00' },
  transactionCode: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32', fontFamily: 'monospace' },
  divider: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 15 },
  instructionsCard: { backgroundColor: '#e8f5e9', borderRadius: 12, padding: 20, marginBottom: 20 },
  instructionsTitle: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32', marginBottom: 15 },
  step: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#2e7d32', color: '#fff', textAlign: 'center', lineHeight: 24, fontWeight: 'bold', marginRight: 12, fontSize: 12 },
  stepText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 20 },
  helpCard: { backgroundColor: '#fff3e0', borderRadius: 8, padding: 15, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#ff9800' },
  helpText: { fontSize: 13, color: '#666', lineHeight: 18 },
  payButton: { backgroundColor: '#2e7d32', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 15, elevation: 3 },
  disabledButton: { backgroundColor: '#ccc' },
  payButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  buttonSpinner: { marginRight: 10 },
  note: { fontSize: 12, color: '#999', textAlign: 'center', marginBottom: 20 },
});
