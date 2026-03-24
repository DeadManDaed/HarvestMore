//mobile/app.js 

import React from 'react';
import { View, Text } from 'react-native';
import { AuthProvider } from './contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>AuthProvider actif</Text>
      </View>
    </AuthProvider>
  );
}