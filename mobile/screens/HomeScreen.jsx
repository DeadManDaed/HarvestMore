// mobile/screens/HomeScreen.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const tips = [
  "🌱 Arrosez vos cultures tôt le matin pour réduire l'évaporation.",
  "🐞 Introduisez des insectes auxiliaires pour lutter contre les ravageurs.",
  "📅 Faites une rotation des cultures pour préserver la fertilité du sol.",
  "🧪 Testez le pH de votre sol avant d'appliquer des engrais.",
  "💧 Utilisez le paillage pour conserver l'humidité.",
  "🌾 Récoltez le maïs lorsque les grains sont bien durs.",
  "🍌 Les bananiers aiment les sols riches en potassium.",
  "☕ Le cacao a besoin d'ombre ; associez-le à des arbres forestiers.",
];

export default function HomeScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [currentTip, setCurrentTip] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * tips.length);
      setCurrentTip(tips[randomIndex]);
    }, 10000);
    setCurrentTip(tips[Math.floor(Math.random() * tips.length)]);
    return () => clearInterval(interval);
  }, []);

  const handleDiagnostic = () => {
    navigation.navigate('SelectCrop');
  };  

  const handleCatalogue = () => {
    navigation.navigate('Catalogue');
  };

  const handleProfile = () => {
    navigation.navigate('Profile');
  };

  const handleCart = () => {
    navigation.navigate('Cart');
  };

  const handleMessaging = () => {
    navigation.navigate('Conversations');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Bonjour, {user?.email?.split('@')[0] || 'Agriculteur'} !</Text>
        <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>💡 Le saviez-vous ?</Text>
        <Text style={styles.tipsText}>{currentTip}</Text>
      </View>

      <View style={styles.dashBoard}>
        <TouchableOpacity style={styles.dashTile} onPress={handleDiagnostic}>
          <Text style={styles.tileIcon}>🔍</Text>
          <Text style={styles.tileLabel}>Diagnostic</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dashTile} onPress={handleCatalogue}>
          <Text style={styles.tileIcon}>🛒</Text>
          <Text style={styles.tileLabel}>Catalogue</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dashTile} onPress={handleCart}>
          <Text style={styles.tileIcon}>🛍️</Text>
          <Text style={styles.tileLabel}>Panier</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dashTile} onPress={handleMessaging}>
          <Text style={styles.tileIcon}>💬</Text>
          <Text style={styles.tileLabel}>Messages</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dashTile} onPress={handleProfile}>
          <Text style={styles.tileIcon}>👤</Text>
          <Text style={styles.tileLabel}>Profil</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2e7d32',
  },
  welcome: { fontSize: 18, color: '#fff', fontWeight: 'bold' },
  logoutButton: { backgroundColor: '#d32f2f', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 5 },
  logoutText: { color: '#fff' },
  tipsCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  tipsTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  tipsText: { fontSize: 14, color: '#333' },
  dashBoard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginHorizontal: 10,
  },
  dashTile: {
    width: '40%',
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 20,
    marginVertical: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tileIcon: { fontSize: 32, marginBottom: 8 },
  tileLabel: { fontSize: 16, fontWeight: '500' },
});