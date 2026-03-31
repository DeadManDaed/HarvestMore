// mobile/screens/ProductDetailScreen.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

export default function ProductDetailScreen({ route, navigation }) {
  const { product: initialProduct } = route.params;
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [product, setProduct] = useState(initialProduct);
  const [loading, setLoading] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [showWebView, setShowWebView] = useState(false);

  // Ajouter au panier
  const handleAddToCart = async () => {
    // Vérifier si l'utilisateur est connecté
    if (!user) {
      Alert.alert(
        'Connexion requise',
        'Veuillez vous connecter pour ajouter des produits au panier',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Se connecter', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }

    // Vérifier le stock
    if (product.stock <= 0) {
      Alert.alert('Stock épuisé', 'Ce produit n\'est plus disponible');
      return;
    }

    try {
      setAddingToCart(true);
      
      // 1. Vérifier si le produit est déjà dans le panier
      const { data: existingItem, error: checkError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      // 2. Ajouter ou mettre à jour
      if (existingItem) {
        // Mettre à jour la quantité
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ 
            quantity: existingItem.quantity + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingItem.id);

        if (updateError) throw updateError;
      } else {
        // Ajouter nouveau produit
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert([{
            user_id: user.id,
            product_id: product.id,
            quantity: 1,
            price: product.price,
            product_name: product.name,
            product_image: product.images && product.images[0] ? product.images[0] : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (insertError) throw insertError;
      }

      // 3. Mettre à jour le stock localement (optionnel)
      setProduct(prev => ({
        ...prev,
        stock: prev.stock - 1
      }));

      // 4. Notification de succès
      Alert.alert(
        '✅ Ajouté au panier',
        `${product.name} a été ajouté à votre panier`,
        [
          { text: 'Continuer mes achats', style: 'cancel' },
          { 
            text: 'Voir le panier', 
            onPress: () => navigation.navigate('Cart')
          }
        ]
      );
    } catch (error) {
      console.error('Erreur ajout au panier:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter le produit au panier');
    } finally {
      setAddingToCart(false);
    }
  };

  // Ouvrir le site dans une WebView intégrée
  const openWebsiteInApp = () => {
    const url = `https://cafcoop.cm/produit/${product.slug || product.id}`;
    setShowWebView(true);
  };

  // Modifier le produit (admin)
  const handleEditProduct = () => {
    // Naviguer vers l'écran d'édition ou ouvrir le modal
    navigation.navigate('Catalogue', { 
      screen: 'EditProduct',
      params: { product: product, editMode: true }
    });
  };

  // Supprimer le produit (admin)
  const handleDeleteProduct = () => {
    Alert.alert(
      '⚠️ Confirmation',
      `Voulez-vous vraiment supprimer "${product.name}" ?\n\nCette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // 1. Supprimer d'abord les références dans le panier
              const { error: cartError } = await supabase
                .from('cart_items')
                .delete()
                .eq('product_id', product.id);
              
              if (cartError) {
                console.error('Erreur nettoyage panier:', cartError);
              }
              
              // 2. Supprimer le produit
              const { error: deleteError } = await supabase
                .from('products')
                .delete()
                .eq('id', product.id);
              
              if (deleteError) throw deleteError;
              
              // 3. Succès
              Alert.alert('✅ Supprimé', 'Produit supprimé avec succès');
              
              // 4. Retourner au catalogue
              navigation.goBack();
              
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

  return (
    <>
      <ScrollView style={styles.container}>
        {/* Image principale */}
        {product.images && product.images.length > 0 ? (
          <Image source={{ uri: product.images[0] }} style={styles.mainImage} />
        ) : (
          <View style={[styles.mainImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>📷 Pas d'image</Text>
          </View>
        )}

        {/* Contenu */}
        <View style={styles.content}>
          {/* Nom et catégorie */}
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.category}>{product.category}</Text>
          
          {/* Prix et bouton site web */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{product.price.toLocaleString()} FCFA</Text>
            
            <TouchableOpacity 
              style={styles.websiteButton} 
              onPress={openWebsiteInApp}
            >
              <Text style={styles.websiteButtonText}>🌐 Voir sur cafcoop.cm</Text>
            </TouchableOpacity>
          </View>

          {/* Stock */}
          {product.stock !== undefined && (
            <View style={styles.stockContainer}>
              <Text style={[
                styles.stockText,
                product.stock > 0 ? styles.inStock : styles.outOfStock
              ]}>
                {product.stock > 0 
                  ? `✅ En stock (${product.stock} unités)` 
                  : '❌ Rupture de stock'}
              </Text>
            </View>
          )}

          {/* Dosage */}
          {product.dosage && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📊 Dosage</Text>
              <Text style={styles.sectionText}>{product.dosage}</Text>
            </View>
          )}

          {/* Description courte */}
          {product.short_description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📝 Description rapide</Text>
              <Text style={styles.sectionText}>{product.short_description}</Text>
            </View>
          )}

          {/* Description détaillée */}
          {product.long_description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📖 Description détaillée</Text>
              <Text style={styles.sectionText}>{product.long_description}</Text>
            </View>
          )}

          {/* Instructions d'utilisation */}
          {product.usage_instructions && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🌱 Instructions d'utilisation</Text>
              <Text style={styles.sectionText}>{product.usage_instructions}</Text>
            </View>
          )}

          {/* Conditions de stockage */}
          {product.storage_conditions && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📦 Conditions de stockage</Text>
              <Text style={styles.sectionText}>{product.storage_conditions}</Text>
            </View>
          )}

          {/* Boutons d'action */}
          <View style={styles.buttonContainer}>
            {/* Bouton Ajouter au panier */}
            <TouchableOpacity
              style={[
                styles.button, 
                styles.addToCartButton,
                (product.stock <= 0 || addingToCart) && styles.disabledButton
              ]}
              onPress={handleAddToCart}
              disabled={addingToCart || product.stock <= 0}
            >
              {addingToCart ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {product.stock > 0 ? '🛒 Ajouter au panier' : '📦 Rupture de stock'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Boutons admin */}
            {isAdmin && (
              <View style={styles.adminButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.editButton]}
                  onPress={handleEditProduct}
                >
                  <Text style={styles.buttonText}>✏️ Modifier</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.button, styles.deleteButton]}
                  onPress={handleDeleteProduct}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>🗑️ Supprimer</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Modal WebView pour afficher cafcoop.cm sans quitter l'app */}
      <Modal
        visible={showWebView}
        animationType="slide"
        onRequestClose={() => setShowWebView(false)}
      >
        <View style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            <TouchableOpacity 
              style={styles.closeWebViewButton}
              onPress={() => setShowWebView(false)}
            >
              <Text style={styles.closeWebViewText}>← Retour au produit</Text>
            </TouchableOpacity>
            <Text style={styles.webViewTitle}>cafcoop.cm</Text>
            <View style={{ width: 40 }} />
          </View>
          <WebView 
            source={{ uri: `https://cafcoop.cm/produit/${product.slug || product.id}` }}
            style={styles.webView}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.webViewLoading}>
                <ActivityIndicator size="large" color="#2e7d32" />
              </View>
            )}
          />
        </View>
      </Modal>
    </>
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
    backgroundColor: '#e0e0e0',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
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
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 10,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f57c00',
  },
  websiteButton: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  websiteButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  stockContainer: {
    marginBottom: 20,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  stockText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inStock: {
    color: '#4caf50',
  },
  outOfStock: {
    color: '#f44336',
  },
  section: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    lineHeight: 22,
  },
  buttonContainer: {
    marginTop: 10,
    marginBottom: 30,
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
    flex: 1,
    marginRight: 5,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    flex: 1,
    marginLeft: 5,
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  adminButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Styles pour la WebView
  webViewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeWebViewButton: {
    padding: 8,
  },
  closeWebViewText: {
    fontSize: 16,
    color: '#2e7d32',
    fontWeight: '600',
  },
  webViewTitle: {
    fontSize: 14,
    color: '#666',
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});