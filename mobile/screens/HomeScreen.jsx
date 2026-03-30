// mobile/screens/HomeScreen.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  FlatList,
  Platform 
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CAROUSEL_HEIGHT = SCREEN_HEIGHT / 3;
// On calcule la largeur exacte d'une carte (Largeur écran moins les marges du container)
const CARD_WIDTH = SCREEN_WIDTH - 20; 

const tips = [
  // ... (Garde ta liste de 80 astuces ici, je ne la réécris pas pour la clarté du code)
  { icon: '💧', category: 'Eau', text: "Arrosez vos cultures tôt le matin (5h-8h) pour réduire l'évaporation de 60%", color: '#0288D1' },
  { icon: '🌱', category: 'Sol', text: "La rotation cultures légumineuses/céréales fixe 100kg d'azote/ha gratuitement", color: '#689F38' },
  // Ajoute tes 80+ autres astuces ici...
];

export default function HomeScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const timerRef = useRef(null);

  // Gestion du défilement automatique
  useEffect(() => {
    startTimer();
    return () => stopTimer();
  }, [currentIndex]);

  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => {
      let nextIndex = (currentIndex + 1) % tips.length;
      scrollToIndex(nextIndex);
    }, 3500);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const scrollToIndex = (index) => {
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
    });
    setCurrentIndex(index);
  };

  const handleManualPress = (direction) => {
    stopTimer();
    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % tips.length;
    } else {
      nextIndex = currentIndex === 0 ? tips.length - 1 : currentIndex - 1;
    }
    scrollToIndex(nextIndex);
  };

  // Synchronise l'index si l'utilisateur swipe manuellement
  const onScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    if (roundIndex !== currentIndex) {
      setCurrentIndex(roundIndex);
    }
  };

  const renderTip = ({ item }) => (
    <View style={[styles.tipCard, { backgroundColor: item.color }]}>
      <View style={styles.tipHeader}>
        <Text style={styles.tipIcon}>{item.icon}</Text>
        <Text style={styles.tipCategory}>{item.category}</Text>
      </View>
      <Text style={styles.tipText} numberOfLines={5} adjustsFontSizeToFit>
        {item.text}
      </Text>
    </View>
  );

  return (
    <FlatList
      ListHeaderComponent={
        <>
          <View style={styles.header}>
            <Text style={styles.welcome}>Bonjour, {user?.email?.split('@')[0] || 'Agriculteur'} !</Text>
            <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Déconnexion</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.carouselContainer}>
            <View style={styles.carouselTopRow}>
              <Text style={styles.carouselTitle}>💡 Harvest More : Conseils</Text>
              <View style={styles.badgeCounter}>
                <Text style={styles.counterText}>{currentIndex + 1} / {tips.length}</Text>
              </View>
            </View>

            <View style={styles.carouselLayout}>
              <TouchableOpacity style={styles.navBtn} onPress={() => handleManualPress('prev')}>
                <Text style={styles.navIcon}>‹</Text>
              </TouchableOpacity>

              <FlatList
                ref={flatListRef}
                data={tips}
                renderItem={renderTip}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                keyExtractor={(_, index) => index.toString()}
                getItemLayout={(_, index) => ({
                  length: CARD_WIDTH,
                  offset: CARD_WIDTH * index,
                  index,
                })}
              />

              <TouchableOpacity style={styles.navBtn} onPress={() => handleManualPress('next')}>
                <Text style={styles.navIcon}>›</Text>
              </TouchableOpacity>
            </View>
            
            {/* Pagination discrète */}
            <View style={styles.dotsRow}>
               {tips.slice(0, 8).map((_, i) => (
                 <View key={i} style={[styles.dot, currentIndex % 8 === i && styles.activeDot]} />
               ))}
            </View>
          </View>
        </>
      }
      data={[]} // On vide la data principale car tout est dans le Header
      renderItem={null}
      ListFooterComponent={
        <View style={styles.dashBoard}>
          <TouchableOpacity style={styles.dashTile} onPress={() => navigation.navigate('MyCrops', { mode: 'selection_diagnostic' })}>
            <Text style={styles.tileIcon}>🔍</Text>
            <Text style={styles.tileLabel}>Diagnostic</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dashTile} onPress={() => navigation.navigate('Catalogue')}>
            <Text style={styles.tileIcon}>🛒</Text>
            <Text style={styles.tileLabel}>Catalogue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dashTile} onPress={() => navigation.navigate('Cart')}>
            <Text style={styles.tileIcon}>🛍️</Text>
            <Text style={styles.tileLabel}>Panier</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dashTile} onPress={() => navigation.navigate('Conversations')}>
            <Text style={styles.tileIcon}>💬</Text>
            <Text style={styles.tileLabel}>Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dashTile} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.tileIcon}>👤</Text>
            <Text style={styles.tileLabel}>Profil</Text>
          </TouchableOpacity>
        </View>
      }
      style={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1b5e20',
  },
  welcome: { fontSize: 18, color: '#fff', fontWeight: 'bold' },
  logoutButton: { backgroundColor: '#c62828', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 5 },
  logoutText: { color: '#fff', fontWeight: '600' },

  carouselContainer: {
    height: CAROUSEL_HEIGHT,
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 15,
    elevation: 5,
    paddingBottom: 10,
  },
  carouselTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    alignItems: 'center',
  },
  carouselTitle: { fontSize: 16, fontWeight: 'bold', color: '#1b5e20' },
  badgeCounter: { backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  counterText: { fontSize: 11, color: '#1b5e20', fontWeight: 'bold' },

  carouselLayout: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  navBtn: { width: 35, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  navIcon: { fontSize: 40, color: '#1b5e20', fontWeight: '200' },
  
  tipCard: {
    width: CARD_WIDTH - 70, // On soustrait la largeur des boutons de nav
    marginHorizontal: 0,
    borderRadius: 12,
    padding: 15,
    justifyContent: 'center',
    height: '90%',
  },
  tipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  tipIcon: { fontSize: 40, marginRight: 10 },
  tipCategory: { color: '#fff', fontWeight: 'bold', opacity: 0.9, fontSize: 14, textTransform: 'uppercase' },
  tipText: { color: '#fff', fontSize: 17, fontWeight: '600', lineHeight: 22 },

  dotsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ddd', marginHorizontal: 3 },
  activeDot: { backgroundColor: '#1b5e20', width: 12 },

  dashBoard: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', padding: 10 },
  dashTile: {
    width: '44%',
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 20,
    marginVertical: 10,
    borderRadius: 15,
    elevation: 2,
  },
  tileIcon: { fontSize: 32, marginBottom: 8 },
  tileLabel: { fontSize: 14, fontWeight: 'bold', color: '#333' },
});
