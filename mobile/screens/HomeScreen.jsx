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

// Le calcul magique : 
// Écran complet (SCREEN_WIDTH) 
// - 20 (marges gauche/droite du carouselContainer) 
// - 70 (largeur des deux boutons navBtn, 35x2)
const SLIDE_WIDTH = SCREEN_WIDTH - 90; 

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
export default function HomeScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    startTimer();
    return () => stopTimer();
  }, [currentIndex]);

  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => {
      let nextIndex = (currentIndex + 1) % tips.length;
      scrollToIndex(nextIndex);
    }, 4000); // 4 secondes donne un peu plus le temps de lire
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

  const onScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    if (roundIndex !== currentIndex && roundIndex >= 0 && roundIndex < tips.length) {
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
    // récupérer access_token
console.log("ACCESS_TOKEN=", data.session?.access_token)

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

              {/* L'astuce est ici : on couple pagingEnabled avec snapToInterval pour forcer le magnétisme */}
              <FlatList
                ref={flatListRef}
                data={tips}
                renderItem={renderTip}
                horizontal
                pagingEnabled
                snapToInterval={SLIDE_WIDTH}
                snapToAlignment="center"
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                keyExtractor={(_, index) => index.toString()}
                getItemLayout={(_, index) => ({
                  length: SLIDE_WIDTH,
                  offset: SLIDE_WIDTH * index,
                  index,
                })}
              />

              <TouchableOpacity style={styles.navBtn} onPress={() => handleManualPress('next')}>
                <Text style={styles.navIcon}>›</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.dotsRow}>
               {tips.slice(0, 8).map((_, i) => (
                 <View key={i} style={[styles.dot, currentIndex % 8 === i && styles.activeDot]} />
               ))}
            </View>
          </View>
        </>
      }
      data={[]}
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
    marginHorizontal: 10,
    marginVertical: 15,
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
    width: SLIDE_WIDTH, // La largeur exacte au pixel près
    marginHorizontal: 0, // IMPORTANT: Pas de marges latérales ici, sinon le calcul fausse
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
