// mobile/contexts/NotificationContext.jsx
import React, { createContext, useContext, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useChat } from './ChatContext';

const NotificationContext = createContext();

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const NotificationProvider = ({ children }) => {
  const { user, profile } = useAuth();
  const { getOrCreateConversation, sendMessage } = useChat();
  const responseListener = useRef();
  const navigationRef = useRef(); // À initialiser depuis AppNavigator

  // Enregistrer le token push
  const registerForPushNotifications = async () => {
    if (!user) return;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permission refusée pour les notifications');
        return;
      }

      // Configuration pour Android (canaux)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Messages',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2e7d32',
          enableVibrate: true,
          enableLights: true,
        });
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'votre-project-id', // À remplacer par votre projet Expo
      });

      // Sauvegarder le token dans Supabase
      if (token.data) {
        await supabase
          .from('profiles')
          .update({ expo_push_token: token.data })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Erreur lors de l’enregistrement du token:', error);
    }
  };

  // Fonction pour naviguer vers une conversation (à appeler depuis le listener)
  const navigateToConversation = (conversationId) => {
    if (navigationRef.current && navigationRef.current.isReady()) {
      navigationRef.current.navigate('Chat', { conversationId });
    }
  };

  // Gérer la réponse à une notification (clic ou action)
  const handleNotificationResponse = async (response) => {
    const { actionIdentifier, notification, userText } = response;
    const { data } = notification.request.content;

    if (!data?.conversationId) return;

    if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      // Simple clic sur la notification → ouvrir la conversation
      navigateToConversation(data.conversationId);
    } 
    else if (actionIdentifier === 'reply') {
      // L'utilisateur a cliqué sur "Répondre" et a saisi du texte
      if (userText && userText.trim()) {
        try {
          // Trouver la conversation ou la créer
          const { data: conversation } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', data.conversationId)
            .single();

          if (conversation) {
            // Vérifier que l'utilisateur fait bien partie de la conversation
            const isParticipant = conversation.user_id === user.id || conversation.technician_id === user.id;
            if (isParticipant) {
              // Envoyer le message
              await sendMessageToConversation(data.conversationId, userText.trim());
            } else {
              Alert.alert('Erreur', 'Vous n’êtes pas autorisé à répondre à cette conversation.');
            }
          }
        } catch (error) {
          console.error('Erreur lors de l’envoi via notification:', error);
          Alert.alert('Erreur', 'Impossible d’envoyer le message.');
        }
      } else {
        // Pas de texte, on ouvre juste la conversation
        navigateToConversation(data.conversationId);
      }
    }
    else if (actionIdentifier === 'ignore') {
      // Ne rien faire, l'utilisateur a ignoré
      console.log('Notification ignorée');
    }
  };

  // Fonction utilitaire pour envoyer un message (sans passer par le contexte si hors navigation)
  const sendMessageToConversation = async (conversationId, content) => {
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content,
      });

    if (error) {
      console.error(error);
      throw error;
    }

    // Mettre à jour last_message
    await supabase
      .from('conversations')
      .update({
        last_message: content,
        last_message_at: new Date(),
      })
      .eq('id', conversationId);
  };

  // Écouter les notifications reçues
  useEffect(() => {
  registerForPushNotifications();

  // Écouter les réponses aux notifications (clic ou actions)
  responseListener.current = Notifications.addNotificationResponseReceivedListener(
    handleNotificationResponse
  );

  return () => {
    if (responseListener.current) {
      responseListener.current.remove();
    }
  };
}, [user]);

  // Fonction pour envoyer une notification (appelée depuis l'Edge Function ou directement)
  const sendPushNotification = async (expoPushToken, title, body, data = {}) => {
    const message = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data,
      // Définir les actions personnalisées
      actions: [
        {
          actionId: 'reply',
          buttonTitle: 'Répondre',
          textInput: {
            submitButtonTitle: 'Envoyer',
            placeholder: 'Votre réponse...',
          },
        },
        {
          actionId: 'ignore',
          buttonTitle: 'Ignorer',
          destructive: true,
        },
      ],
      // Pour iOS, définir le comportement
      categoryIdentifier: 'message',
    };

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
      return await response.json();
    } catch (error) {
      console.error('Erreur d’envoi de notification:', error);
      throw error;
    }
  };

  // Méthode pour définir la référence de navigation (à appeler depuis AppNavigator)
  const setNavigationRef = (ref) => {
    navigationRef.current = ref;
  };

  return (
    <NotificationContext.Provider value={{ 
      sendPushNotification, 
      registerForPushNotifications,
      setNavigationRef,
      navigateToConversation,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);