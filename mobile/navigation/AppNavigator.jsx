// mobile/navigation/AppNavigator.jsx
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

// Ajouter les imports pour les écrans admin
import UserManagement from '../screens/admin/UserManagement';
import DiagnosticsList from '../screens/admin/DiagnosticsList';
import OrdersList from '../screens/admin/OrdersList';
{/*.   import MessagesAudit from '../screens/admin/MessagesAudit';   */}
import AssignMission from '../screens/admin/AssignMission';

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
{/*    <Stack.Screen name="MessagesAudit" component={MessagesAudit} />.   */}
<Stack.Screen name="AssignMission" component={AssignMission} />
            <Stack.Screen name="SelectCrop" component={SelectCropScreen} />
            <Stack.Screen name="SelectSymptoms" component={SelectSymptomsScreen} />
            <Stack.Screen name="DiagnosticResult" component={DiagnosticResultScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="OrdersList" component={OrdersList} />
            <Stack.Screen name="AssignMission" component={AssignMission} />
            <Stack.Screen name="DiagnosticsList" component={DiagnosticsList} />


            
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}