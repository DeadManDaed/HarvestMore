// mobile/navigation/AppNavigator.jsx
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

// ═══════════════════════════════════════════════════════════════════════════
// IMPORTS SCREENS PRINCIPAUX
// ═══════════════════════════════════════════════════════════════════════════
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import ContactsScreen from '../screens/ContactsScreen';
import ConversationsScreen from '../screens/ConversationsScreen';
import DiagnosticScreen from '../screens/DiagnosticScreen';
import DiagnosticResultScreen from '../screens/DiagnosticResultScreen';
import SelectCropScreen from '../screens/SelectCropScreen';
import SelectSymptomsScreen from '../screens/SelectSymptomsScreen';
import MyCropsScreen from './screens/MyCropsScreen';
import CropDetailScreen from './screens/CropDetailScreen';

// ═══════════════════════════════════════════════════════════════════════════
// IMPORTS SCREENS ADMIN
// ═══════════════════════════════════════════════════════════════════════════
import AdminDashboard from '../screens/admin/AdminDashboard';
import AssignMission from '../screens/admin/AssignMission';
import DiagnosticsList from '../screens/admin/DiagnosticsList';
import OrdersList from '../screens/admin/OrdersList';
import UserManagement from '../screens/admin/UserManagement';

// ═══════════════════════════════════════════════════════════════════════════
// TAB NAVIGATOR
// ═══════════════════════════════════════════════════════════════════════════
import TabNavigator from './TabNavigator';

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
          // ─────────────────────────────────────────────────────────────────
          // SCREENS NON AUTHENTIFIÉS
          // ─────────────────────────────────────────────────────────────────
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          // ─────────────────────────────────────────────────────────────────
          // SCREENS AUTHENTIFIÉS
          // ─────────────────────────────────────────────────────────────────
          <>
            {/* Navigation principale avec Tabs */}
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            
            {/* ───────────────────────────────────────────────────────────── */}
            {/* SCREENS PRINCIPAUX */}
            {/* ───────────────────────────────────────────────────────────── */}
            <Stack.Screen 
              name="Home" 
              component={HomeScreen}
              options={{ title: 'Accueil' }}
            />
            
            <Stack.Screen 
              name="Profile" 
              component={ProfileScreen}
              options={{ title: 'Profil' }}
            />
            
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen}
              options={{ title: 'Discussion' }}
            />
            
            <Stack.Screen 
              name="Contacts" 
              component={ContactsScreen}
              options={{ title: 'Contacts' }}
            />
            
            <Stack.Screen 
              name="Conversations" 
              component={ConversationsScreen}
              options={{ title: 'Conversations' }}
            />
            
            {/* ───────────────────────────────────────────────────────────── */}
            {/* DIAGNOSTIC WORKFLOW */}
            {/* ───────────────────────────────────────────────────────────── */}
            <Stack.Screen 
              name="Diagnostic" 
              component={DiagnosticScreen}
              options={{ title: 'Diagnostic' }}
            />
            
            <Stack.Screen 
              name="SelectCrop" 
              component={SelectCropScreen}
              options={{ title: 'Sélectionner Culture' }}
            />
            
            <Stack.Screen 
              name="SelectSymptoms" 
              component={SelectSymptomsScreen}
              options={{ title: 'Sélectionner Symptômes' }}
            />
            
            <Stack.Screen 
              name="DiagnosticResult" 
              component={DiagnosticResultScreen}
              options={{ title: 'Résultat Diagnostic' }}
            />
<Stack.Screen name="SelectCrop" component={SelectCropScreen} options={{ title: 'Choisir une culture' }} />
<Stack.Screen name="MyCrops" component={MyCropsScreen} options={{ title: 'Mes Plantations' }} />
<Stack.Screen name="CropDetail" component={CropDetailScreen} options={{ title: 'Détail du suivi' }} />
            
            {/* ───────────────────────────────────────────────────────────── */}
            {/* ADMIN SCREENS */}
            {/* ───────────────────────────────────────────────────────────── */}
            <Stack.Screen 
              name="AdminDashboard" 
              component={AdminDashboard}
              options={{ title: 'Tableau de Bord Admin' }}
            />
            
            <Stack.Screen 
              name="UserManagement" 
              component={UserManagement}
              options={{ title: 'Gestion Utilisateurs' }}
            />
            
            <Stack.Screen 
              name="DiagnosticsList" 
              component={DiagnosticsList}
              options={{ title: 'Liste Diagnostics' }}
            />
            
            <Stack.Screen 
              name="OrdersList" 
              component={OrdersList}
              options={{ title: 'Liste Commandes' }}
            />
            
            <Stack.Screen 
              name="AssignMission" 
              component={AssignMission}
              options={{ title: 'Assigner Mission' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
