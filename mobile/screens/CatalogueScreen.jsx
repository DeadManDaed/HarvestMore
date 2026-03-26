// mobile/screens/CatalogueScreen.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useCart } from '../contexts/CartContext';

// Fonction utilitaire pour formater la description technique en texte simple
const formatDescription = (text) => {
  if (!text) return '';
  // Supprimer les balises HTML et mettre en forme
  let formatted = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?p>/gi, '')
    .replace(/<strong>/gi, '')
    .replace(/<\/strong>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  
  // Séparer en paragraphes
  const paragraphs = formatted.split('\n').filter(p => p.trim().length > 0);
  
  // Retourner un texte plus lisible avec des retours à la ligne
  return paragraphs.join('\n\n');
};

// Simplifier le dosage pour le grand public
const formatDosage = (dosage) => {
  if (!dosage) return '';
  // Ajouter des espaces et clarifier
  return dosage.replace(/[L|kg]/gi, (match) => ` ${match}`).trim();
};

export default function CatalogueScreen() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*');
    if (error) console.error(error);
    else setProducts(data);
  };

  const renderProduct = ({ item }) => (
    <TouchableOpacity style={styles.productCard} onPress={() => {
      setSelectedProduct(item);
      setModalVisible(true);
    }}>
      <Image source={{ uri: item.images?.[0] || 'https://via.placeholder.com/100' }} style={styles.productImage} />
      <Text style={styles.productName}>{item.name}</Text>
      <Text style={styles.productPrice}>{item.price} FCFA</Text>
    </TouchableOpacity>
  );

  const handleAddToCart = () => {
    if (selectedProduct) {
      addToCart(selectedProduct.id, 1);
      Alert.alert('Ajouté au panier', `${selectedProduct.name} a été ajouté à votre panier.`);
      closeModal();
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedProduct(null);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.list}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedProduct && (
              <>
                <Text style={styles.modalTitle}>{selectedProduct.name}</Text>
                
                {/* Description simplifiée */}
                <Text style={styles.modalDescription}>
                  {formatDescription(selectedProduct.long_description) || selectedProduct.short_description}
                </Text>

                {/* Prix bien visible */}
                <View style={styles.priceContainer}>
                  <Text style={styles.priceLabel}>💰 Prix :</Text>
                  <Text style={styles.priceValue}>{selectedProduct.price} FCFA</Text>
                </View>

                {/* Dosage simplifié */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailIcon}>🧪</Text>
                  <Text style={styles.detailText}>
                    Dosage : {formatDosage(selectedProduct.dosage) || 'Consulter l’étiquette'}
                  </Text>
                </View>

                {/* Conservation */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailIcon}>📦</Text>
                  <Text style={styles.detailText}>
                    Conservation : {selectedProduct.storage_conditions || 'Endroit sec et frais'}
                  </Text>
                </View>

                {/* Instructions d'utilisation (si disponibles) */}
                {selectedProduct.usage_instructions && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>🌿</Text>
                    <Text style={styles.detailText}>
                      Utilisation : {selectedProduct.usage_instructions}
                    </Text>
                  </View>
                )}

                <TouchableOpacity style={styles.addButton} onPress={handleAddToCart}>
                  <Text style={styles.addButtonText}>➕ Ajouter au panier</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                  <Text style={styles.closeButtonText}>Fermer</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 10 },
  productCard: {
    flex: 1,
    margin: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: { width: 100, height: 100, borderRadius: 8, marginBottom: 8 },
  productName: { fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  productPrice: { fontSize: 12, color: '#2e7d32', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, color: '#2e7d32' },
  modalDescription: { fontSize: 14, color: '#333', marginBottom: 15, lineHeight: 20 },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
  },
  priceLabel: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32' },
  priceValue: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32' },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 6 },
  detailIcon: { fontSize: 16, width: 30 },
  detailText: { fontSize: 13, color: '#555', flex: 1, lineHeight: 18 },
  addButton: {
    backgroundColor: '#2e7d32',
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 5 },
  closeButton: { marginTop: 12, alignItems: 'center', padding: 12 },
  closeButtonText: { color: '#777', fontSize: 14 },
});