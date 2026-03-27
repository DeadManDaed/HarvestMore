// mobile/navigation/AppNavigator.jsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import CatalogueScreen from '../screens/CatalogueScreen';
import SelectCropScreen from '../screens/SelectCropScreen';
import SelectSymptomsScreen from '../screens/SelectSymptomsScreen';
import DiagnosticResultScreen from '../screens/DiagnosticResultScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import CartScreen from '../screens/CartScreen';
import ConversationsScreen from '../screens/ConversationsScreen';
import ChatScreen from '../screens/ChatScreen';

// Dans la section authentifié :

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { session, loading, profile } = useAuth();

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Catalogue" component={CatalogueScreen} />
<Stack.Screen name="Cart" component={CartScreen} />
            <Stack.Screen name="SelectCrop" component={SelectCropScreen} />
            <Stack.Screen name="SelectSymptoms" component={SelectSymptomsScreen} />
            <Stack.Screen name="DiagnosticResult" component={DiagnosticResultScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
<Stack.Screen name="Conversations" component={ConversationsScreen} />
<Stack.Screen name="Chat" component={ChatScreen} />
            {profile?.role === 'admin' && (
              <Stack.Screen name="Admin" component={AdminDashboardScreen} />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}