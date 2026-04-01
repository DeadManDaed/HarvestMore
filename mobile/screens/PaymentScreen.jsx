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
import { useCart } from '../contexts/CartContext'; // Import crucial
import { supabase } from '../lib/supabase';

export default function PaymentScreen({ route, navigation }) {
  // 1. Récupération sécurisée des paramètres
  const { cartItems = [], totalAmount = 0, orderId } = route.params || {};
  const { user } = useAuth();
  const { clearCart } = useCart();

  // 2. Déclaration des états (ce qui manquait probablement)
  const [isPaid, setIsPaid] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // 3. Génération du code de transaction (une seule fois par session d'écran)
  const transactionCode = useMemo(() => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const userSuffix = user?.id?.slice(-4) || '0000';
    return `NFBO-${timestamp}-${userSuffix}`;
  }, [user?.id]);

  const ussdCode = `*126#`; // Code générique MTN/Orange pour le Cameroun

  const handleCopyCode = () => {
    Clipboard.setString(transactionCode);
    Alert.alert('✅ Code copié', 'Utilisez ce code comme motif de transaction.');
  };

  const handleConfirmPayment = async () => {
    // Si l'utilisateur n'a pas encore vu les instructions de paiement
    if (!isPaid) {
      Alert.alert(
        '💳 Paiement Mobile Money',
        `Étape 1 : Faites le transfert de ${totalAmount} FCFA.\n\nÉtape 2 : Utilisez le code ${transactionCode} comme motif.\n\nÉtape 3 : Revenez ici et cliquez sur "J'ai payé".`,
        [
          { text: 'Copier le code', onPress: handleCopyCode },
          { text: 'OK', onPress: () => setIsPaid(true) }
        ]
      );
      return;
    }

    try {
      setIsConfirming(true);

      // Mise à jour de la commande dans Supabase
      // Note : Assure-toi d'avoir exécuté le script SQL pour ajouter 'transaction_code'
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'processing',
          payment_status: 'processing',
          transaction_code: transactionCode,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Vidage du panier (Base de données + UI)
      await clearCart();

      Alert.alert(
        '✅ Reçu enregistré',
        'Votre demande est en cours de validation par nos services.',
        [{ text: 'Mes Commandes', onPress: () => navigation.navigate('Orders') }]
      );

    } catch (error) {
      console.error('Erreur confirmation:', error);
      Alert.alert('Erreur', 'Impossible de valider. Vérifiez votre connexion.');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Finaliser le paiement</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.totalAmount}>{totalAmount.toLocaleString()} FCFA</Text>
          <Text style={styles.label}>ID Commande: {orderId?.slice(0, 8)}...</Text>
          <View style={styles.divider} />
          <Text style={styles.label}>Motif à inscrire :</Text>
          <Text style={styles.transactionCode}>{transactionCode}</Text>
          <TouchableOpacity onPress={handleCopyCode}>
            <Text style={styles.copyLink}>Copier le motif</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.payButton, isConfirming && styles.disabledButton]}
          onPress={handleConfirmPayment}
          disabled={isConfirming}
        >
          {isConfirming ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payButtonText}>
              {isPaid ? "✅ J'ai effectué le transfert" : "💰 Procéder au paiement"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ... garde tes styles inchangés ...
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    content: { padding: 20, alignItems: 'center' },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#2e7d32' },
    summaryCard: { backgroundColor: '#fff', width: '100%', padding: 20, borderRadius: 12, elevation: 2, alignItems: 'center' },
    totalAmount: { fontSize: 28, fontWeight: 'bold', color: '#f57c00', marginBottom: 10 },
    label: { color: '#666', fontSize: 14 },
    transactionCode: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32', marginVertical: 10, letterSpacing: 1 },
    copyLink: { color: '#007bff', fontWeight: '500' },
    divider: { height: 1, backgroundColor: '#eee', width: '100%', marginVertical: 15 },
    payButton: { backgroundColor: '#2e7d32', width: '100%', padding: 16, borderRadius: 12, marginTop: 30, alignItems: 'center' },
    disabledButton: { backgroundColor: '#ccc' },
    payButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
