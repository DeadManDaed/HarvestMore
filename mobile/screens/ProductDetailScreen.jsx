// mobile/screens/ProductDetailScreen.jsx
import React, { useState, useEffect } from 'react';
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
  Dimensions,
  TextInput
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Rating } from 'react-native-ratings'; // npm install react-native-ratings
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

  // États pour les avis
  const [reviews, setReviews] = useState([]);
  const [userReview, setUserReview] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Charger les avis
  const fetchReviews = async () => {
    if (!product?.id) return;
    const { data, error } = await supabase
      .from('product_reviews')
      .select('*, user:profiles(full_name, username)')
      .eq('product_id', product.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Erreur chargement avis:', error);
    } else {
      setReviews(data || []);
      // Vérifier si l'utilisateur connecté a déjà laissé un avis
      if (user) {
        const myReview = data?.find(r => r.user_id === user.id);
        if (myReview) {
          setUserReview(myReview);
          setRating(myReview.rating);
          setComment(myReview.comment || '');
        } else {
          setUserReview(null);
          setRating(0);
          setComment('');
        }
      }
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [product?.id, user]);

  // Ajouter au panier (inchangé)
  const handleAddToCart = async () => {
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

    try {
      setAddingToCart(true);
      const { data: existingItem, error: checkError } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      if (existingItem) {
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: product.id,
            quantity: 1,
            price: product.price,
            product_name: product.name,
            product_image: product.images && product.images[0] ? product.images[0] : null
          });
        if (insertError) throw insertError;
      }

      Alert.alert(
        '✅ Ajouté au panier',
        `${product.name} a été ajouté à votre panier`,
        [
          { text: 'Continuer mes achats', style: 'cancel' },
          { text: 'Voir le panier', onPress: () => navigation.navigate('Cart') }
        ]
      );
    } catch (error) {
      console.error('Erreur ajout au panier:', error);
      Alert.alert('Erreur', `Impossible d'ajouter au panier: ${error.message}`);
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
    Alert.alert('Info', 'Fonctionnalité d\'édition à venir');
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
              await supabase.from('cart_items').delete().eq('product_id', product.id);
              const { error: deleteError } = await supabase
                .from('products')
                .delete()
                .eq('id', product.id);
              if (deleteError) throw deleteError;
              Alert.alert('✅ Supprimé', 'Produit supprimé avec succès');
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

  // Soumettre un avis
  const submitReview = async () => {
    if (!user) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter pour laisser un avis');
      return;
    }
    if (rating === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner une note (1 à 5 étoiles)');
      return;
    }
    setSubmittingReview(true);
    const reviewData = {
      product_id: product.id,
      user_id: user.id,
      rating,
      comment: comment.trim() || null
    };
    let error;
    if (userReview) {
      // Mise à jour
      const { error: updateError } = await supabase
        .from('product_reviews')
        .update(reviewData)
        .eq('id', userReview.id);
      error = updateError;
    } else {
      // Insertion
      const { error: insertError } = await supabase
        .from('product_reviews')
        .insert(reviewData);
      error = insertError;
    }
    if (error) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer votre avis');
      console.error(error);
    } else {
      Alert.alert('Merci', 'Votre avis a été enregistré');
      fetchReviews(); // recharger la liste
    }
    setSubmittingReview(false);
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

        <View style={styles.content}>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.category}>{product.category}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{product.price.toLocaleString()} FCFA</Text>
            <TouchableOpacity style={styles.websiteButton} onPress={openWebsiteInApp}>
              <Text style={styles.websiteButtonText}>🌐 Voir sur cafcoop.cm</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.availabilityContainer}>
            <Text style={styles.availabilityText}>
              ✅ Disponible dans nos boutiques partenaires
            </Text>
            <Text style={styles.availabilitySubtext}>
              Un de nos commerçants près de chez vous a ce produit
            </Text>
          </View>

          {product.dosage && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📊 Dosage</Text>
              <Text style={styles.sectionText}>{product.dosage}</Text>
            </View>
          )}

          {product.short_description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📝 Description rapide</Text>
              <Text style={styles.sectionText}>{product.short_description}</Text>
            </View>
          )}

          {product.long_description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📖 Description détaillée</Text>
              <Text style={styles.sectionText}>{product.long_description}</Text>
            </View>
          )}

          {product.usage_instructions && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🌱 Instructions d'utilisation</Text>
              <Text style={styles.sectionText}>{product.usage_instructions}</Text>
            </View>
          )}

          {product.storage_conditions && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📦 Conditions de stockage</Text>
              <Text style={styles.sectionText}>{product.storage_conditions}</Text>
            </View>
          )}

          {/* Section Avis clients */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⭐ Avis clients</Text>
            {reviews.length === 0 ? (
              <Text style={styles.noReviewsText}>Soyez le premier à donner votre avis !</Text>
            ) : (
              reviews.map(rev => (
                <View key={rev.id} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName}>
                      {rev.user?.full_name || rev.user?.username || 'Anonyme'}
                    </Text>
                    <Rating
                      type="star"
                      ratingCount={5}
                      imageSize={16}
                      readonly
                      startingValue={rev.rating}
                      style={styles.reviewRating}
                    />
                  </View>
                  {rev.comment && <Text style={styles.reviewComment}>{rev.comment}</Text>}
                  <Text style={styles.reviewDate}>
                    {new Date(rev.created_at).toLocaleDateString()}
                  </Text>
                </View>
              ))
            )}

            {/* Formulaire d'avis */}
            <View style={styles.reviewForm}>
              <Text style={styles.formTitle}>
                {userReview ? 'Modifier votre avis' : 'Donnez votre avis'}
              </Text>
              <Rating
                type="star"
                ratingCount={5}
                imageSize={30}
                startingValue={rating}
                onFinishRating={setRating}
                style={styles.ratingInput}
              />
              <TextInput
                style={styles.commentInput}
                placeholder="Votre commentaire (optionnel)"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                style={styles.submitReviewButton}
                onPress={submitReview}
                disabled={submittingReview}
              >
                {submittingReview ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitReviewText}>
                    {userReview ? 'Modifier mon avis' : 'Publier mon avis'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Boutons d'action */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.addToCartButton]}
              onPress={handleAddToCart}
              disabled={addingToCart}
            >
              {addingToCart ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>🛒 Ajouter au panier</Text>
              )}
            </TouchableOpacity>

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
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>🗑️ Supprimer</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Modal WebView */}
      <Modal
        visible={showWebView}
        animationType="slide"
        onRequestClose={() => setShowWebView(false)}
      >
        <View style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            <TouchableOpacity style={styles.closeWebViewButton} onPress={() => setShowWebView(false)}>
              <Text style={styles.closeWebViewText}>← Retour au produit</Text>
            </TouchableOpacity>
            <Text style={styles.webViewTitle}>cafcoop.cm</Text>
            <View style={{ width: 40 }} />
          </View>
          <WebView
            source={{ uri: `https://cafcoop.cm/produit/${product.slug || product.id}` }}
            style={styles.webView}
            startInLoadingState
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

// Styles (ajout des nouveaux styles pour les avis)
const styles = StyleSheet.create({
  mainImage: { width: '100%', height: 300, resizeMode: 'cover' },
  placeholderImage: { backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 16, color: '#666' },
  content: { padding: 15 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#2e7d32', marginBottom: 5 },
  category: { fontSize: 14, color: '#ff9800', textTransform: 'uppercase', marginBottom: 10 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  price: { fontSize: 22, fontWeight: 'bold', color: '#2e7d32' },
  websiteButton: { backgroundColor: '#2196f3', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  websiteButtonText: { color: '#fff', fontSize: 12 },
  availabilityContainer: { backgroundColor: '#e8f5e9', padding: 12, borderRadius: 8, marginBottom: 15 },
  availabilityText: { fontSize: 14, fontWeight: 'bold', color: '#2e7d32' },
  availabilitySubtext: { fontSize: 12, color: '#555', marginTop: 4 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  sectionText: { fontSize: 14, color: '#555', lineHeight: 20 },
  buttonContainer: { marginTop: 10, marginBottom: 30 },
  button: { padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  addToCartButton: { backgroundColor: '#2e7d32' },
  editButton: { backgroundColor: '#ff9800' },
  deleteButton: { backgroundColor: '#f44336' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  adminButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  webViewContainer: { flex: 1, backgroundColor: '#fff' },
  webViewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#2e7d32' },
  closeWebViewButton: { padding: 5 },
  closeWebViewText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  webViewTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  webView: { flex: 1 },
  webViewLoading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  // Styles pour les avis
  noReviewsText: { fontSize: 14, color: '#999', fontStyle: 'italic', marginBottom: 15 },
  reviewItem: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 10, elevation: 1 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewerName: { fontWeight: 'bold', fontSize: 14 },
  reviewRating: { marginLeft: 10 },
  reviewComment: { fontSize: 13, color: '#444', marginBottom: 4 },
  reviewDate: { fontSize: 11, color: '#aaa', textAlign: 'right' },
  reviewForm: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginTop: 10 },
  formTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#2e7d32' },
  ratingInput: { alignSelf: 'flex-start', marginBottom: 10 },
  commentInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 10, textAlignVertical: 'top', minHeight: 70 },
  submitReviewButton: { backgroundColor: '#2e7d32', padding: 12, borderRadius: 8, alignItems: 'center' },
  submitReviewText: { color: '#fff', fontWeight: 'bold' },
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
  availabilityContainer: {
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 4,
  },
  availabilitySubtext: {
    fontSize: 12,
    color: '#666',
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