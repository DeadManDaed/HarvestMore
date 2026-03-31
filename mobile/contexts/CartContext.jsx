// mobile/contexts/CartContext.jsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Charger le panier depuis Supabase au démarrage
  useEffect(() => {
    if (user) {
      fetchCart();
    } else {
      setCartItems([]);
      setLoading(false);
    }
  }, [user]);

  const fetchCart = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('cart_items')
      .select('*, product:products(*)')
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Erreur fetchCart:', error);
    } else {
      setCartItems(data || []);
    }
    setLoading(false);
  };

  const addToCart = async (productId, quantity = 1) => {
    if (!user) return;

    // 1. SÉCURITÉ : Conversion forcée en entier pour éviter l'erreur de type ou les doublons
    const numericProductId = parseInt(productId, 10);

    // 2. Recherche si l'article existe déjà (comparaison stricte de nombres)
    const existingItem = cartItems.find(item => item.product_id === numericProductId);

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', existingItem.id);
      
      if (error) console.error('Erreur update quantité:', error);
      else fetchCart();
    } else {
      // 3. Nouveau produit : insertion avec l'ID typé 'integer'
      const { error } = await supabase
        .from('cart_items')
        .insert({ 
          user_id: user.id, 
          product_id: numericProductId, 
          quantity: quantity 
        });
      
      if (error) console.error('Erreur insert cart:', error);
      else fetchCart();
    }
  };

  const updateQuantity = async (itemId, newQuantity) => {
    if (!user) return;
    if (newQuantity <= 0) {
      await removeItem(itemId);
    } else {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId);
      
      if (error) console.error('Erreur updateQuantity:', error);
      else fetchCart();
    }
  };

  const removeItem = async (itemId) => {
    if (!user) return;
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);
    
    if (error) console.error('Erreur removeItem:', error);
    else fetchCart();
  };

  const clearCart = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id);
    
    if (error) console.error('Erreur clearCart:', error);
    else {
      setCartItems([]); // On vide l'état local immédiatement pour la fluidité UI
    }
  };

  const getTotal = () => {
    // Sécurité au cas où le produit n'est pas encore chargé dans le join
    return cartItems.reduce((total, item) => {
      const price = item.product?.price || 0;
      return total + (price * item.quantity);
    }, 0);
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      loading,
      addToCart,
      updateQuantity,
      removeItem,
      clearCart,
      getTotal,
      fetchCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
