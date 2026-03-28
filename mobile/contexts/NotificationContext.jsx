//mobile/contexts/NotificationContext.jsx

import React, { createContext, useContext, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

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
  const responseListener = useRef();

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

  // Écouter les notifications reçues
  useEffect(() => {
    registerForPushNotifications();

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const { data } = response.notification.request.content;
        if (data?.type === 'message' && data?.conversationId) {
          // Navigation vers la conversation
          // Utiliser un gestionnaire global ou un event emitter
          // Ici on peut déclencher un événement personnalisé
        }
      }
    );

    return () => {
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user]);

  // Fonction pour envoyer une notification (appelée depuis une Edge Function)
  const sendPushNotification = async (expoPushToken, title, body, data = {}) => {
    const message = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data,
    };

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  };

  return (
    <NotificationContext.Provider value={{ sendPushNotification, registerForPushNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);