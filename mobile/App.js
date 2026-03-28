//mobile/app.js 

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { ChatProvider } from './contexts/ChatContext';
import { NotificationProvider } from './contexts/NotificationContext';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ChatProvider>
          <NotificationProvider>
         {/*   <StatusBar style="auto" />.  */}
            <AppNavigator />
          </NotificationProvider>
        </ChatProvider>
      </CartProvider>
    </AuthProvider>
  );
}