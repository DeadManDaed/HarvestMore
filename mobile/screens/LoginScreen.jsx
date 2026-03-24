//mobile/screens/LoginScreen.jsx

import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { loginWithIdentifier } from '../lib/api';

export default function LoginScreen({ navigation }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    setLoading(true);
    try {
      if (identifier.includes('@')) {
        // Connexion par email directe
        await signIn(identifier, password);
      } else {
        // Connexion par username ou téléphone via Edge Function
        const { session } = await loginWithIdentifier(identifier, password);
        if (session) {
          // On définit la session dans le client Supabase
          await supabase.auth.setSession(session);
        } else {
          throw new Error('Session non reçue');
        }
      }
      // La navigation se fera automatiquement grâce à l'observateur d'authentification
    } catch (error) {
      Alert.alert('Erreur de connexion', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Harvest More</Text>
      <TextInput
        style={styles.input}
        placeholder="Email, nom d'utilisateur ou téléphone"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title={loading ? 'Connexion...' : 'Se connecter'} onPress={handleLogin} disabled={loading} />
      <Button title="Créer un compte" onPress={() => navigation.navigate('Register')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 15, borderRadius: 5 },
});