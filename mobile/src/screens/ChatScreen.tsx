import { useState, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { supabase } from '../lib/supabase';
import { sendMessage } from '../services/ai';
import { StatusBar } from 'expo-status-bar';
import { Send, LogOut } from 'lucide-react-native';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export default function ChatScreen() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        
        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        const aiResponse = await sendMessage(userMsg.content, messages.map(m => ({ role: m.role, content: m.content })));
        
        const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: aiResponse || "Error" };
        setMessages(prev => [...prev, aiMsg]);
        setLoading(false);
    };

    const renderItem = ({ item }: { item: Message }) => (
        <View style={[
            styles.messageBubble, 
            item.role === 'user' ? styles.userBubble : styles.aiBubble
        ]}>
            <Text style={styles.messageText}>{item.content}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Quillix</Text>
                <TouchableOpacity onPress={() => supabase.auth.signOut()}>
                    <LogOut size={20} color="#a1a1aa" />
                </TouchableOpacity>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={(item: Message) => item.id}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            />

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={input}
                        onChangeText={setInput}
                        placeholder="Message..."
                        placeholderTextColor="#666"
                        multiline
                    />
                    <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                        <Send size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111014',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },
    listContent: {
        padding: 16,
        gap: 12,
    },
    messageBubble: {
        padding: 12,
        borderRadius: 16,
        maxWidth: '85%',
    },
    userBubble: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        backgroundColor: 'rgba(79, 70, 229, 0.2)',
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        color: 'white',
        fontSize: 16,
        lineHeight: 22,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        color: 'white',
        maxHeight: 100,
    },
    sendButton: {
        backgroundColor: '#4f46e5',
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    }
});