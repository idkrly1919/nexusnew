import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useSupabase } from '../contexts/SupabaseContext';
import { MessageBubble } from '../components/MessageBubble';
import { ChatInput } from '../components/ChatInput';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { EmptyState } from '../components/EmptyState';
import { ConversationList } from '../components/ConversationList';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Message, Conversation } from '../types';

interface ChatScreenProps {}

export const ChatScreen: React.FC<ChatScreenProps> = () => {
  const { user, isAuthenticated } = useAuth();
  const supabase = useSupabase();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }, [user]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchConversations();
    } else {
      setConversations([]);
      setMessages([]);
    }
    setIsLoading(false);
  }, [isAuthenticated, user, fetchConversations]);

  // When selected conversation changes
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    } else {
      setMessages([]);
    }
  }, [selectedConversation, fetchMessages]);

  const handleSendMessage = async (text: string) => {
    if (!selectedConversation || !user) return;
    
    setIsSending(true);
    
    try {
      // Create message in DB
      const { data: newMessage, error: messageError } = await supabase
        .from('messages')
        .insert({ 
          conversation_id: selectedConversation.id, 
          user_id: user.id, 
          role: 'user', 
          content: text 
        })
        .select()
        .single();
      
      if (messageError) throw messageError;
      
      // Update UI immediately
      setMessages(prev => [...prev, {
        id: newMessage.id,
        conversation_id: selectedConversation.id,
        role: 'user',
        content: text,
        created_at: newMessage.created_at
      }]);
      
      // Simulate assistant response (replace with actual API call)
      setTimeout(() => {
        const assistantMessage = {
          id: `assistant-${Date.now()}`,
          conversation_id: selectedConversation.id,
          role: 'assistant' as const,
          content: "I understand your request. Let me help you with that.",
          created_at: new Date().toISOString()
        };
        
        // Save assistant message to DB
        supabase
          .from('messages')
          .insert(assistantMessage)
          .then(({ error }) => {
            if (!error) {
              setMessages(prev => [...prev, assistantMessage]);
            }
          });
          
        setIsSending(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error sending message:', error);
      setIsSending(false);
    }
  };

  const handleCreateNewChat = async () => {
    if (!user) return;
    
    try {
      const { data: newConversation, error } = await supabase
        .from('conversations')
        .insert({ 
          user_id: user.id, 
          title: "New Chat" 
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setSelectedConversation(newConversation);
      setConversations(prev => [newConversation, ...prev]);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);
        
      // Also delete messages
      await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);
        
      // Update UI
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  if (isLoading) {
    return <LoadingIndicator />;
  }

  if (!isAuthenticated) {
    return null; // Will be handled by navigation
  }

  return (
    <View style={styles.container}>
      {/* Sidebar with conversation list */}
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarTitle}>Your Chats</Text>
          <TouchableOpacity 
            style={styles.newChatButton}
            onPress={handleCreateNewChat}
          >
            <Icon name="add" size={24} color="#60a5fa" />
          </TouchableOpacity>
        </View>
        
        <ConversationList 
          conversations={conversations} 
          onSelectConversation={setSelectedConversation}
          onDeleteConversation={handleDeleteConversation}
        />
      </View>

      {/* Chat area */}
      <View style={styles.chatArea}>
        {selectedConversation ? (
          <>
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle}>
                {selectedConversation.title}
              </Text>
            </View>
            
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <MessageBubble message={item} />}
              contentContainerStyle={styles.messageList}
              showsVerticalScrollIndicator={false}
            />
            
            <ChatInput 
              onSend={handleSendMessage} 
              placeholder="Type a message..."
            />
          </>
        ) : (
          <EmptyState 
            title="Select or start a new chat"
            description="Choose a conversation from the sidebar or create a new one to get started."
            actionText="New Chat"
            onAction={handleCreateNewChat}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#111827',
  },
  sidebar: {
    width: '30%',
    backgroundColor: '#0f172a',
    borderRightWidth: 1,
    borderRightColor: '#374151',
    display: 'flex',
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  sidebarTitle: {
    color: '#e5e7eb',
    fontSize: 18,
    fontWeight: '600',
  },
  newChatButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#1f2937',
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  chatHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  chatTitle: {
    color: '#e5e7eb',
    fontSize: 20,
    fontWeight: '600',
  },
  messageList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});