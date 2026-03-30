// mobile/screens/ProfileScreen.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Switch, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function ProfileScreen({ navigation }) {
  const { user, profile, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '', username: '', phone: '', region: '',
    department: '', sub_prefecture: '', village: '',
    allow_farmer_contact: false, email_notifications: true, push_notifications: true,
    // Champs spécifiques selon rôle
    technician_region: '', assigned_store_id: '', bio: '', years_experience: ''
  });

  const regions = ['Extrême-Nord', 'Nord', 'Adamaoua', 'Nord-Ouest', 'Ouest', 'Littoral', 'Centre', 'Sud-Ouest', 'Sud', 'Est'];
  const departments = {
    'Centre': ['Mfoundi', 'Mefou', 'Nyong-et-Kellé', 'Lekié', 'Haute-Sanaga'],
    'Littoral': ['Wouri', 'Nkam', 'Moungo', 'Sanaga-Maritime'],
    'Ouest': ['Bamboutos', 'Haut-Nkam', 'Hauts-Plateaux', 'Koung-Khi', 'Menoua', 'Mifi', 'Ndé', 'Noun'],
    'Nord-Ouest': ['Boyo', 'Bui', 'Donga-Mantung', 'Menchum', 'Mezam', 'Momo', 'Ngo-Ketunjia'],
    'Adamaoua': ['Djérem', 'Faro-et-Déo', 'Mayo-Banyo', 'Mbéré', 'Vina'],
    'Nord': ['Bénoué', 'Faro', 'Mayo-Louti', 'Mayo-Rey'],
    'Extrême-Nord': ['Diamaré', 'Logone-et-Chari', 'Mayo-Danay', 'Mayo-Kani', 'Mayo-Sava', 'Mayo-Tsanaga'],
    'Sud': ['Dja-et-Lobo', 'Mvila', 'Océan', 'Vallée-du-Ntem'],
    'Est': ['Boumba-et-Ngoko', 'Haut-Nyong', 'Kadey', 'Lom-et-Djérem']
  };

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error) console.error(error);
    else {
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
        push_notifications: data.notification_preferences?.push ?? true,
        technician_region: data.technician_region || '',
        assigned_store_id: data.assigned_store_id ? String(data.assigned_store_id) : '',
        bio: data.bio || '',
        years_experience: data.years_experience ? String(data.years_experience) : ''
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
      allow_farmer_contact: formData.allow_farmer_contact,
      notification_preferences: { 
        email: formData.email_notifications, 
        push: formData.push_notifications 
      },
      updated_at: new Date()
    };

    // Ajouter les champs spécifiques selon le rôle
    if (role === 'technician') {
      updates.technician_region = formData.technician_region;
      updates.bio = formData.bio;
      updates.years_experience = parseInt(formData.years_experience) || null;
    }
    if (role === 'store_manager') {
      updates.assigned_store_id = parseInt(formData.assigned_store_id) || null;
    }
    if (role === 'sales') {
      updates.bio = formData.bio;
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    if (error) Alert.alert('Erreur', error.message);
    else {
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
                onPress={() => setFormData({ ...formData, region, department: '', sub_prefecture: '' })}
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
          value={String(formData[field])}
          onChangeText={(text) => setFormData({ ...formData, [field]: text })}
          placeholder={`Saisir ${label.toLowerCase()}`}
        />
      </View>
    );
  };

  const renderSwitchRow = (label, field) => (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch
        value={formData[field]}
        onValueChange={(val) => setFormData({ ...formData, [field]: val })}
        disabled={!editMode}
        trackColor={{ false: '#767577', true: '#2e7d32' }}
      />
    </View>
  );

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
        <View style={styles.actionButtons}>
          {editMode ? (
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? 'Enregistrement...' : 'Sauver'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.editButton} onPress={() => setEditMode(true)}>
              <Text style={styles.editButtonText}>Modifier</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Section Mes Plantations (visible pour tous) */}
      <TouchableOpacity 
        style={styles.manageCropsCard} 
        onPress={() => navigation.navigate('MyCrops')}
      >
        <View>
          <Text style={styles.manageCropsTitle}>🌾 Mes Plantations</Text>
          <Text style={styles.manageCropsSub}>Gérer superficies et techniques culturales</Text>
        </View>
        <Text style={styles.arrow}>→</Text>
      </TouchableOpacity>

      {/* Section Informations personnelles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations personnelles</Text>
        {renderField('Nom complet', formData.full_name, 'full_name')}
        {renderField('Nom d\'utilisateur', formData.username, 'username')}
        {renderField('Téléphone', formData.phone, 'phone')}
      </View>

      {/* Section Localisation (visible pour tous) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Localisation</Text>
        {renderField('Région', formData.region, 'region', 'select')}
        {formData.region && renderField('Département', formData.department, 'department', 'select')}
        {renderField('Arrondissement', formData.sub_prefecture, 'sub_prefecture')}
        {renderField('Village / Quartier', formData.village, 'village')}
      </View>

      {/* Section spécifique TECHNICIEN */}
      {role === 'technician' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👨‍🌾 Informations professionnelles</Text>
          {renderField('Région d\'affectation', formData.technician_region, 'technician_region')}
          {renderField('Années d\'expérience', formData.years_experience, 'years_experience')}
          {renderField('Bio / Présentation', formData.bio, 'bio')}
        </View>
      )}

      {/* Section spécifique COMMERCIAL */}
      {role === 'sales' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Informations commerciales</Text>
          {renderField('Bio / Présentation', formData.bio, 'bio')}
        </View>
      )}

      {/* Section spécifique RESPONSABLE MAGASIN */}
      {role === 'store_manager' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏪 Informations magasin</Text>
          {renderField('ID du magasin', formData.assigned_store_id, 'assigned_store_id')}
        </View>
      )}

      {/* Section Notifications (visible pour tous) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        {renderSwitchRow('Notifications par email', 'email_notifications')}
        {renderSwitchRow('Notifications push', 'push_notifications')}
      </View>

      {/* Section Visibilité (visible uniquement pour les farmers) */}
      {role === 'farmer' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visibilité</Text>
          {renderSwitchRow('Permettre à d\'autres agriculteurs de me contacter', 'allow_farmer_contact')}
          <Text style={styles.helperText}>
            Activez cette option pour échanger avec d'autres agriculteurs de votre région.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#2e7d32' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  actionButtons: { flexDirection: 'row' },
  editButton: { backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 5 },
  editButtonText: { color: '#2e7d32', fontWeight: 'bold' },
  saveButton: { backgroundColor: '#ff9800', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 5 },
  saveButtonText: { color: '#fff', fontWeight: 'bold' },
  manageCropsCard: { backgroundColor: '#e8f5e9', margin: 15, padding: 20, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 5, borderLeftColor: '#2e7d32' },
  manageCropsTitle: { fontSize: 18, fontWeight: 'bold', color: '#1b5e20' },
  manageCropsSub: { fontSize: 12, color: '#4caf50' },
  arrow: { fontSize: 24, color: '#2e7d32' },
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
  switchLabel: { fontSize: 14, color: '#333' },
  helperText: { fontSize: 11, color: '#999', marginTop: 8, fontStyle: 'italic' }
});