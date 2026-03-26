//mobile/app.js 

import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import { CartProvider } from './contexts/CartContext';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
    {*    <StatusBar style="auto" />    *}
        <AppNavigator />
      </CartProvider>
    </AuthProvider>
  );
}
