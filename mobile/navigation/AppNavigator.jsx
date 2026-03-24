//mobile/navigation/AppNavigator.jsx 

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
// import DiagnosticScreen from '../screens/DiagnosticScreen'; // si vous l'avez créé
// import ProfileScreen from '../screens/ProfileScreen'; // si vous l'avez créé

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { session, loading } = useAuth();

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
            <Stack.Screen name="SelectCrop" component={SelectCropScreen} />
            <Stack.Screen name="SelectSymptoms" component={SelectSymptomsScreen} />
            {/* Décommentez si vous avez créé ces écrans */}
            {/* <Stack.Screen name="Diagnostic" component={DiagnosticScreen} /> */}
            {/* <Stack.Screen name="Profile" component={ProfileScreen} /> */}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}