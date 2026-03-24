//mobile/screens/RegisterScreen.jsx

import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Email et mot de passe requis');
      return;
    }
    setLoading(true);
    try {
      // 1. Inscription via Supabase Auth
      const { data, error: signUpError } = await signUp(email, password, {
        username,
        phone,
        full_name: fullName,
      });

      if (signUpError) throw signUpError;
      if (!data?.user) throw new Error('Échec de la création de l’utilisateur');

      const userId = data.user.id;

      // 2. Insertion manuelle dans profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          username: username || null,
          email: email,
          phone: phone || null,
          full_name: fullName || null,
          role: 'farmer',
        });

      if (profileError) throw profileError;

      Alert.alert('Succès', 'Inscription réussie ! Connectez-vous.');
      navigation.navigate('Login');
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Créer un compte</Text>
      <TextInput
        style={styles.input}
        placeholder="Nom d'utilisateur (unique)"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Téléphone (optionnel)"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Nom complet"
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title={loading ? 'Inscription...' : "S'inscrire"} onPress={handleRegister} disabled={loading} />
      <Button title="Déjà un compte ? Se connecter" onPress={() => navigation.navigate('Login')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 15, borderRadius: 5 },
});