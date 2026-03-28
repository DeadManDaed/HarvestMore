// mobile/navigation/AppNavigator.jsx
/*
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
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
import ContactsScreen from '../screens/ContactsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { session, loading, profile } = useAuth();
  const { setNavigationRef } = useNotifications();
  const navigationRef = useRef();

  useEffect(() => {
    if (navigationRef.current) {
      setNavigationRef(navigationRef.current);
    }
  }, [navigationRef.current, setNavigationRef]);

  if (loading) return null;

  return (
    <NavigationContainer ref={navigationRef}>
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
            <Stack.Screen name="Contacts" component={ContactsScreen} />

            {profile?.role === 'admin' && (
              <Stack.Screen name="Admin" component={AdminDashboardScreen} />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
*/

// navigation/AppNavigator.jsx
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import TabNavigator from './TabNavigator';
import SelectCropScreen from '../screens/SelectCropScreen';
import SelectSymptomsScreen from '../screens/SelectSymptomsScreen';
import DiagnosticResultScreen from '../screens/DiagnosticResultScreen';
import ChatScreen from '../screens/ChatScreen';
// navigation/AppNavigator.jsx
// Ajouter les imports pour les écrans admin
import UserManagement from '../screens/admin/UserManagement';
import DiagnosticsList from '../screens/admin/DiagnosticsList';
import OrdersList from '../screens/admin/OrdersList';
import MessagesAudit from '../screens/admin/MessagesAudit';
import AssignMission from '../screens/admin/AssignMission';
import OrdersList from '../screens/admin/OrdersList';


const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { session, loading } = useAuth();
  const { setNavigationRef } = useNotifications();
  const navigationRef = useRef();

  useEffect(() => {
    if (navigationRef.current) {
      setNavigationRef(navigationRef.current);
    }
  }, [navigationRef.current, setNavigationRef]);

  if (loading) return null;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="UserManagement" component={UserManagement} />
<Stack.Screen name="DiagnosticsList" component={DiagnosticsList} />
<Stack.Screen name="OrdersList" component={OrdersList} />
<Stack.Screen name="MessagesAudit" component={MessagesAudit} />
<Stack.Screen name="AssignMission" component={AssignMission} />
            <Stack.Screen name="SelectCrop" component={SelectCropScreen} />
            <Stack.Screen name="SelectSymptoms" component={SelectSymptomsScreen} />
            <Stack.Screen name="DiagnosticResult" component={DiagnosticResultScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="OrdersList" component={OrdersList} />

            
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}