// mobile/screens/AddInterventionScreen.jsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Modal, FlatList
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import BackHeader from '../components/BackHeader';
import { MaterialIcons } from '@expo/vector-icons';

const INTERVENTION_TYPES = [
  { id: 'fertilisation', label: '🌱 Fertilisation', icon: 'grass' },
  { id: 'irrigation', label: '💧 Irrigation', icon: 'water-drop' },
  { id: 'pest_control', label: '🐛 Traitement phytosanitaire', icon: 'bug-report' },
  { id: 'weeding', label: '🌿 Désherbage', icon: 'agriculture' },
  { id: 'harvest', label: '🌾 Récolte', icon: 'harvest' },
  { id: 'observation', label: '🔍 Observation', icon: 'visibility' },
  { id: 'other', label: '📝 Autre', icon: 'notes' }
];

export default function AddInterventionScreen({ route, navigation }) {
  const { plantationId, plantationName } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);

  const [formData, setFormData] = useState({
    type: 'fertilisation',
    date: new Date().toISOString().split('T')[0],
    description: '',
    quantity: '',
    unit: 'kg',
    cost: '',
    notes: '',
    product_ids: []
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, category')
      .order('name');
    if (!error) setProducts(data || []);
  };

  const addProduct = (product) => {
    if (!selectedProducts.find(p => p.id === product.id)) {
      setSelectedProducts([...selectedProducts, { ...product, quantity: 1 }]);
    }
  };

  const removeProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
  };

  const updateProductQuantity = (productId, quantity) => {
    setSelectedProducts(selectedProducts.map(p =>
      p.id === productId ? { ...p, quantity: Math.max(1, parseInt(quantity) || 1) } : p
    ));
  };

  const handleSubmit = async () => {
    if (!formData.type) {
      Alert.alert('Erreur', 'Veuillez sélectionner un type d\'intervention');
      return;
    }

    setLoading(true);
    try {
      // 1. Récupérer la plantation actuelle
      const { data: plantation, error: fetchError } = await supabase
        .from('user_plantations')
        .select('interventions')
        .eq('id', plantationId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Créer la nouvelle intervention
      const newIntervention = {
        id: Date.now().toString(),
        type: formData.type,
        date: formData.date,
        description: formData.description,
        quantity: formData.quantity ? `${formData.quantity} ${formData.unit}` : null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        notes: formData.notes,
        products: selectedProducts.map(p => ({
          id: p.id,
          name: p.name,
          quantity: p.quantity,
          price: p.price
        })),
        created_at: new Date().toISOString()
      };

      // 3. Mettre à jour le tableau des interventions
      const currentInterventions = plantation.interventions || [];
      const updatedInterventions = [newIntervention, ...currentInterventions];

      // 4. Sauvegarder
      const { error: updateError } = await supabase
        .from('user_plantations')
        .update({ interventions: updatedInterventions })
        .eq('id', plantationId);

      if (updateError) throw updateError;

      Alert.alert(
        'Succès',
        'Intervention enregistrée',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer l\'intervention');
    } finally {
      setLoading(false);
    }
  };

  const renderProductItem = ({ item }) => (
    <TouchableOpacity
      style={styles.productItem}
      onPress={() => addProduct(item)}
    >
      <View style={styles.productIcon}>
        <MaterialIcons name="grass" size={24} color="#2e7d32" />
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>{item.price} FCFA</Text>
      </View>
      <MaterialIcons name="add-circle" size={24} color="#2e7d32" />
    </TouchableOpacity>
  );

  const renderSelectedProduct = ({ item }) => (
    <View style={styles.selectedProductCard}>
      <View style={styles.selectedProductInfo}>
        <Text style={styles.selectedProductName}>{item.name}</Text>
        <Text style={styles.selectedProductPrice}>{item.price} FCFA</Text>
      </View>
      <View style={styles.selectedProductActions}>
        <TouchableOpacity
          style={styles.qtyButton}
          onPress={() => updateProductQuantity(item.id, item.quantity - 1)}
        >
          <Text style={styles.qtyButtonText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.selectedProductQty}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.qtyButton}
          onPress={() => updateProductQuantity(item.id, item.quantity + 1)}
        >
          <Text style={styles.qtyButtonText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeProductButton}
          onPress={() => removeProduct(item.id)}
        >
          <MaterialIcons name="delete-outline" size={20} color="#f44336" />
        </TouchableOpacity>
      </View>
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
    <View style={styles.container}>
      <BackHeader title="Ajouter une intervention" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.plantationName}>{plantationName || 'Parcelle'}</Text>

        {/* Type d'intervention */}
        <Text style={styles.label}>Type d'intervention *</Text>
        <View style={styles.typeContainer}>
          {INTERVENTION_TYPES.map(type => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeCard,
                formData.type === type.id && styles.typeCardActive
              ]}
              onPress={() => setFormData({ ...formData, type: type.id })}
            >
              <MaterialIcons
                name={type.icon}
                size={28}
                color={formData.type === type.id ? '#fff' : '#2e7d32'}
              />
              <Text style={[
                styles.typeLabel,
                formData.type === type.id && styles.typeLabelActive
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date */}
        <Text style={styles.label}>Date</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={formData.date}
          onChangeText={(text) => setFormData({ ...formData, date: text })}
        />

        {/* Description */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Décrivez l'intervention..."
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          multiline
          numberOfLines={3}
        />

        {/* Quantité appliquée */}
        <Text style={styles.label}>Quantité appliquée</Text>
        <View style={styles.quantityRow}>
          <TextInput
            style={[styles.input, styles.quantityInput]}
            placeholder="Quantité"
            keyboardType="numeric"
            value={formData.quantity}
            onChangeText={(text) => setFormData({ ...formData, quantity: text })}
          />
          <View style={styles.unitSelector}>
            {['kg', 'L', 'g', 'ml', 'sachet'].map(unit => (
              <TouchableOpacity
                key={unit}
                style={[styles.unitOption, formData.unit === unit && styles.unitOptionActive]}
                onPress={() => setFormData({ ...formData, unit })}
              >
                <Text style={[styles.unitText, formData.unit === unit && styles.unitTextActive]}>
                  {unit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Produits utilisés */}
        <View style={styles.productsHeader}>
          <Text style={styles.label}>Produits utilisés</Text>
          <TouchableOpacity
            style={styles.addProductButton}
            onPress={() => setProductModalVisible(true)}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.addProductButtonText}>Ajouter</Text>
          </TouchableOpacity>
        </View>

        {selectedProducts.length > 0 && (
          <FlatList
            data={selectedProducts}
            renderItem={renderSelectedProduct}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            style={styles.selectedProductsList}
          />
        )}

        {/* Coût */}
        <Text style={styles.label}>Coût (FCFA)</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          keyboardType="numeric"
          value={formData.cost}
          onChangeText={(text) => setFormData({ ...formData, cost: text })}
        />

        {/* Notes supplémentaires */}
        <Text style={styles.label}>Notes supplémentaires</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Observations, conditions météo, etc."
          value={formData.notes}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
          multiline
          numberOfLines={3}
        />

        {/* Bouton d'envoi */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Enregistrement...' : 'Enregistrer l\'intervention'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de sélection des produits */}
      <Modal
        visible={productModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un produit</Text>
              <TouchableOpacity onPress={() => setProductModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={products}
              renderItem={renderProductItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.productList}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  plantationName: { fontSize: 20, fontWeight: 'bold', color: '#2e7d32', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 14 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  typeContainer: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  typeCard: { width: '30%', margin: '1.5%', backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  typeCardActive: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  typeLabel: { fontSize: 11, marginTop: 6, color: '#666', textAlign: 'center' },
  typeLabelActive: { color: '#fff' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quantityInput: { flex: 1 },
  unitSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unitOption: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f0f0f0', borderRadius: 20 },
  unitOptionActive: { backgroundColor: '#2e7d32' },
  unitText: { fontSize: 12, color: '#666' },
  unitTextActive: { color: '#fff' },
  productsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, marginBottom: 8 },
  addProductButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2e7d32', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4 },
  addProductButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  selectedProductsList: { marginTop: 5 },
  selectedProductCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 8 },
  selectedProductInfo: { flex: 1 },
  selectedProductName: { fontSize: 14, fontWeight: 'bold' },
  selectedProductPrice: { fontSize: 12, color: '#2e7d32' },
  selectedProductActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectedProductQty: { fontSize: 14, minWidth: 30, textAlign: 'center' },
  qtyButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
  qtyButtonText: { fontSize: 18, fontWeight: 'bold' },
  removeProductButton: { padding: 5 },
  submitButton: { backgroundColor: '#2e7d32', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 25, marginBottom: 40 },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 15, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32' },
  productList: { padding: 10 },
  productItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  productIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e8f5e9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: 'bold' },
  productPrice: { fontSize: 12, color: '#2e7d32' }
});