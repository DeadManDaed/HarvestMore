//mobile/app.js 

import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import { CartProvider } from './contexts/CartContext';
import { ChatProvider } from './contexts/ChatContext';

export default function App() {
  return (

// Dans le return :
<AuthProvider>
  <CartProvider>
    <ChatProvider>
     {/* <StatusBar style="auto" />.  */}
      <AppNavigator />
    </ChatProvider>
  </CartProvider>
</AuthProvider>
  );
}
