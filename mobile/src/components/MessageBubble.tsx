import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface MessageBubbleProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
  };
  style?: ViewStyle;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, style }) => {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Icon name="smart-toy" size={24} color="#60a5fa" />
          </View>
        )}
        <View style={styles.content}>
          <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
            {message.content}
          </Text>
        </View>
        {isUser && (
          <View style={styles.avatar}>
            <Icon name="person" size={24} color="#60a5fa" />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#1f2937',
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    backgroundColor: '#0f172a',
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
    marginHorizontal: 8,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#e5e7eb',
  },
  assistantText: {
    color: '#e5e7eb',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0b1220',
    justifyContent: 'center',
    alignItems: 'center',
  },
});