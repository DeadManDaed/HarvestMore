// mobile/screens/PaymentScreen.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Clipboard,
  Linking,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useCart } from '../contexts/CartContext';

export default function PaymentScreen({ route, navigation }) {
  const { cartItems = [], totalAmount = 0, orderId } = route.params || {};
  const { user } = useAuth();
  const { clearCart } = useCart();

  // États
  const [isPaid, setIsPaid] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [referenceId, setReferenceId] = useState(null);
  const pollingIntervalRef = useRef(null);

  // Génération du code de transaction
  const transactionCode = useMemo(() => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const userCode = user?.id?.slice(-4) || '0000';
    return `CAFCOOP-${timestamp}-${random}-${userCode}`;
  }, [user?.id]);

  // Nettoyage du polling au démontage
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Validation du numéro MTN Cameroon
  const validateMTNPhone = (phone) => {
    const cleanPhone = phone.replace(/\s/g, '');
    let number = cleanPhone;
    if (number.startsWith('237')) {
      number = number.slice(3);
    }
    if (number.length !== 9) return false;
    const prefix = number.substring(0, 3);
    // Plages MTN Cameroon: 650-654, 670-684
    const mtnPrefixes = [
      '650', '651', '652', '653', '654',
      '670', '671', '672', '673', '674',
      '675', '676', '677', '678', '679',
      '680', '681', '682', '683', '684'
    ];
    return mtnPrefixes.includes(prefix);
  };

  const formatPhoneNumber = (phone) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('237')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.length === 9) {
      return `237${cleaned}`;
    }
    return `237${cleaned}`;
  };

  // Vérifier le statut du paiement via l'API MTN
  const checkPaymentStatus = async (refId) => {
    try {
      const { data, error } = await supabase.functions.invoke('momo-payment-status', {
        body: { referenceId: refId, orderId }
      });
      
      if (error) throw error;
      
      if (data.status === 'SUCCESSFUL') {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        await confirmPayment();
        return true;
      } else if (data.status === 'FAILED') {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        Alert.alert(
          'Paiement échoué',
          'Le paiement n\'a pas été confirmé. Veuillez réessayer.',
          [{ text: 'OK', onPress: () => setPhoneModalVisible(true) }]
        );
        setPaymentStatus('failed');
        return false;
      }
      return false;
    } catch (error) {
      console.error('Erreur vérification paiement:', error);
      return false;
    }
  };

  // Lancer le polling du statut de paiement
  const startPollingPaymentStatus = (refId) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    pollingIntervalRef.current = setInterval(async () => {
      await checkPaymentStatus(refId);
    }, 3000); // Vérifier toutes les 3 secondes
    
    // Arrêter après 5 minutes (10 vérifications max)
    setTimeout(() => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        if (paymentStatus !== 'confirmed') {
          Alert.alert(
            'Temps dépassé',
            'Le délai de confirmation du paiement a été dépassé. Veuillez vérifier votre compte ou contacter le support.',
            [{ text: 'OK' }]
          );
        }
      }
    }, 300000); // 5 minutes
  };

  // Appeler l'Edge Function pour initier le paiement
  const initiatePayment = async () => {
    setIsConfirming(true);
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const amount = Math.round(totalAmount);

    try {
      const { data, error } = await supabase.functions.invoke('momo-payment', {
        body: {
          amount,
          phoneNumber: formattedPhone,
          orderId: orderId
        }
      });

      if (error) throw new Error(error.message);

      if (data.success) {
        setReferenceId(data.referenceId);
        setPaymentStatus('pending');
        setPhoneModalVisible(false);
        
        Alert.alert(
          'Paiement initié',
          `Un code USSD va vous être envoyé sur votre téléphone. Composez *126# pour finaliser le paiement de ${amount.toLocaleString()} FCFA.\n\nRéférence: ${data.referenceId?.slice(0, 8)}`,
          [
            { text: 'Composer *126#', onPress: () => dialUSSD() },
            { text: 'OK', style: 'cancel' }
          ]
        );
        
        // Démarrer le polling du statut
        startPollingPaymentStatus(data.referenceId);
      } else {
        throw new Error(data.message || 'Erreur lors de l\'initiation du paiement');
      }
    } catch (error) {
      console.error('Erreur paiement:', error);
      Alert.alert(
        'Erreur',
        error.message || 'Impossible d\'initier le paiement. Vérifiez votre connexion et réessayez.'
      );
      setPaymentStatus(null);
    } finally {
      setIsConfirming(false);
    }
  };

  const dialUSSD = () => {
    const ussdCode = '*126#';
    const url = `tel:${ussdCode.replace(/#/g, '%23')}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Info', 'Composez *126# pour finaliser votre paiement');
      }
    }).catch(() => {
      Alert.alert('Info', 'Composez *126# pour finaliser votre paiement');
    });
  };

  // Confirmer le paiement après vérification
  const confirmPayment = async () => {
    setIsConfirming(true);
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'processing',
          payment_status: 'paid',
          transaction_code: transactionCode,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          mtn_reference_id: referenceId
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      await clearCart();
      setPaymentStatus('confirmed');

      Alert.alert(
        '✅ Paiement confirmé',
        'Votre commande a été enregistrée avec succès. Vous recevrez une confirmation par SMS.',
        [{ text: 'Voir mes commandes', onPress: () => navigation.navigate('Orders') }]
      );
    } catch (error) {
      console.error('Erreur confirmation:', error);
      Alert.alert('Erreur', 'Impossible de confirmer le paiement');
    } finally {
      setIsConfirming(false);
    }
  };

  // Copier le code de transaction
  const handleCopyCode = () => {
    Clipboard.setString(transactionCode);
    Alert.alert('✅ Code copié', 'Le code a été copié dans le presse-papier');
  };

  // Paiement manuel (fallback si l'API ne répond pas)
  const handleManualPayment = () => {
    Alert.alert(
      '💳 Paiement Mobile Money',
      `Code de transaction: ${transactionCode}\n\nMontant: ${totalAmount.toLocaleString()} FCFA\n\nComment souhaitez-vous procéder ?`,
      [
        { text: '📞 Composer USSD', onPress: () => dialUSSD(), style: 'default' },
        { text: '📋 Copier le code', onPress: handleCopyCode, style: 'default' },
        { text: 'Annuler', style: 'cancel' }
      ]
    );
  };

  // Confirmer manuellement après paiement
  const handleConfirmManually = async () => {
    try {
      setIsConfirming(true);
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

      await clearCart();

      Alert.alert(
        '✅ Paiement enregistré',
        'Votre paiement sera vérifié par notre équipe. Vous recevrez une confirmation sous 24h.',
        [{ text: 'OK', onPress: () => navigation.navigate('Orders') }]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer le paiement');
    } finally {
      setIsConfirming(false);
    }
  };

  const handlePhoneSubmit = () => {
    if (!phoneNumber) {
      setPhoneError('Veuillez entrer votre numéro de téléphone');
      return;
    }
    if (!validateMTNPhone(phoneNumber)) {
      setPhoneError('Numéro MTN invalide. Les numéros MTN commencent par 650-654 ou 670-684');
      return;
    }
    setPhoneError('');
    initiatePayment();
  };

  const handlePaymentAction = () => {
    if (!isPaid) {
      setPhoneModalVisible(true);
      setIsPaid(true);
    } else if (paymentStatus === 'confirmed') {
      navigation.navigate('Orders');
    } else if (paymentStatus === 'pending') {
      Alert.alert(
        'Paiement en cours',
        'Votre paiement est en cours de vérification. Veuillez patienter...',
        [{ text: 'OK' }]
      );
    } else {
      handleManualPayment();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>💳 Paiement Mobile Money</Text>

          {/* Résumé de la commande */}
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

            {referenceId && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Référence MTN:</Text>
                <Text style={styles.referenceId}>{referenceId?.slice(0, 8)}...</Text>
              </View>
            )}

            <TouchableOpacity onPress={handleCopyCode} style={styles.copyButton}>
              <Text style={styles.copyButtonText}>📋 Copier le code</Text>
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>📱 Comment payer avec MTN Mobile Money ?</Text>

            <View style={styles.step}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>
                Saisissez votre numéro MTN (650-654 ou 670-684)
              </Text>
            </View>

            <View style={styles.step}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>
                Composez *126# et suivez les instructions pour finaliser le paiement de {totalAmount.toLocaleString()} FCFA
              </Text>
            </View>

            <View style={styles.step}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>
                Confirmation automatique après paiement (5-10 secondes)
              </Text>
            </View>
          </View>

          {/* Bouton principal */}
          <TouchableOpacity
            style={[
              styles.payButton,
              (isConfirming || paymentStatus === 'confirmed') && styles.disabledButton
            ]}
            onPress={handlePaymentAction}
            disabled={isConfirming || paymentStatus === 'confirmed'}
          >
            {isConfirming ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#fff" style={styles.buttonSpinner} />
                <Text style={styles.payButtonText}>Vérification en cours...</Text>
              </View>
            ) : paymentStatus === 'confirmed' ? (
              <Text style={styles.payButtonText}>✅ Paiement confirmé</Text>
            ) : isPaid ? (
              <Text style={styles.payButtonText}>💰 J'ai effectué le paiement</Text>
            ) : (
              <Text style={styles.payButtonText}>💰 Procéder au paiement</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.note}>
            Note: Conservez le code de transaction ({transactionCode}) pour toute réclamation.
          </Text>
        </View>
      </ScrollView>

      {/* Modal de saisie du numéro de téléphone */}
      <Modal
        visible={phoneModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPhoneModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📱 Paiement MTN Mobile Money</Text>
            <Text style={styles.modalSubtitle}>
              Entrez votre numéro MTN Cameroon
            </Text>

            <View style={styles.phoneInputContainer}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+237</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="6XXXXXXXX"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={(text) => {
                  setPhoneNumber(text);
                  setPhoneError('');
                }}
                maxLength={9}
              />
            </View>

            {phoneError ? (
              <Text style={styles.errorText}>{phoneError}</Text>
            ) : (
              <Text style={styles.hintText}>
                Numéros acceptés: 650-654 ou 670-684 (ex: 670123456)
              </Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setPhoneModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handlePhoneSubmit}
                disabled={isConfirming}
              >
                <Text style={styles.confirmButtonText}>
                  {isConfirming ? 'Envoi...' : 'Payer avec MTN'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { flexGrow: 1 },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2e7d32', textAlign: 'center', marginBottom: 20 },

  summaryCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, elevation: 3 },
  summaryTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  summaryLabel: { fontSize: 14, color: '#666' },
  summaryValue: { fontSize: 14, color: '#333', fontWeight: '500' },
  totalAmount: { fontSize: 20, fontWeight: 'bold', color: '#f57c00' },
  transactionCode: { fontSize: 14, fontWeight: 'bold', color: '#2e7d32', fontFamily: 'monospace', letterSpacing: 1 },
  referenceId: { fontSize: 12, color: '#999', fontFamily: 'monospace' },
  divider: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 15 },
  copyButton: { backgroundColor: '#e8f5e9', padding: 10, borderRadius: 8, marginTop: 10, alignItems: 'center' },
  copyButtonText: { color: '#2e7d32', fontSize: 14, fontWeight: '600' },

  instructionsCard: { backgroundColor: '#e8f5e9', borderRadius: 12, padding: 20, marginBottom: 20 },
  instructionsTitle: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32', marginBottom: 15 },
  step: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  stepNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#2e7d32', color: '#fff', textAlign: 'center', lineHeight: 24, fontWeight: 'bold', marginRight: 12, fontSize: 12 },
  stepText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 20 },

  payButton: { backgroundColor: '#2e7d32', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 15, elevation: 3 },
  disabledButton: { backgroundColor: '#ccc' },
  buttonContent: { flexDirection: 'row', alignItems: 'center' },
  payButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  buttonSpinner: { marginRight: 10 },

  note: { fontSize: 12, color: '#999', textAlign: 'center', lineHeight: 18, marginBottom: 20 },

  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '90%', maxWidth: 350 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2e7d32', textAlign: 'center', marginBottom: 10 },
  modalSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  phoneInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, marginBottom: 10 },
  countryCode: { paddingHorizontal: 12, paddingVertical: 14, backgroundColor: '#f0f0f0', borderRightWidth: 1, borderRightColor: '#ddd', borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
  countryCodeText: { fontSize: 16, fontWeight: '500', color: '#333' },
  phoneInput: { flex: 1, padding: 14, fontSize: 16, color: '#333' },
  errorText: { color: '#f44336', fontSize: 12, marginBottom: 10 },
  hintText: { color: '#999', fontSize: 11, marginBottom: 20, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 10 },
  modalButton: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f0f0f0' },
  cancelButtonText: { color: '#666', fontWeight: '500' },
  confirmButton: { backgroundColor: '#2e7d32' },
  confirmButtonText: { color: '#fff', fontWeight: 'bold' }
});

