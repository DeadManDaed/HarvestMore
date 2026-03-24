//mobile/navigation/AppNavigator.jsx 


import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';

const Stack = createStackNavigator(); 

export default function AppNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return null; // ou un écran de chargement
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          // Non authentifié
          <>
{
            <Stack.Screen name="Login" component={LoginScreen} />
          {/*  <Stack.Screen name="Register" component={RegisterScreen} /> */}
          </>
        ) : (
          // Authentifié
       {/*   <Stack.Screen name="Home" component={HomeScreen} /> */}
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
