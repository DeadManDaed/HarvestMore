//mobile/screens/CatalogueScreen.jsx

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function CatalogueScreen() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

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
                <Text style={styles.modalDescription}>{selectedProduct.long_description}</Text>
                <Text style={styles.modalDetail}>💰 Prix : {selectedProduct.price} FCFA</Text>
                <Text style={styles.modalDetail}>🧪 Dosage : {selectedProduct.dosage}</Text>
                <Text style={styles.modalDetail}>📦 Conservation : {selectedProduct.storage_conditions}</Text>
                <TouchableOpacity style={styles.addButton} onPress={() => alert('Ajout au panier (à implémenter)')}>
                  <Text style={styles.addButtonText}>Ajouter au panier</Text>
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
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  modalDescription: { fontSize: 14, marginBottom: 10 },
  modalDetail: { fontSize: 12, color: '#555', marginVertical: 2 },
  addButton: { backgroundColor: '#2e7d32', padding: 12, borderRadius: 8, marginTop: 15, alignItems: 'center' },
  addButtonText: { color: '#fff', fontWeight: 'bold' },
  closeButton: { marginTop: 10, alignItems: 'center', padding: 10 },
  closeButtonText: { color: '#777' },
});