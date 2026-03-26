//mobile/screens/CartScreen.jsx

import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function CartScreen({ navigation }) {
  const { cartItems, loading, updateQuantity, removeItem, clearCart, getTotal, fetchCart } = useCart();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [ussdCode, setUssdCode] = useState('');

  const total = getTotal();

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Panier vide', 'Ajoutez des produits avant de commander.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Créer la commande
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total: total,
          status: 'pending_payment',
          payment_method: 'mobile_money',
          delivery_option: 'pickup' // ou 'delivery' selon choix
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Créer la transaction de paiement
      const ussd = `*126*16*080413*${Math.round(total)}#`; // Exemple MTN
      const { error: txError } = await supabase
        .from('payment_transactions')
        .insert({
          order_id: order.id,
          provider: 'mtn',
          amount: total,
          ussd_code: ussd,
          status: 'pending'
        });

      if (txError) throw txError;

      setUssdCode(ussd);
      setOrderCreated(true);
      Alert.alert(
        'Commande enregistrée',
        `Votre commande #${order.id.slice(0,8)} est en attente de paiement.\nComposez : ${ussd}\nCliquez sur "J’ai payé" après avoir effectué le paiement.`
      );
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de finaliser la commande.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPayment = async () => {
    Alert.alert(
      'Confirmation',
      'Avez-vous bien effectué le paiement ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          onPress: async () => {
            // Ici on simule la confirmation (à remplacer par appel à Edge Function)
            Alert.alert('Merci !', 'Votre paiement sera vérifié. Vous serez notifié dès confirmation.');
            // clearCart();
            // navigation.goBack();
          }
        }
      ]
    );
  };

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.product.name}</Text>
        <Text style={styles.itemPrice}>{item.product.price} FCFA</Text>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.qtyButton}
          onPress={() => updateQuantity(item.id, item.quantity - 1)}
        >
          <Text style={styles.qtyButtonText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.itemQuantity}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.qtyButton}
          onPress={() => updateQuantity(item.id, item.quantity + 1)}
        >
          <Text style={styles.qtyButtonText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeItem(item.id)}
        >
          <Text style={styles.removeButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  if (cartItems.length === 0 && !orderCreated) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>Votre panier est vide.</Text>
        <TouchableOpacity style={styles.shopButton} onPress={() => navigation.navigate('Catalogue')}>
          <Text style={styles.shopButtonText}>Continuer mes achats</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Mon panier</Text>

      <FlatList
        data={cartItems}
        renderItem={renderCartItem}
        keyExtractor={(item) => item.id.toString()}
        scrollEnabled={false}
      />

      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Total :</Text>
        <Text style={styles.totalAmount}>{total} FCFA</Text>
      </View>

      {orderCreated ? (
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Paiement par Mobile Money</Text>
          <Text style={styles.ussdText}>Composez : {ussdCode}</Text>
          <TouchableOpacity style={styles.paidButton} onPress={handleConfirmPayment}>
            <Text style={styles.paidButtonText}>J’ai payé</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleCheckout}
          disabled={submitting}
        >
          <Text style={styles.checkoutButtonText}>
            {submitting ? 'Commande en cours...' : 'Commander'}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.clearButton} onPress={clearCart}>
        <Text style={styles.clearButtonText}>Vider le panier</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 15 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#2e7d32' },
  cartItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  itemInfo: { flex: 2 },
  itemName: { fontSize: 16, fontWeight: '500' },
  itemPrice: { fontSize: 14, color: '#2e7d32', marginTop: 4 },
  itemActions: { flexDirection: 'row', alignItems: 'center' },
  qtyButton: {
    backgroundColor: '#e0e0e0',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyButtonText: { fontSize: 18, fontWeight: 'bold' },
  itemQuantity: { marginHorizontal: 12, fontSize: 16, minWidth: 30, textAlign: 'center' },
  removeButton: { marginLeft: 8, padding: 8 },
  removeButtonText: { fontSize: 18 },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  totalLabel: { fontSize: 18, fontWeight: 'bold' },
  totalAmount: { fontSize: 20, fontWeight: 'bold', color: '#2e7d32' },
  checkoutButton: {
    backgroundColor: '#2e7d32',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  checkoutButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  clearButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  clearButtonText: { color: '#666' },
  emptyText: { fontSize: 16, color: '#666', marginBottom: 20 },
  shopButton: {
    backgroundColor: '#2e7d32',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  shopButtonText: { color: '#fff', fontWeight: 'bold' },
  paymentSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginVertical: 10,
    alignItems: 'center',
  },
  paymentTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  ussdText: { fontSize: 16, fontFamily: 'monospace', marginVertical: 10, color: '#d32f2f' },
  paidButton: {
    backgroundColor: '#ff9800',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  paidButtonText: { color: '#fff', fontWeight: 'bold' },
});