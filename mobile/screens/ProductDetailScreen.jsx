// mobile/screens/ProductDetailScreen.jsx

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function ProductDetailScreen({ route, navigation }) {
  const { product } = route.params;
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const handleAddToCart = () => {
    // À implémenter plus tard
    Alert.alert('Info', 'Fonctionnalité à venir');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Image */}
      {product.images && product.images.length > 0 && (
        <Image source={{ uri: product.images[0] }} style={styles.mainImage} />
      )}

      {/* Contenu */}
      <View style={styles.content}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.category}>{product.category}</Text>
        <Text style={styles.price}>{product.price.toLocaleString()} FCFA</Text>

        {product.stock !== undefined && (
          <Text style={[styles.stock, product.stock > 0 ? styles.inStock : styles.outOfStock]}>
            {product.stock > 0 ? `✅ En stock (${product.stock})` : '❌ Rupture de stock'}
          </Text>
        )}

        {product.dosage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dosage</Text>
            <Text style={styles.sectionText}>{product.dosage}</Text>
          </View>
        )}

        {product.short_description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description courte</Text>
            <Text style={styles.sectionText}>{product.short_description}</Text>
          </View>
        )}

        {product.long_description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description détaillée</Text>
            <Text style={styles.sectionText}>{product.long_description}</Text>
          </View>
        )}

        {product.usage_instructions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructions d'utilisation</Text>
            <Text style={styles.sectionText}>{product.usage_instructions}</Text>
          </View>
        )}

        {product.storage_conditions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conditions de stockage</Text>
            <Text style={styles.sectionText}>{product.storage_conditions}</Text>
          </View>
        )}

        {/* Boutons d'action */}
        <TouchableOpacity
          style={[styles.button, styles.addToCartButton]}
          onPress={handleAddToCart}
        >
          <Text style={styles.buttonText}>Ajouter au panier</Text>
        </TouchableOpacity>

        {isAdmin && (
          <TouchableOpacity
            style={[styles.button, styles.editButton]}
            onPress={() => navigation.goBack()} // Ou naviguer vers l'édition
          >
            <Text style={styles.buttonText}>Modifier le produit</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mainImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  content: {
    padding: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
  },
  category: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f57c00',
    marginBottom: 12,
  },
  stock: {
    fontSize: 14,
    marginBottom: 20,
    paddingVertical: 5,
  },
  inStock: {
    color: '#4caf50',
  },
  outOfStock: {
    color: '#f44336',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  addToCartButton: {
    backgroundColor: '#2e7d32',
  },
  editButton: {
    backgroundColor: '#2196f3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});