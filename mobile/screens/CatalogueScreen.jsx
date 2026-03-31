// mobile/screens/CatalogueScreen.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function CatalogueScreen({ navigation }) {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Formulaire pour ajouter/modifier un produit
  const [formData, setFormData] = useState({
    name: '',
    short_description: '',
    long_description: '',
    price: '',
    dosage: '',
    usage_instructions: '',
    storage_conditions: '',
    images: [],
    category: '',
    stock: '',
    slug: ''
  });
  
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
      Alert.alert('Erreur', 'Impossible de charger les produits');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      short_description: '',
      long_description: '',
      price: '',
      dosage: '',
      usage_instructions: '',
      storage_conditions: '',
      images: [],
      category: '',
      stock: '',
      slug: ''
    });
    setEditingProduct(null);
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleSaveProduct = async () => {
  if (!formData.name || !formData.price || !formData.category) {
    Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires (nom, prix, catégorie)');
    return;
  }

  try {
    setLoading(true);
    const slug = formData.slug || generateSlug(formData.name);

    const productData = {
      name: formData.name,
      short_description: formData.short_description,
      long_description: formData.long_description,
      price: parseFloat(formData.price),
      dosage: formData.dosage,
      usage_instructions: formData.usage_instructions,
      storage_conditions: formData.storage_conditions,
      images: formData.images,  // Maintenant c'est un tableau
      category: formData.category,
      stock: formData.stock ? parseInt(formData.stock) : 0,
      slug: slug,
      updated_at: new Date().toISOString()
    };

      let result;
      
      if (editingProduct) {
        // Mise à jour
        result = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
      } else {
        // Création
        result = await supabase
          .from('products')
          .insert([{ ...productData, created_at: new Date().toISOString() }]);
      }

      if (result.error) throw result.error;

      Alert.alert(
        'Succès',
        editingProduct ? 'Produit modifié avec succès' : 'Produit ajouté avec succès'
      );
      
      resetForm();
      setModalVisible(false);
      fetchProducts();
    } catch (error) {
      console.error('Erreur sauvegarde produit:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le produit');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = (product) => {
    Alert.alert(
      'Confirmation',
      `Voulez-vous vraiment supprimer le produit "${product.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', product.id);

              if (error) throw error;
              
              Alert.alert('Succès', 'Produit supprimé avec succès');
              fetchProducts();
            } catch (error) {
              console.error('Erreur suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le produit');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      short_description: product.short_description || '',
      long_description: product.long_description || '',
      price: product.price?.toString() || '',
      dosage: product.dosage || '',
      usage_instructions: product.usage_instructions || '',
      storage_conditions: product.storage_conditions || '',
      images: product.images || [],
      category: product.category || '',
      stock: product.stock?.toString() || '',
      slug: product.slug || ''
    });
    setModalVisible(true);
  };

  const renderProductCard = ({ item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetail', { product: item })}
    >
    {item.images && item.images.length > 0 && (  // Vérification améliorée
      <Image source={{ uri: item.images[0] }} style={styles.productImage} />  // Prend la première image
    )}

      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productCategory}>{item.category}</Text>
        <Text style={styles.productPrice}>{item.price.toLocaleString()} FCFA</Text>
        {item.stock !== undefined && (
          <Text style={[styles.productStock, item.stock > 0 ? styles.inStock : styles.outOfStock]}>
            {item.stock > 0 ? `Stock: ${item.stock}` : 'Rupture de stock'}
          </Text>
        )}
      </View>
      
      {isAdmin && (
        <View style={styles.adminActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => openEditModal(item)}
          >
            <Text style={styles.actionButtonText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteProduct(item)}
          >
            <Text style={styles.actionButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* En-tête avec bouton admin */}
      <View style={styles.header}>
        <Text style={styles.title}>Catalogue Harvest More</Text>
        {isAdmin && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              resetForm();
              setModalVisible(true);
            }}
          >
            <Text style={styles.addButtonText}>+ Ajouter un produit</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Liste des produits */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2e7d32" />
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProductCard}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun produit disponible</Text>
              {isAdmin && (
                <TouchableOpacity
                  style={styles.emptyAddButton}
                  onPress={() => setModalVisible(true)}
                >
                  <Text style={styles.emptyAddButtonText}>
                    + Ajouter votre premier produit
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Modal d'ajout/édition */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          resetForm();
          setModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Modifier le produit' : 'Ajouter un produit'}
              </Text>

              {/* Champs du formulaire */}
              <TextInput
                style={styles.input}
                placeholder="Nom du produit *"
                value={formData.name}
                onChangeText={(text) => handleInputChange('name', text)}
              />

              <TextInput
                style={styles.input}
                placeholder="Catégorie *"
                value={formData.category}
                onChangeText={(text) => handleInputChange('category', text)}
              />

              <TextInput
                style={styles.input}
                placeholder="Prix (FCFA) *"
                keyboardType="numeric"
                value={formData.price}
                onChangeText={(text) => handleInputChange('price', text)}
              />

              <TextInput
                style={styles.input}
                placeholder="Stock"
                keyboardType="numeric"
                value={formData.stock}
                onChangeText={(text) => handleInputChange('stock', text)}
              />

              <TextInput
                style={styles.input}
                placeholder="Dosage (ex: 1L/ha)"
                value={formData.dosage}
                onChangeText={(text) => handleInputChange('dosage', text)}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description courte"
                multiline
                numberOfLines={3}
                value={formData.short_description}
                onChangeText={(text) => handleInputChange('short_description', text)}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description détaillée"
                multiline
                numberOfLines={5}
                value={formData.long_description}
                onChangeText={(text) => handleInputChange('long_description', text)}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Instructions d'utilisation"
                multiline
                numberOfLines={3}
                value={formData.usage_instructions}
                onChangeText={(text) => handleInputChange('usage_instructions', text)}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Conditions de stockage"
                multiline
                numberOfLines={3}
                value={formData.storage_conditions}
                onChangeText={(text) => handleInputChange('storage_conditions', text)}
              />

 <TextInput
  style={styles.input}
  placeholder="URLs des images (séparées par des virgules)"
  value={formData.images.join(', ')}
  onChangeText={(text) => handleInputChange('images', text.split(',').map(url => url.trim()))}
/>

              <TextInput
                style={styles.input}
                placeholder="Slug (laissez vide pour auto-génération)"
                value={formData.slug}
                onChangeText={(text) => handleInputChange('slug', text)}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    resetForm();
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.buttonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveProduct}
                >
                  <Text style={styles.buttonText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  addButton: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 4,
  },
  productStock: {
    fontSize: 12,
  },
  inStock: {
    color: '#4caf50',
  },
  outOfStock: {
    color: '#f44336',
  },
  adminActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#2196f3',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    fontSize: 18,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 20,
  },
  emptyAddButton: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyAddButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  textArea: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  saveButton: {
    backgroundColor: '#2e7d32',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});