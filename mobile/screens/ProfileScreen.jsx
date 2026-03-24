//mobile/screens/ProfileScreen.jsx

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Switch, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function ProfileScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // Données de formulaire
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    phone: '',
    region: '',
    department: '',
    sub_prefecture: '',
    village: '',
    email_notifications: true,
    push_notifications: true
  });

  // Options pour les sélecteurs (à remplacer par des données dynamiques plus tard)
  const regions = ['Extrême-Nord', 'Nord', 'Adamaoua', 'Nord-Ouest', 'Ouest', 'Littoral', 'Centre', 'Sud-Ouest', 'Sud', 'Est'];
  const departments = {
    'Centre': ['Mfoundi', 'Mefou', 'Nyong-et-Kellé', 'Lekié', 'Haute-Sanaga'],
    'Littoral': ['Wouri', 'Nkam', 'Moungo', 'Sanaga-Maritime'],
    // Ajoutez les autres régions...
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
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
        email_notifications: data.notification_preferences?.email ?? true,
        push_notifications: data.notification_preferences?.push ?? true
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const updates = {
      full_name: formData.full_name,
      username: formData.username,
      phone: formData.phone,
      region: formData.region,
      department: formData.department,
      sub_prefecture: formData.sub_prefecture,
      village: formData.village,
      notification_preferences: {
        email: formData.email_notifications,
        push: formData.push_notifications,
        sms: false
      },
      updated_at: new Date()
    };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      Alert.alert('Succès', 'Profil mis à jour');
      setEditMode(false);
      fetchProfile();
    }
    setSaving(false);
  };

  const renderField = (label, value, field, type = 'text') => {
    if (!editMode) {
      return (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value || 'Non renseigné'}</Text>
        </View>
      );
    }
    
    if (type === 'select' && field === 'region') {
      return (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{label}</Text>
          <View style={styles.selectContainer}>
            {regions.map(region => (
              <TouchableOpacity
                key={region}
                style={[styles.selectOption, formData.region === region && styles.selectOptionActive]}
                onPress={() => {
                  setFormData({ ...formData, region, department: '', sub_prefecture: '' });
                }}
              >
                <Text style={formData.region === region ? styles.selectOptionTextActive : styles.selectOptionText}>
                  {region}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }
    
    if (type === 'select' && field === 'department' && formData.region) {
      const depts = departments[formData.region] || [];
      return (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{label}</Text>
          <View style={styles.selectContainer}>
            {depts.map(dept => (
              <TouchableOpacity
                key={dept}
                style={[styles.selectOption, formData.department === dept && styles.selectOptionActive]}
                onPress={() => setFormData({ ...formData, department: dept })}
              >
                <Text style={formData.department === dept ? styles.selectOptionTextActive : styles.selectOptionText}>
                  {dept}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }
    
    return (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TextInput
          style={styles.input}
          value={formData[field]}
          onChangeText={(text) => setFormData({ ...formData, [field]: text })}
          placeholder={`Saisir ${label.toLowerCase()}`}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mon profil</Text>
        {!editMode ? (
          <TouchableOpacity style={styles.editButton} onPress={() => setEditMode(true)}>
            <Text style={styles.editButtonText}>Modifier</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setEditMode(false)}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations personnelles</Text>
        {renderField('Nom complet', formData.full_name, 'full_name')}
        {renderField('Nom d\'utilisateur', formData.username, 'username')}
        {renderField('Téléphone', formData.phone, 'phone')}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Localisation</Text>
        {renderField('Région', formData.region, 'region', 'select')}
        {formData.region && renderField('Département', formData.department, 'department', 'select')}
        {renderField('Arrondissement', formData.sub_prefecture, 'sub_prefecture')}
        {renderField('Village / Quartier', formData.village, 'village')}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Notifications par email</Text>
          <Switch
            value={formData.email_notifications}
            onValueChange={(val) => setFormData({ ...formData, email_notifications: val })}
            disabled={!editMode}
            trackColor={{ false: '#767577', true: '#2e7d32' }}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Notifications push</Text>
          <Switch
            value={formData.push_notifications}
            onValueChange={(val) => setFormData({ ...formData, push_notifications: val })}
            disabled={!editMode}
            trackColor={{ false: '#767577', true: '#2e7d32' }}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2e7d32',
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  editButton: { backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 5 },
  editButtonText: { color: '#2e7d32', fontWeight: 'bold' },
  actionButtons: { flexDirection: 'row' },
  cancelButton: { backgroundColor: '#d32f2f', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 5, marginRight: 10 },
  cancelButtonText: { color: '#fff' },
  saveButton: { backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 5 },
  saveButtonText: { color: '#2e7d32', fontWeight: 'bold' },
  section: { backgroundColor: '#fff', marginTop: 10, padding: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#2e7d32' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  infoLabel: { fontSize: 14, color: '#666' },
  infoValue: { fontSize: 14, color: '#333', fontWeight: '500' },
  inputGroup: { marginBottom: 15 },
  inputLabel: { fontSize: 14, color: '#666', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: '#fff' },
  selectContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
  selectOption: { backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  selectOptionActive: { backgroundColor: '#2e7d32' },
  selectOptionText: { color: '#333', fontSize: 12 },
  selectOptionTextActive: { color: '#fff', fontSize: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  switchLabel: { fontSize: 14, color: '#333' }
});