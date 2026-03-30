// mobile/screens/ProfileScreen.jsx Google version 
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Switch, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function ProfileScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Données
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    phone: '',
    region: '',
    department: '',
    sub_prefecture: '',
    village: '',
    allow_farmer_contact: false,
    email_notifications: true,
    push_notifications: true
  });

  const [allCrops, setAllCrops] = useState([]); // Liste totale de la DB
  const [userCropIds, setUserCropIds] = useState([]); // IDs des cultures de l'utilisateur

  const regions = ['Extrême-Nord', 'Nord', 'Adamaoua', 'Nord-Ouest', 'Ouest', 'Littoral', 'Centre', 'Sud-Ouest', 'Sud', 'Est'];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Charger le profil
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      
      // 2. Charger TOUTES les cultures (chargement unique comme tu l'as suggéré)
      const { data: crops } = await supabase.from('crops').select('id, name').order('name');
      
      // 3. Charger les cultures de l'utilisateur
      const { data: myCrops } = await supabase.from('user_crops').select('crop_id').eq('user_id', user.id);

      if (profile) {
        setFormData({
          full_name: profile.full_name || '',
          username: profile.username || '',
          phone: profile.phone || '',
          region: profile.region || '',
          department: profile.department || '',
          sub_prefecture: profile.sub_prefecture || '',
          village: profile.village || '',
          allow_farmer_contact: profile.allow_farmer_contact || false,
          email_notifications: profile.notification_preferences?.email ?? true,
          push_notifications: profile.notification_preferences?.push ?? true
        });
      }
      
      setAllCrops(crops || []);
      setUserCropIds(myCrops?.map(c => c.crop_id) || []);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCrop = (cropId) => {
    if (!editMode) return;
    setUserCropIds(prev => 
      prev.includes(cropId) ? prev.filter(id => id !== cropId) : [...prev, cropId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    
    // Updates Profil
    const profileUpdates = {
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
        push: formData.push_notifications,
      },
      updated_at: new Date()
    };

    try {
      // 1. Sauvegarde profil
      await supabase.from('profiles').update(profileUpdates).eq('id', user.id);

      // 2. Mise à jour des cultures (On supprime tout et on réinsère - méthode simple)
      await supabase.from('user_crops').delete().eq('user_id', user.id);
      
      if (userCropIds.length > 0) {
        const inserts = userCropIds.map(id => ({ user_id: user.id, crop_id: id }));
        await supabase.from('user_crops').insert(inserts);
      }

      Alert.alert('Succès', 'Profil et cultures mis à jour');
      setEditMode(false);
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setSaving(false);
    }
  };

  // ... (Garder tes fonctions renderField et styles existants)

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mon profil</Text>
        <TouchableOpacity 
          style={styles.editButton} 
          onPress={editMode ? handleSave : () => setEditMode(true)}
          disabled={saving}
        >
          <Text style={styles.editButtonText}>
            {saving ? '...' : editMode ? 'Enregistrer' : 'Modifier'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Section Infos Personnelles & Localisation (identique à ton code) */}
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mes Cultures</Text>
        <Text style={styles.helperText}>
          {editMode ? "Sélectionnez les cultures présentes dans votre exploitation :" : "Cultures enregistrées :"}
        </Text>
        
        <View style={styles.cropsGrid}>
          {allCrops.map(crop => {
            const isSelected = userCropIds.includes(crop.id);
            if (!editMode && !isSelected) return null; // Cache les non-sélectionnés hors édition

            return (
              <TouchableOpacity
                key={crop.id}
                style={[styles.cropTag, isSelected && styles.cropTagSelected]}
                onPress={() => toggleCrop(crop.id)}
              >
                <Text style={[styles.cropTagText, isSelected && styles.cropTagTextSelected]}>
                  {crop.name}
                </Text>
              </TouchableOpacity>
            );
          })}
          {!editMode && userCropIds.length === 0 && (
            <Text style={styles.emptyText}>Aucune culture renseignée.</Text>
          )}
        </View>
      </View>

      {/* Section Notifications & Visibilité (identique à ton code) */}
      <View style={{ height: 40 }} /> 
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // ... tes styles existants ...
  helperText: { fontSize: 12, color: '#666', marginBottom: 10 },
  cropsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  cropTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2e7d32',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fff'
  },
  cropTagSelected: { backgroundColor: '#2e7d32' },
  cropTagText: { color: '#2e7d32', fontSize: 13 },
  cropTagTextSelected: { color: '#fff' },
  emptyText: { fontStyle: 'italic', color: '#999' }
});
