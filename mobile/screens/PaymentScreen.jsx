// mobile/screens/PaymentScreen.jsx

import React, { useState } from 'react';
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
  const { cartItems = [], totalAmount = 0, orderId } = route.params || {}; // Toujours sécuriser route.params
  const { user } = useAuth();
  const { clearCart } = useCart(); // <--- RÉCUPÈRE clearCart DU CONTEXTE

  // Générer un code unique pour la transaction
  const generateTransactionCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const userCode = user?.id?.slice(-4) || '0000';
    return `${timestamp}${random}${userCode}`;
  };

  const transactionCode = generateTransactionCode();

  // Numéro USSD pour le paiement (à adapter selon votre opérateur)
  // Exemple: MTN Cameroon: *126#, Orange Cameroon: *144#, etc.
  const ussdCode = `*126*${transactionCode}#`; // À personnaliser

  // Copier le code
  const handleCopyCode = () => {
    Clipboard.setString(transactionCode);
    Alert.alert('✅ Code copié', 'Le code a été copié dans le presse-papier');
  };

  // Composer l'USSD
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

  // Ouvrir le dialogue avec les deux options
  const showPaymentOptions = () => {
    Alert.alert(
      '💳 Paiement Mobile Money',
      `Code de transaction: ${transactionCode}\n\nComment souhaitez-vous procéder ?`,
      [
        {
          text: '📞 Composer USSD',
          onPress: handleDialUSSD,
          style: 'default'
        },
        {
          text: '📋 Copier le code',
          onPress: handleCopyCode,
          style: 'default'
        },
        {
          text: 'Annuler',
          style: 'cancel'
        }
      ]
    );
  };

  // Confirmer le paiement
  const handleConfirmPayment = async () => {
    if (!isPaid) {
      showPaymentOptions();
      setIsPaid(true); // <--- AJOUTE CECI pour que le bouton change d'état après la première étape
      return;
    }

    try {
      setIsConfirming(true);

      // 1. Mettre à jour la commande
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'processing',
          payment_status: 'processing', // Assure-toi que 'processing' est bien dans ton enum USER-DEFINED
          transaction_code: transactionCode,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // 2. Vider le panier via le contexte (Met à jour la DB ET l'UI)
      await clearCart(); // <--- UTILISE LA FONCTION DU CONTEXTE ICI

      Alert.alert(
        '✅ Paiement confirmé',
        'Votre commande a été enregistrée avec succès. Vous recevrez une confirmation.',
        [
          {
            text: 'Voir mes commandes',
            onPress: () => navigation.navigate('Orders') // Assure-toi que cette route existe
          }
        ]
      );
    } catch (error) {
      console.error('Erreur confirmation:', error);
      Alert.alert('Erreur', 'Impossible de confirmer le paiement');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Titre */}
        <Text style={styles.title}>💳 Paiement Mobile Money</Text>

        {/* Résumé de la commande */}
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

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>📱 Comment payer ?</Text>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>
              Cliquez sur le bouton "J'ai payé" ci-dessous
            </Text>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>
              Choisissez "Composer USSD" ou "Copier le code"
            </Text>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>
              Composez le code USSD sur votre téléphone et effectuez le paiement
            </Text>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>4</Text>
            <Text style={styles.stepText}>
              Revenez dans l'application et cliquez à nouveau sur "J'ai payé"
            </Text>
          </View>
        </View>

        {/* Aide */}
        <View style={styles.helpCard}>
          <Text style={styles.helpText}>
            ℹ️ Une fois le paiement effectué, votre commande sera traitée dans les plus brefs délais.
          </Text>
        </View>

        {/* Bouton principal */}
        <TouchableOpacity
          style={[
            styles.payButton,
            (isConfirming) && styles.disabledButton
          ]}
          onPress={handleConfirmPayment}
          disabled={isConfirming}
        >
          {isConfirming ? (
            <>
              <ActivityIndicator color="#fff" style={styles.buttonSpinner} />
              <Text style={styles.payButtonText}>En attente de confirmation...</Text>
            </>
          ) : (
            <Text style={styles.payButtonText}>
              {isPaid ? '✅ J\'ai payé' : '💰 J\'ai payé'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Note importante */}
        <Text style={styles.note}>
          Note: N'oubliez pas de confirmer votre paiement après avoir effectué le transfert.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7d32',
    textAlign: 'center',
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f57c00',
  },
  transactionCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    fontFamily: 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 15,
  },
  instructionsCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 15,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2e7d32',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: 'bold',
    marginRight: 12,
    fontSize: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  helpCard: {
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  helpText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  payButton: {
    backgroundColor: '#2e7d32',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonSpinner: {
    marginRight: 10,
  },
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
});