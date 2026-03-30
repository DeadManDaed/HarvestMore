// mobile/screens/ProfileScreen.jsx Google version 

 import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Switch, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function ProfileScreen({ navigation }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '', username: '', phone: '', region: '',
    department: '', sub_prefecture: '', village: '',
    allow_farmer_contact: false, email_notifications: true, push_notifications: true
  });

  const regions = ['Extrême-Nord', 'Nord', 'Adamaoua', 'Nord-Ouest', 'Ouest', 'Littoral', 'Centre', 'Sud-Ouest', 'Sud', 'Est'];
  const departments = {
    'Centre': ['Mfoundi', 'Mefou', 'Nyong-et-Kellé', 'Lekié', 'Haute-Sanaga'],
    'Littoral': ['Wouri', 'Nkam', 'Moungo', 'Sanaga-Maritime'],
    // ... tes autres départements
  };

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error) console.error(error);
    else {
      setProfile(data);
      setFormData({
        full_name: data.full_name || '',
        username: data.username || '',
        phone: data.phone || '',
        region: data.region || '',
        department: data.department || '',
        sub_prefecture: data.sub_prefecture || '',
        village: data.village || '',
        allow_farmer_contact: data.allow_farmer_contact || false,
        email_notifications: data.notification_preferences?.email ?? true,
        push_notifications: data.notification_preferences?.push ?? true
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const updates = {
      ...formData,
      notification_preferences: { email: formData.email_notifications, push: formData.push_notifications },
      updated_at: new Date()
    };
    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    if (error) Alert.alert('Erreur', error.message);
    else {
      Alert.alert('Succès', 'Profil mis à jour');
      setEditMode(false);
      fetchProfile();
    }
    setSaving(false);
  };

  // Ton rendu de champ original
  const renderField = (label, value, field, type = 'text') => {
    if (!editMode) return (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Non renseigné'}</Text>
      </View>
    );
    // ... logique des Selects Région/Département inchangée ...
    return (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TextInput style={styles.input} value={String(formData[field])} onChangeText={(text) => setFormData({ ...formData, [field]: text })} />
      </View>
    );
  };

  if (loading) return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#2e7d32" /></View>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mon profil</Text>
        <View style={styles.actionButtons}>
          {editMode ? (
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}><Text style={styles.saveButtonText}>Sauver</Text></TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.editButton} onPress={() => setEditMode(true)}><Text style={styles.editButtonText}>Modifier</Text></TouchableOpacity>
          )}
        </View>
      </View>

      {/* NOUVEAU : Accès rapide aux cultures */}
      <TouchableOpacity 
        style={styles.manageCropsCard} 
        onPress={() => navigation.navigate('MyCrops')}
      >
        <View>
          <Text style={styles.manageCropsTitle}>Mes Plantations</Text>
          <Text style={styles.manageCropsSub}>Gérer superficies et techniques</Text>
        </View>
        <Text style={styles.arrow}>→</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Localisation & Identité</Text>
        {renderField('Nom complet', formData.full_name, 'full_name')}
        {renderField('Région', formData.region, 'region', 'select')}
        {renderField('Village', formData.village, 'village')}
      </View>
      
      {/* ... Reste de tes sections Switch (Notifications, Visibilité) ... */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#2e7d32' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  manageCropsCard: { backgroundColor: '#e8f5e9', margin: 15, padding: 20, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 5, borderLeftColor: '#2e7d32' },
  manageCropsTitle: { fontSize: 18, fontWeight: 'bold', color: '#1b5e20' },
  manageCropsSub: { fontSize: 12, color: '#4caf50' },
  arrow: { fontSize: 24, color: '#2e7d32' },
  section: { backgroundColor: '#fff', marginTop: 10, padding: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32', marginBottom: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  infoLabel: { color: '#666' },
  infoValue: { fontWeight: 'bold' },
  editButton: { backgroundColor: '#fff', padding: 8, borderRadius: 5 },
  editButtonText: { color: '#2e7d32' },
  saveButton: { backgroundColor: '#ff9800', padding: 8, borderRadius: 5 },
  saveButtonText: { color: '#fff' }
});
