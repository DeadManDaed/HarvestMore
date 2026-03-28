//mobile/contexts/ChatContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);

  // Charger les conversations de l'utilisateur
  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        user:user_id (id, full_name, username, avatar_url),
        technician:technician_id (id, full_name, username, avatar_url)
      `)
      .or(`user_id.eq.${user.id},technician_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (error) console.error(error);
    else setConversations(data || []);
    setLoading(false);
  };

  // Créer ou récupérer une conversation avec un technicien
  const getOrCreateConversation = async (technicianId, diagnosisRequestId = null) => {
    // Vérifier si une conversation existe déjà
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(user_id.eq.${user.id},technician_id.eq.${technicianId})`)
      .maybeSingle();

    if (existing) {
      setCurrentConversation(existing);
      loadMessages(existing.id);
      return existing;
    }

    // Créer une nouvelle conversation
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        technician_id: technicianId,
        diagnosis_request_id: diagnosisRequestId
      })
      .select()
      .single();

    if (error) throw error;
    setCurrentConversation(newConv);
    loadMessages(newConv.id);
    fetchConversations(); // rafraîchir la liste
    return newConv;
  };

  // Charger les messages d'une conversation
  const loadMessages = async (conversationId) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:sender_id (id, full_name, username)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) console.error(error);
    else setMessages(data || []);

    // Abonnement Realtime pour cette conversation
    if (subscription) subscription.unsubscribe();

    const newSubscription = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    setSubscription(newSubscription);
  };

  // Envoyer un message
  const sendMessage = async (content) => {
  if (!currentConversation || !content.trim()) return;

  const { error } = await supabase
    .from('messages')
    .insert({
      conversation_id: currentConversation.id,
      sender_id: user.id,
      content: content.trim()
    });

  if (error) console.error(error);
  else {
    // Mettre à jour last_message
    await supabase
      .from('conversations')
      .update({
        last_message: content.trim(),
        last_message_at: new Date()
      })
      .eq('id', currentConversation.id);

    // Envoyer une notification au destinataire
    const recipientId = currentConversation.user_id === user.id
      ? currentConversation.technician_id
      : currentConversation.user_id;

    const senderName = profile?.full_name || 'Un utilisateur';

    // Appeler l'Edge Function
    await supabase.functions.invoke('send-message-notification', {
      body: {
        message: content.trim(),
        recipientId,
        conversationId: currentConversation.id,
        senderName
      }
    });
  }
};
  const leaveConversation = () => {
    if (subscription) subscription.unsubscribe();
    setCurrentConversation(null);
    setMessages([]);
  };

  return (
    <ChatContext.Provider value={{
      conversations,
      currentConversation,
      messages,
      loading,
      getOrCreateConversation,
      sendMessage,
      leaveConversation,
      fetchConversations
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);