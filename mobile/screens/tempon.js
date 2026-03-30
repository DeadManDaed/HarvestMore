//

// mobile/screens/HomeScreen.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Dimensions,
  Animated,
  Platform,
  FlatList
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const CAROUSEL_HEIGHT = SCREEN_HEIGHT / 3;

// ═══════════════════════════════════════════════════════════════════════════
// 80+ ASTUCES AGRICOLES ENRICHIES (votre tableau tips reste identique)
// ═══════════════════════════════════════════════════════════════════════════
const tips = [
  // GESTION DE L'EAU (10 astuces)
  { icon: '💧', category: 'Eau', text: "Arrosez vos cultures tôt le matin (5h-8h) pour réduire l'évaporation de 60%", color: '#0288D1' },
  { icon: '🌧️', category: 'Eau', text: "Récupérez l'eau de pluie : 1m² de toit = 600L d'eau/an au Cameroun", color: '#0288D1' },
  { icon: '💦', category: 'Eau', text: "L'irrigation goutte-à-goutte économise jusqu'à 70% d'eau comparé à l'aspersion", color: '#0288D1' },
  { icon: '🌊', category: 'Eau', text: "Creusez des micro-bassins autour des plants pour retenir l'eau de pluie", color: '#0288D1' },
  { icon: '🚰', category: 'Eau', text: "Testez l'humidité du sol avec vos doigts à 5cm de profondeur avant d'arroser", color: '#0288D1' },
  { icon: '☔', category: 'Eau', text: "Installez des pièges à eau (zai) dans les zones arides pour concentrer l'humidité", color: '#0288D1' },
  { icon: '🏞️', category: 'Eau', text: "Plantez des haies brise-vent pour réduire l'évapotranspiration de 30%", color: '#0288D1' },
  { icon: '🌿', category: 'Eau', text: "Le paillage conserve l'humidité du sol pendant 2-3 semaines sans arrosage", color: '#0288D1' },
  { icon: '🪣', category: 'Eau', text: "Utilisez des bidons percés pour un arrosage lent et profond des racines", color: '#0288D1' },
  { icon: '💨', category: 'Eau', text: "Évitez d'arroser en plein soleil : perte de 50% de l'eau par évaporation", color: '#0288D1' },

  // FERTILITÉ DU SOL (15 astuces)
  { icon: '🌱', category: 'Sol', text: "La rotation cultures légumineuses/céréales fixe 100kg d'azote/ha gratuitement", color: '#689F38' },
  { icon: '🧪', category: 'Sol', text: "Testez le pH : cacao aime 6-7, maïs 5.5-7, café 5-6.5", color: '#689F38' },
  { icon: '🍂', category: 'Sol', text: "Le compost mature augmente le rendement de 40% sans engrais chimique", color: '#689F38' },
  { icon: '🐄', category: 'Sol', text: "1 tonne de fumier de bœuf = 6kg N, 3kg P, 6kg K (gratuit !)", color: '#689F38' },
  { icon: '🌾', category: 'Sol', text: "Laissez les résidus de récolte au champ : 30% de matière organique en plus", color: '#689F38' },
  { icon: '🪱', category: 'Sol', text: "Les vers de terre produisent 40 tonnes de compost/ha/an naturellement", color: '#689F38' },
  { icon: '🌳', category: 'Sol', text: "L'agroforesterie augmente la fertilité du sol de 60% en 5 ans", color: '#689F38' },
  { icon: '🥜', category: 'Sol', text: "Plantez de l'arachide : elle fixe 150kg d'azote/ha dans le sol", color: '#689F38' },
  { icon: '🔬', category: 'Sol', text: "1cm de sol fertile met 200 ans à se former : protégez-le !", color: '#689F38' },
  { icon: '🌿', category: 'Sol', text: "Le mucuna pruriens couvre le sol et fixe 100kg N/ha en 3 mois", color: '#689F38' },
  { icon: '🍃', category: 'Sol', text: "Le paillage de feuilles mortes nourrit le sol pendant 12 mois", color: '#689F38' },
  { icon: '🌾', category: 'Sol', text: "Alternez cultures profondes (manioc) et superficielles (haricot) chaque saison", color: '#689F38' },
  { icon: '🪴', category: 'Sol', text: "Les engrais verts (niébé, soja) se coupent avant floraison et enrichissent le sol", color: '#689F38' },
  { icon: '🌻', category: 'Sol', text: "Le tournesol décompacte les sols argileux avec ses racines pivotantes", color: '#689F38' },
  { icon: '🧑‍🌾', category: 'Sol', text: "Ne labourez pas trop profond : max 15cm pour préserver la vie du sol", color: '#689F38' },

  // LUTTE CONTRE RAVAGEURS (12 astuces)
  { icon: '🐞', category: 'Ravageurs', text: "1 coccinelle mange 5000 pucerons dans sa vie : introduisez-les !", color: '#E64A19' },
  { icon: '🦗', category: 'Ravageurs', text: "Les mantis religieuses dévorent criquets, chenilles et mouches blanches", color: '#E64A19' },
  { icon: '🌼', category: 'Ravageurs', text: "Plantez du basilic et de la menthe : repousse naturelle des insectes", color: '#E64A19' },
  { icon: '🧄', category: 'Ravageurs', text: "Pulvérisez ail + piment + savon noir : insecticide bio 100% efficace", color: '#E64A19' },
  { icon: '🍋', category: 'Ravageurs', text: "Le neem (margousier) tue 200+ espèces de ravageurs sans toxicité", color: '#E64A19' },
  { icon: '🦎', category: 'Ravageurs', text: "Les lézards mangent jusqu'à 50 insectes/jour : ne les chassez pas !", color: '#E64A19' },
  { icon: '🕷️', category: 'Ravageurs', text: "Les araignées sont vos alliées : 1 araignée = 2000 insectes/an", color: '#E64A19' },
  { icon: '🪶', category: 'Ravageurs', text: "Installez des perchoirs pour oiseaux : ils mangent chenilles et criquets", color: '#E64A19' },
  { icon: '🌿', category: 'Ravageurs', text: "La cendre de bois autour des plants repousse limaces et escargots", color: '#E64A19' },
  { icon: '🥚', category: 'Ravageurs', text: "Les coquilles d'œufs écrasées coupent le corps des limaces", color: '#E64A19' },
  { icon: '🌸', category: 'Ravageurs', text: "Les fleurs de tagète (œillet d'Inde) repoussent nématodes et mouches", color: '#E64A19' },
  { icon: '🦟', category: 'Ravageurs', text: "Drainés les eaux stagnantes pour éviter la prolifération de moustiques", color: '#E64A19' },

  // MAÏS (8 astuces)
  { icon: '🌽', category: 'Maïs', text: "Semez le maïs à 75cm entre rangs et 25cm sur le rang pour optimiser", color: '#FBC02D' },
  { icon: '🌾', category: 'Maïs', text: "Récoltez quand l'épi penche et les grains sont durs (20% humidité)", color: '#FBC02D' },
  { icon: '🥬', category: 'Maïs', text: "Associez maïs + haricot + courge : les 3 sœurs se protègent mutuellement", color: '#FBC02D' },
  { icon: '💧', category: 'Maïs', text: "Le maïs a besoin de 500-800mm d'eau : arrosez surtout à la floraison", color: '#FBC02D' },
  { icon: '🌱', category: 'Maïs', text: "Démarrez avec 30kg N/ha au semis, puis 60kg N/ha à 40 jours", color: '#FBC02D' },
  { icon: '🐛', category: 'Maïs', text: "La pyrale du maïs : traitez au Bt (Bacillus thuringiensis) bio", color: '#FBC02D' },
  { icon: '🌿', category: 'Maïs', text: "Laissez les tiges au champ après récolte : nourriture pour bétail + compost", color: '#FBC02D' },
  { icon: '📅', category: 'Maïs', text: "Alternez maïs et niébé chaque saison : +30% de rendement", color: '#FBC02D' },

  // CACAO (8 astuces)
  { icon: '🍫', category: 'Cacao', text: "Le cacao a besoin de 60-70% d'ombre : plantez sous bananiers/palmiers", color: '#6D4C41' },
  { icon: '🌳', category: 'Cacao', text: "Espacez les cacaoyers de 3m x 3m pour une bonne aération", color: '#6D4C41' },
  { icon: '✂️', category: 'Cacao', text: "Taillez les gourmands et branches mortes 2 fois/an pour +25% production", color: '#6D4C41' },
  { icon: '🍂', category: 'Cacao', text: "Ramassez les cabosses malades (pourriture brune) et brûlez-les", color: '#6D4C41' },
  { icon: '🌱', category: 'Cacao', text: "Apportez 200g NPK 0-20-20 par pied adulte en début de saison des pluies", color: '#6D4C41' },
  { icon: '🐜', category: 'Cacao', text: "Les fourmis contrôlent naturellement les mirides : ne les éliminez pas", color: '#6D4C41' },
  { icon: '☕', category: 'Cacao', text: "Associez cacao + bananier + café : polyculture optimale en forêt", color: '#6D4C41' },
  { icon: '🌧️', category: 'Cacao', text: "Le cacao demande 1500-2000mm de pluie/an : mulchez en saison sèche", color: '#6D4C41' },

  // CAFÉ (6 astuces)
  { icon: '☕', category: 'Café', text: "Le café Arabica aime l'altitude (1000-2000m) et 18-22°C", color: '#4E342E' },
  { icon: '🌳', category: 'Café', text: "Plantez sous ombrage de 50% : leucaena, grevillea ou avocatier", color: '#4E342E' },
  { icon: '🍒', category: 'Café', text: "Récoltez uniquement les cerises rouges mûres : café de qualité supérieure", color: '#4E342E' },
  { icon: '✂️', category: 'Café', text: "Taillez après récolte : supprimez branches mortes et gourmands", color: '#4E342E' },
  { icon: '🐛', category: 'Café', text: "Le scolyte du café : ramassez cerises tombées, piège attractif avec méthanol", color: '#4E342E' },
  { icon: '🌱', category: 'Café', text: "Apportez 100g NPK 20-10-10 par plant en 3 fois/an", color: '#4E342E' },

  // BANANE PLANTAIN (6 astuces)
  { icon: '🍌', category: 'Banane', text: "Les bananiers aiment K (potassium) : 500g/pied de cendre de bois", color: '#F9A825' },
  { icon: '💧', category: 'Banane', text: "Arrosez 30L/pied/semaine en saison sèche pour éviter flétrissement", color: '#F9A825' },
  { icon: '🌿', category: 'Banane', text: "Coupez les feuilles sèches et utilisez-les comme paillage au pied", color: '#F9A825' },
  { icon: '🐛', category: 'Banane', text: "Charançon du bananier : posez pièges avec tronc fendu + insecticide bio", color: '#F9A825' },
  { icon: '🌱', category: 'Banane', text: "Gardez 3 générations (mère, fille, petite-fille) par touffe max", color: '#F9A825' },
  { icon: '🌾', category: 'Banane', text: "Associez bananier + taro + macabo : maximise l'espace", color: '#F9A825' },

  // MANIOC (5 astuces)
  { icon: '🥔', category: 'Manioc', text: "Plantez des boutures de 20-25cm à 45° dans le sol, bourgeons vers le haut", color: '#8D6E63' },
  { icon: '📅', category: 'Manioc', text: "Récoltez à 10-12 mois pour rendement optimal (25-40 tonnes/ha)", color: '#8D6E63' },
  { icon: '🌱', category: 'Manioc', text: "Le manioc tolère sols pauvres mais +50% rendement avec compost", color: '#8D6E63' },
  { icon: '🐛', category: 'Manioc', text: "Mouche blanche + acariens verts : pulvérisez neem + savon noir", color: '#8D6E63' },
  { icon: '🌾', category: 'Manioc', text: "Associez manioc + arachide en intercalaire : azote gratuit", color: '#8D6E63' },

  // TOMATE (5 astuces)
  { icon: '🍅', category: 'Tomate', text: "Tuteurez les plants : évite maladies et facilite récolte (+40% rendement)", color: '#D32F2F' },
  { icon: '💧', category: 'Tomate', text: "Arrosez au pied JAMAIS sur feuilles : prévient mildiou", color: '#D32F2F' },
  { icon: '✂️', category: 'Tomate', text: "Supprimez gourmands (pousses entre tige et branche) chaque semaine", color: '#D32F2F' },
  { icon: '🌿', category: 'Tomate', text: "Plantez basilic entre tomates : repousse mouches blanches et pucerons", color: '#D32F2F' },
  { icon: '🧪', category: 'Tomate', text: "Bouillie bordelaise (cuivre) prévient mildiou : 3 traitements/saison max", color: '#D32F2F' },

  // PIMENT (4 astuces)
  { icon: '🌶️', category: 'Piment', text: "Le piment aime sols riches : ajoutez compost 3 semaines avant plantation", color: '#FF6F00' },
  { icon: '☀️', category: 'Piment', text: "Plein soleil obligatoire : min 6h/jour pour fruits piquants", color: '#FF6F00' },
  { icon: '💧', category: 'Piment', text: "Arrosez régulièrement mais sans excès : fruits + piquants si stress hydrique léger", color: '#FF6F00' },
  { icon: '🍂', category: 'Piment', text: "Paillez avec feuilles sèches : conserve humidité + repousse limaces", color: '#FF6F00' },

  // OIGNON (3 astuces)
  { icon: '🧅', category: 'Oignon', text: "L'oignon déteste excès d'eau : arrosez modérément, sols drainants", color: '#7B1FA2' },
  { icon: '🌱', category: 'Oignon', text: "Récoltez quand feuilles jaunissent et tombent (80-120 jours)", color: '#7B1FA2' },
  { icon: '🌾', category: 'Oignon', text: "Associez oignon + carotte : l'oignon repousse mouche de la carotte", color: '#7B1FA2' },

  // HARICOT (3 astuces)
  { icon: '🫘', category: 'Haricot', text: "Le haricot fixe 100kg azote/ha : culture parfaite avant maïs", color: '#388E3C' },
  { icon: '💧', category: 'Haricot', text: "Arrosez modérément : excès d'eau = pourriture des racines", color: '#388E3C' },
  { icon: '🌾', category: 'Haricot', text: "Semez en poquets (3 graines) tous les 40cm pour optimiser", color: '#388E3C' },

  // ARACHIDE (3 astuces)
  { icon: '🥜', category: 'Arachide', text: "L'arachide enrichit le sol : 150kg azote/ha fixé gratuitement", color: '#F57C00' },
  { icon: '🌱', category: 'Arachide', text: "Buttez les plants 30 jours après levée : favorise formation gousses", color: '#F57C00' },
  { icon: '☀️', category: 'Arachide', text: "Récoltez quand feuilles jaunissent : goûtez 1 gousse pour vérifier maturité", color: '#F57C00' },
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
export default function HomeScreen({ navigation }) {
  const { user, signOut } = useAuth();

  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const autoScrollTimer = useRef(null);
  const isManualScrolling = useRef(false);

  // Auto-scroll toutes les 3.5 secondes
  useEffect(() => {
    startAutoScroll();
    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, []);

  const startAutoScroll = () => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
    }

    autoScrollTimer.current = setInterval(() => {
      if (!isManualScrolling.current) {
        const nextIndex = (currentIndex + 1) % tips.length;
        scrollToIndex(nextIndex);
      }
    }, 3500);
  };

  const scrollToIndex = (index) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index: index,
        animated: true,
        viewPosition: 0.5
      });
    }
  };

  const handlePrevious = () => {
    const prevIndex = currentIndex === 0 ? tips.length - 1 : currentIndex - 1;
    isManualScrolling.current = true;
    scrollToIndex(prevIndex);
    
    // Réinitialiser le flag après l'animation
    setTimeout(() => {
      isManualScrolling.current = false;
    }, 500);
    
    startAutoScroll(); // Restart timer
  };

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % tips.length;
    isManualScrolling.current = true;
    scrollToIndex(nextIndex);
    
    // Réinitialiser le flag après l'animation
    setTimeout(() => {
      isManualScrolling.current = false;
    }, 500);
    
    startAutoScroll(); // Restart timer
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0 && !isManualScrolling.current) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 100
  }).current;

  const renderTipItem = ({ item: tip, index }) => (
    <View style={[styles.tipCard, { backgroundColor: tip.color }]}>
      <View style={styles.tipHeader}>
        <Text style={styles.tipIcon}>{tip.icon}</Text>
        <Text style={styles.tipCategory}>{tip.category}</Text>
      </View>
      <Text style={styles.tipText}>{tip.text}</Text>
    </View>
  );

  const getItemLayout = (data, index) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  });

  return (
    <ScrollView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.welcome}>
          Bonjour, {user?.email?.split('@')[0] || 'Agriculteur'} !
        </Text>
        <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      {/* CARROUSEL D'ASTUCES */}
      <View style={styles.carouselContainer}>
        <Text style={styles.carouselTitle}>💡 Astuces Agricoles</Text>

        {/* Indicateur de position */}
        <Text style={styles.carouselCounter}>
          {currentIndex + 1} / {tips.length}
        </Text>

        <View style={styles.carouselWrapper}>
          {/* Bouton Précédent */}
          <TouchableOpacity 
            style={styles.navButton} 
            onPress={handlePrevious}
            activeOpacity={0.7}
          >
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>

          {/* FlatList horizontal au lieu de ScrollView */}
          <FlatList
            ref={flatListRef}
            data={tips}
            renderItem={renderTipItem}
            keyExtractor={(item, index) => `tip-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={getItemLayout}
            decelerationRate="fast"
            snapToAlignment="center"
            snapToInterval={SCREEN_WIDTH}
            style={styles.carousel}
            contentContainerStyle={styles.carouselContent}
            onScrollBeginDrag={() => {
              isManualScrolling.current = true;
            }}
            onScrollEndDrag={() => {
              setTimeout(() => {
                isManualScrolling.current = false;
              }, 500);
            }}
          />

          {/* Bouton Suivant */}
          <TouchableOpacity 
            style={styles.navButton} 
            onPress={handleNext}
            activeOpacity={0.7}
          >
            <Text style={styles.navButtonText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Points indicateurs */}
        <View style={styles.dotsContainer}>
          {tips.slice(0, 5).map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                { 
                  backgroundColor: currentIndex === idx ? '#2e7d32' : '#ccc',
                  opacity: currentIndex === idx ? 1 : 0.5
                }
              ]}
            />
          ))}
          {tips.length > 5 && <Text style={styles.dotsMore}>...</Text>}
        </View>
      </View>
      {/* DASHBOARD */}
      <View style={styles.dashBoard}>
        <TouchableOpacity 
          style={styles.dashTile} 
          onPress={() => navigation.navigate('MyCrops', { mode: 'selection_diagnostic' })}
        >
          <Text style={styles.tileIcon}>🔍</Text>
          <Text style={styles.tileLabel}>Diagnostic</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.dashTile} 
          onPress={() => navigation.navigate('Catalogue')}
        >
          <Text style={styles.tileIcon}>🛒</Text>
          <Text style={styles.tileLabel}>Catalogue</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.dashTile} 
          onPress={() => navigation.navigate('Cart')}
        >
          <Text style={styles.tileIcon}>🛍️</Text>
          <Text style={styles.tileLabel}>Panier</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.dashTile} 
          onPress={() => navigation.navigate('Conversations')}
        >
          <Text style={styles.tileIcon}>💬</Text>
          <Text style={styles.tileLabel}>Messages</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.dashTile} 
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.tileIcon}>👤</Text>
          <Text style={styles.tileLabel}>Profil</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
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
  welcome: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  carouselContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  carouselTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  carouselCounter: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  carouselWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    zIndex: 10,
    elevation: 5,
  },
  navButtonText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 40,
  },
  carousel: {
    flex: 1,
  },
  carouselContent: {
    alignItems: 'center',
  },
  tipCard: {
    width: SCREEN_WIDTH - 80,
    marginHorizontal: 40,
    minHeight: 180,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  tipCategory: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tipText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotsMore: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  // DASHBOARD
  dashBoard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginHorizontal: 10,
    marginTop: 10,
  },
  dashTile: {
    width: '40%',
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 20,
    marginVertical: 10,
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tileIcon: { 
    fontSize: 32, 
    marginBottom: 8 
  },
  tileLabel: { 
    fontSize: 16, 
    fontWeight: '500',
    color: '#333'
  }, 
});
