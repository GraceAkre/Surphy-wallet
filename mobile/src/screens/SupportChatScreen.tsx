import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, MessageCircle, RotateCcw } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../App';
import { SUPPORT_TREE } from '../lib/supportTree';
import { shadows } from '../utils/shadows';
import { useHaptics } from '../hooks/useHaptics';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SupportChat'>;
  route: RouteProp<RootStackParamList, 'SupportChat'>;
};

type ChatMessage = {
  id: string;
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
};

let messageCounter = 0;
function nextId(): string {
  messageCounter += 1;
  return `msg-${messageCounter}-${Date.now()}`;
}

export default function SupportChatScreen({ navigation, route }: Props) {
  const { light } = useHaptics();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const initialNodeId = route.params?.initialNodeId;
  const startNodeId =
    initialNodeId && SUPPORT_TREE[initialNodeId] ? initialNodeId : 'welcome';
  const startNode = SUPPORT_TREE[startNodeId];

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: nextId(),
      text: startNode.botMessage,
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [currentNodeId, setCurrentNodeId] = useState(startNodeId);
  const [freeText, setFreeText] = useState('');

  const currentNode = SUPPORT_TREE[currentNodeId];

  const addMessages = useCallback(
    (newMessages: ChatMessage[]) => {
      setMessages((prev) => [...prev, ...newMessages]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    [],
  );

  const handleOptionPress = useCallback(
    (label: string, nextNodeId: string) => {
      light();

      const userMsg: ChatMessage = {
        id: nextId(),
        text: label,
        sender: 'user',
        timestamp: new Date(),
      };

      const nextNode = SUPPORT_TREE[nextNodeId];
      if (!nextNode) return;

      const botMsg: ChatMessage = {
        id: nextId(),
        text: nextNode.botMessage,
        sender: 'bot',
        timestamp: new Date(),
      };

      setCurrentNodeId(nextNodeId);
      addMessages([userMsg, botMsg]);
    },
    [light, addMessages],
  );

  const handleSendFreeText = useCallback(() => {
    const text = freeText.trim();
    if (!text) return;
    light();

    const userMsg: ChatMessage = {
      id: nextId(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };

    const botMsg: ChatMessage = {
      id: nextId(),
      text: 'Merci pour votre message. Notre équipe support reviendra vers vous rapidement.\n\nVous pouvez aussi nous écrire directement à support@surphy.fr pour un suivi personnalisé.',
      sender: 'bot',
      timestamp: new Date(),
    };

    setFreeText('');
    addMessages([userMsg, botMsg]);
  }, [freeText, light, addMessages]);

  const handleRestart = useCallback(() => {
    light();
    const welcomeNode = SUPPORT_TREE['welcome'];
    const botMsg: ChatMessage = {
      id: nextId(),
      text: welcomeNode.botMessage,
      sender: 'bot',
      timestamp: new Date(),
    };
    setCurrentNodeId('welcome');
    addMessages([botMsg]);
  }, [light, addMessages]);

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isBot = item.sender === 'bot';

      return (
        <View
          className={`mb-3 px-4 ${isBot ? 'items-start' : 'items-end'}`}
        >
          {isBot && (
            <View className="flex-row items-center gap-2 mb-1">
              <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
                <MessageCircle size={14} color="#FFFFFF" />
              </View>
              <Text className="text-caption1 text-ink-secondary font-medium">
                Surphy Bot
              </Text>
            </View>
          )}
          <View
            style={isBot ? shadows.soft : shadows.card}
            className={`
              rounded-2xl px-4 py-3 max-w-[85%]
              ${isBot ? 'bg-white rounded-tl-md ml-8' : 'bg-primary rounded-tr-md'}
            `}
          >
            <Text
              className={`text-body leading-relaxed ${
                isBot ? 'text-ink-primary' : 'text-white'
              }`}
            >
              {item.text}
            </Text>
          </View>
        </View>
      );
    },
    [],
  );

  const showOptions = currentNode?.options && !currentNode.isFinal;
  const showFreeTextInput = currentNodeId === 'other_freetext' || currentNodeId === 'card_other_freetext';
  const showRestart = currentNode?.isFinal;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View
          style={shadows.soft}
          className="flex-row items-center px-4 py-3 bg-white border-b border-separator-opaque/50"
        >
          <Pressable
            onPress={() => {
              light();
              navigation.goBack();
            }}
            className="w-10 h-10 items-center justify-center rounded-full"
            style={({ pressed }) => [
              { backgroundColor: pressed ? '#F2F2F7' : 'transparent' },
            ]}
          >
            <ArrowLeft size={24} color="#1D1D1F" />
          </Pressable>
          <View className="flex-1 items-center">
            <Text className="text-headline text-ink-primary font-semibold">
              Support
            </Text>
            <Text className="text-caption2 text-ink-secondary">
              Assistant automatique
            </Text>
          </View>
          <View className="w-10" />
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingTop: 16,
            paddingBottom: 16,
          }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* Bottom area */}
        <View
          style={[shadows.card, { paddingBottom: insets.bottom || 16 }]}
          className="bg-white border-t border-separator-opaque/50 px-4 pt-3"
        >
          {/* Quick-reply options */}
          {showOptions && currentNode.options && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
            >
              {currentNode.options.map((opt) => (
                <Pressable
                  key={opt.nextId}
                  onPress={() => handleOptionPress(opt.label, opt.nextId)}
                  style={({ pressed }) => [
                    shadows.soft,
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
                  className="bg-primary-50 border border-primary/20 px-4 py-2.5 rounded-full"
                >
                  <Text className="text-subheadline text-primary font-semibold">
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* Free text input for "Autre" */}
          {showFreeTextInput && (
            <View className="flex-row items-end gap-2 pb-3">
              <TextInput
                value={freeText}
                onChangeText={setFreeText}
                placeholder="Décrivez votre problème..."
                placeholderTextColor="#86868B"
                multiline
                className="flex-1 bg-gray-50 border border-separator-opaque/50 rounded-2xl px-4 py-3 text-body text-ink-primary max-h-24"
              />
              <Pressable
                onPress={handleSendFreeText}
                disabled={!freeText.trim()}
                style={({ pressed }) => [
                  shadows.primaryButton,
                  { opacity: pressed ? 0.85 : freeText.trim() ? 1 : 0.5 },
                ]}
                className="w-11 h-11 rounded-full bg-primary items-center justify-center"
              >
                <Send size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          )}

          {/* Restart button on final nodes */}
          {showRestart && !showFreeTextInput && (
            <Pressable
              onPress={handleRestart}
              style={({ pressed }) => [
                shadows.soft,
                { opacity: pressed ? 0.85 : 1 },
              ]}
              className="flex-row items-center justify-center gap-2 bg-primary-50 border border-primary/20 py-3 rounded-full mb-3"
            >
              <RotateCcw size={16} color="#3B82F6" />
              <Text className="text-subheadline text-primary font-semibold">
                Nouvelle question
              </Text>
            </Pressable>
          )}

          {/* Restart button also available for free text node */}
          {showFreeTextInput && (
            <Pressable
              onPress={handleRestart}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              className="flex-row items-center justify-center gap-2 pb-2"
            >
              <RotateCcw size={14} color="#86868B" />
              <Text className="text-caption1 text-ink-secondary font-medium">
                Nouvelle question
              </Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
