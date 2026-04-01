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

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTATS (CORRIGÉ - manquaient dans Code 1)
  // ═══════════════════════════════════════════════════════════════════════════
  const [isPaid, setIsPaid] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // GÉNÉRATION CODE TRANSACTION (OPTIMISÉ avec useMemo)
  // ═══════════════════════════════════════════════════════════════════════════
  const transactionCode = useMemo(() => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const userCode = user?.id?.slice(-4) || '0000';
    // Format: NFBO-745623-8912-3456 (préfixe + timestamp + random + userCode)
    return `CAFCOOP-${timestamp}-${random}-${userCode}`;
  }, [user?.id]); // Recalculé uniquement si user.id change

  // Numéro USSD pour le paiement (à adapter selon opérateur)
  // MTN Cameroon: *126#, Orange Cameroon: *144#
  const ussdCode = `*126*${transactionCode.replace(/CAFCOOP-/g, '')}#`;

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  // Copier le code de transaction
  const handleCopyCode = () => {
    Clipboard.setString(transactionCode);
    Alert.alert('✅ Code copié', 'Le code a été copié dans le presse-papier');
  };

  // Composer l'USSD automatiquement
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
      console.error('Erreur Linking:', err);
      Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application Téléphone');
    });
  };

  // Ouvrir le dialogue avec les options de paiement
  const showPaymentOptions = () => {
    Alert.alert(
      '💳 Paiement Mobile Money',
      `Code de transaction: ${transactionCode}\n\nMontant: ${totalAmount.toLocaleString()} FCFA\n\nComment souhaitez-vous procéder ?`,
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
    // Première étape : montrer les options de paiement
    if (!isPaid) {
      showPaymentOptions();
      setIsPaid(true); // Marquer que l'utilisateur a vu les instructions
      return;
    }

    // Deuxième étape : confirmer que le paiement a été effectué
    try {
      setIsConfirming(true);

      // 1. Mettre à jour la commande dans la base de données
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'processing',
          payment_status: 'processing',
          transaction_code: transactionCode,
          paid_at: new Date().toISOString(), // Timestamp exact du paiement
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // 2. Vider le panier (Base de données ET contexte UI)
      await clearCart();

      // 3. Afficher confirmation et rediriger
      Alert.alert(
        '✅ Paiement confirmé',
        'Votre commande a été enregistrée avec succès. Vous recevrez une confirmation par SMS.',
        [
          {
            text: 'Voir mes commandes',
            onPress: () => navigation.navigate('Orders')
          }
        ]
      );
    } catch (error) {
      console.error('Erreur confirmation paiement:', error);
      Alert.alert(
        'Erreur',
        'Impossible de confirmer le paiement. Vérifiez votre connexion et réessayez.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsConfirming(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TITRE */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <Text style={styles.title}>💳 Paiement Mobile Money</Text>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* RÉSUMÉ DE LA COMMANDE */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Résumé de la commande</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Numéro de commande:</Text>
            <Text style={styles.summaryValue}>
              {orderId?.slice(0, 8).toUpperCase() || 'N/A'}...
            </Text>
          </View>

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

          <TouchableOpacity onPress={handleCopyCode} style={styles.copyButton}>
            <Text style={styles.copyButtonText}>📋 Copier le code</Text>
          </TouchableOpacity>
        </View>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* INSTRUCTIONS DÉTAILLÉES */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>📱 Comment payer ?</Text>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>
              Cliquez sur le bouton "Procéder au paiement" ci-dessous
            </Text>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>
              Choisissez "Composer USSD" pour payer directement via votre téléphone
              OU "Copier le code" pour le saisir manuellement
            </Text>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>
              Composez le code USSD et suivez les instructions de votre opérateur
              pour effectuer le paiement de {totalAmount.toLocaleString()} FCFA
            </Text>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>4</Text>
            <Text style={styles.stepText}>
              Une fois le paiement effectué, revenez dans l'application et cliquez
              sur "J'ai effectué le paiement" pour confirmer
            </Text>
          </View>
        </View>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* CARTE D'AIDE */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <View style={styles.helpCard}>
          <Text style={styles.helpText}>
            ℹ️ Une fois le paiement effectué et confirmé, votre commande sera
            traitée dans les plus brefs délais. Vous recevrez une notification
            par SMS pour chaque étape de traitement.
          </Text>
        </View>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* BOUTON PRINCIPAL */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.payButton,
            isConfirming && styles.disabledButton
          ]}
          onPress={handleConfirmPayment}
          disabled={isConfirming}
        >
          {isConfirming ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator color="#fff" style={styles.buttonSpinner} />
              <Text style={styles.payButtonText}>Confirmation en cours...</Text>
            </View>
          ) : (
            <Text style={styles.payButtonText}>
              {isPaid ? '✅ J\'ai effectué le paiement' : '💰 Procéder au paiement'}
            </Text>
          )}
        </TouchableOpacity>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* NOTE DE BAS DE PAGE */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <Text style={styles.note}>
          Note: Conservez le code de transaction ({transactionCode}) pour toute
          réclamation ou suivi de votre paiement.
        </Text>
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

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
  
  // CARTE RÉSUMÉ
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
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2e7d32',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 15,
  },
  copyButton: {
    backgroundColor: '#e8f5e9',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '600',
  },

  // CARTE INSTRUCTIONS
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
    alignItems: 'flex-start',
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

  // CARTE AIDE
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

  // BOUTON PRINCIPAL
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
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonSpinner: {
    marginRight: 10,
  },

  // NOTE
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
});
