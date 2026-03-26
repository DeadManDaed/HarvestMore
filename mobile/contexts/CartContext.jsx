//mobile/contexts/CartContext.jsx

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
    setLoading(true);
    const { data, error } = await supabase
      .from('cart_items')
      .select('*, product:products(*)')
      .eq('user_id', user.id);
    if (error) console.error(error);
    else setCartItems(data || []);
    setLoading(false);
  };

  const addToCart = async (productId, quantity = 1) => {
    if (!user) return;

    // Vérifier si le produit est déjà dans le panier
    const existingItem = cartItems.find(item => item.product_id === productId);
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', existingItem.id);
      if (error) console.error(error);
      else fetchCart();
    } else {
      const { error } = await supabase
        .from('cart_items')
        .insert({ user_id: user.id, product_id: productId, quantity });
      if (error) console.error(error);
      else fetchCart();
    }
  };

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      await removeItem(itemId);
    } else {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId);
      if (error) console.error(error);
      else fetchCart();
    }
  };

  const removeItem = async (itemId) => {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);
    if (error) console.error(error);
    else fetchCart();
  };

  const clearCart = async () => {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id);
    if (error) console.error(error);
    else fetchCart();
  };

  const getTotal = () => {
    return cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
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