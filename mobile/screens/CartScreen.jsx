// mobile/screens/CartScreen.jsx

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import BackHeader from '../components/BackHeader';

export default function CartScreen({ navigation }) {
  const { cartItems, loading, updateQuantity, removeItem, clearCart, getTotal, fetchCart } = useCart();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  // Recharger le panier à chaque fois que l'écran est affiché (focus)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchCart();
    });
    return unsubscribe;
  }, [navigation, fetchCart]);

  const total = getTotal();

const handleCheckout = async () => {
  if (cartItems.length === 0) {
    Alert.alert('Panier vide', 'Ajoutez des produits avant de commander.');
    return;
  }

  setSubmitting(true);
  try {
    // 1. Insertion de la commande
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        total: total,
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'mobile_money'
        // Pas besoin de forcer created_at/updated_at, le SQL le fait
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Transfert des items du panier vers la commande
    const itemsToInsert = cartItems.map(item => ({
      order_id: order.id,
      product_id: parseInt(item.product_id), // On s'assure que c'est bien un entier
      quantity: item.quantity,
      price: item.price,
      product_name: item.product_name,
      product_image: item.product_image
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    // 3. Navigation vers le paiement
    navigation.navigate('Payment', {
      orderId: order.id,
      totalAmount: total
    });

  } catch (error) {
    console.error('Erreur finale:', error.message);
    Alert.alert('Erreur', 'La synchronisation avec la base de données a échoué.');
  }
};

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.product_name || item.product?.name}</Text>
        <Text style={styles.itemPrice}>{item.price || item.product?.price} FCFA</Text>
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

  if (cartItems.length === 0) {
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
    <View style={{ flex: 1 }}>
      <BackHeader title="Mon panier" />
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
          <Text style={styles.totalAmount}>{total.toLocaleString()} FCFA</Text>
        </View>

        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleCheckout}
          disabled={submitting}
        >
          <Text style={styles.checkoutButtonText}>
            {submitting ? 'Commande en cours...' : '📦 Commander'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.clearButton} onPress={clearCart}>
          <Text style={styles.clearButtonText}>🗑️ Vider le panier</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
  totalAmount: { fontSize: 20, fontWeight: 'bold', color: '#f57c00' },
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
});