// mobile/navigation/TabNavigator.jsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';

// Écrans communs
import HomeScreen from '../screens/HomeScreen';
import CatalogueScreen from '../screens/CatalogueScreen';
import CartScreen from '../screens/CartScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ConversationsScreen from '../screens/ConversationsScreen';
import ContactsScreen from '../screens/ContactsScreen';

// Écrans spécifiques aux rôles
{/*
import TechnicianDashboard from '../screens/technician/TechnicianDashboard';
*/}
import AdminDashboard from '../screens/admin/AdminDashboard';
{/*
import StoreManagerDashboard from '../screens/store/StoreManagerDashboard';
import SalesDashboard from '../screens/sales/SalesDashboard';
*/}
const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { profile } = useAuth();
  const role = profile?.role || 'farmer';

  // Définition des onglets selon le rôle
  const getTabsByRole = () => {
    const commonTabs = [
      { name: 'Accueil', component: HomeScreen, icon: 'home' },
      { name: 'Catalogue', component: CatalogueScreen, icon: 'shopping-bag' },
      { name: 'Panier', component: CartScreen, icon: 'shopping-cart' },
      { name: 'Messagerie', component: ConversationsScreen, icon: 'chat' },
      { name: 'Contacts', component: ContactsScreen, icon: 'contacts' },
      { name: 'Profil', component: ProfileScreen, icon: 'person' }
    ];

    const roleSpecificTabs = {
      farmer: [],
    /*  technician: [
        { name: 'Diagnostics', component: TechnicianDashboard, icon: 'medical-services' }
      ],
      sales: [
        { name: 'Clients', component: SalesDashboard, icon: 'people' }
      ],
      store_manager: [
        { name: 'Commandes', component: StoreManagerDashboard, icon: 'inventory' }
      ],    */
      admin: [
        { name: 'Admin', component: AdminDashboard, icon: 'admin-panel-settings' }
      ]
    };

    return [...commonTabs, ...(roleSpecificTabs[role] || [])];
  };

  const tabs = getTabsByRole();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = tabs.find(tab => tab.name === route.name)?.icon || 'circle';
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2e7d32',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      {tabs.map(tab => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{ title: tab.name }}
        />
      ))}
    </Tab.Navigator>
  );
}