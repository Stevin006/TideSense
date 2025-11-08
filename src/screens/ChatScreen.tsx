import { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import styled, { useTheme } from '../theme/styled';
import type { AppTheme } from '../theme/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type ChatScreenProps = NativeStackScreenProps<RootStackParamList, 'Chat'>;

const API_BASE =
  Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://127.0.0.1:8000';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const ChatScreen = ({ navigation, route }: ChatScreenProps) => {
  const theme = useTheme();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        "Hi! I'm your beach safety assistant. Ask me anything about riptides, ocean safety, or your recent detection results.",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    'What should I do if caught in a riptide?',
    'How can I spot a riptide?',
    'What are the warning signs?',
  ]);

  const flatListRef = useRef<FlatList>(null);
  const detection = route.params?.detection;

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Call backend chat endpoint
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          detection: detection || undefined,
          history: messages
            .slice(-10)
            .map((msg) => ({ role: msg.role, content: msg.content })),
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Add assistant response
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response || 'I apologize, I could not generate a response.',
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Update suggestions if provided
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
        }
      } else {
        throw new Error('Failed to get response');
      }
    } catch (err) {
      console.warn('Chat error:', err);

      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          "Sorry, I'm having trouble connecting to the server. Please make sure the backend is running and try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';

    return (
      <MessageContainer isUser={isUser}>
        <MessageBubble isUser={isUser}>
          {!isUser && (
            <MessageHeader>
              <Ionicons
                name="shield-checkmark"
                size={16}
                color={theme.colors.primary}
              />
              <AssistantLabel>Beach Safety AI</AssistantLabel>
            </MessageHeader>
          )}
          <MessageText isUser={isUser}>{item.content}</MessageText>
          <MessageTime isUser={isUser}>
            {item.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </MessageTime>
        </MessageBubble>
      </MessageContainer>
    );
  };

  return (
    <Container edges={['top', 'left', 'right']}>
      {/* Header */}
      <Header>
        <BackButton onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </BackButton>
        <HeaderContent>
          <HeaderTitle>Beach Safety AI</HeaderTitle>
          <HeaderSubtitle>Ask me anything about ocean safety</HeaderSubtitle>
        </HeaderContent>
      </Header>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* Suggestions */}
        {suggestions.length > 0 && !isLoading && (
          <SuggestionsContainer>
            <SuggestionsLabel>Suggested questions:</SuggestionsLabel>
            <SuggestionsScroll
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            >
              {suggestions.map((suggestion, idx) => (
                <SuggestionChip
                  key={idx}
                  onPress={() => handleSuggestionPress(suggestion)}
                >
                  <SuggestionText>{suggestion}</SuggestionText>
                </SuggestionChip>
              ))}
            </SuggestionsScroll>
          </SuggestionsContainer>
        )}

        {/* Input */}
        <InputContainer>
          <Input
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about beach safety..."
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            maxLength={500}
            editable={!isLoading}
            onSubmitEditing={() => sendMessage()}
            returnKeyType="send"
          />
          <SendButton
            onPress={() => sendMessage()}
            disabled={!inputText.trim() || isLoading}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.textPrimary} />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={
                  inputText.trim()
                    ? theme.colors.textPrimary
                    : theme.colors.textSecondary
                }
              />
            )}
          </SendButton>
        </InputContainer>
      </KeyboardAvoidingView>
    </Container>
  );
};

// Styled Components
type ThemeProps = { theme: AppTheme };

const themed =
  <T,>(fn: (theme: AppTheme) => T) =>
  ({ theme }: ThemeProps) =>
    fn(theme);

const Container = styled(SafeAreaView)<ThemeProps>`
  flex: 1;
  background-color: ${themed((theme) => theme.colors.background)};
`;

const Header = styled.View<ThemeProps>`
  flex-direction: row;
  align-items: center;
  padding: ${themed((theme) => `${theme.spacing(2)}px ${theme.spacing(3)}px`)};
  border-bottom-width: 1px;
  border-bottom-color: ${themed((theme) => theme.colors.divider)};
`;

const BackButton = styled.TouchableOpacity<ThemeProps>`
  padding: ${themed((theme) => `${theme.spacing(1)}px`)};
  margin-right: ${themed((theme) => `${theme.spacing(2)}px`)};
`;

const HeaderContent = styled.View`
  flex: 1;
`;

const HeaderTitle = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 18px;
  font-weight: 600;
`;

const HeaderSubtitle = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 13px;
  margin-top: 2px;
`;

const MessageContainer = styled.View<ThemeProps & { isUser: boolean }>`
  flex-direction: row;
  justify-content: ${({ isUser }: { isUser: boolean }) => (isUser ? 'flex-end' : 'flex-start')};
  margin-bottom: ${themed((theme) => `${theme.spacing(2)}px`)};
`;

const MessageBubble = styled.View<ThemeProps & { isUser: boolean }>`
  max-width: 75%;
  padding: ${themed((theme) => `${theme.spacing(2)}px ${theme.spacing(2.5)}px`)};
  border-radius: ${themed((theme) => `${theme.radii.lg}px`)};
  background-color: ${({ isUser, theme }: { isUser: boolean; theme: AppTheme }) =>
    isUser ? theme.colors.primary : theme.colors.cardBackground};
  border-width: ${({ isUser }: { isUser: boolean }) => (isUser ? 0 : 1)}px;
  border-color: ${themed((theme) => theme.colors.divider)};
`;

const MessageHeader = styled.View<ThemeProps>`
  flex-direction: row;
  align-items: center;
  gap: ${themed((theme) => `${theme.spacing(1)}px`)};
  margin-bottom: ${themed((theme) => `${theme.spacing(1)}px`)};
`;

const AssistantLabel = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.primary)};
  font-size: 12px;
  font-weight: 600;
`;

const MessageText = styled.Text<ThemeProps & { isUser: boolean }>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 15px;
  line-height: 21px;
`;

const MessageTime = styled.Text<ThemeProps & { isUser: boolean }>`
  color: ${({ isUser, theme }: { isUser: boolean; theme: AppTheme }) =>
    isUser ? theme.colors.textPrimary : theme.colors.textSecondary};
  font-size: 11px;
  margin-top: ${themed((theme) => `${theme.spacing(1)}px`)};
  opacity: 0.6;
`;

const SuggestionsContainer = styled.View<ThemeProps>`
  padding-vertical: ${themed((theme) => `${theme.spacing(2)}px`)};
  border-top-width: 1px;
  border-top-color: ${themed((theme) => theme.colors.divider)};
`;

const SuggestionsLabel = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 13px;
  font-weight: 500;
  padding-horizontal: ${themed((theme) => `${theme.spacing(2)}px`)};
  margin-bottom: ${themed((theme) => `${theme.spacing(1.5)}px`)};
`;

const SuggestionsScroll = styled.ScrollView<ThemeProps>``;

const SuggestionChip = styled.TouchableOpacity<ThemeProps>`
  background-color: ${themed((theme) => theme.colors.cardBackground)};
  border-width: 1px;
  border-color: ${themed((theme) => theme.colors.divider)};
  border-radius: ${themed((theme) => `${theme.radii.pill}px`)};
  padding: ${themed((theme) => `${theme.spacing(1.5)}px ${theme.spacing(2.5)}px`)};
`;

const SuggestionText = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 13px;
  font-weight: 500;
`;

const InputContainer = styled.View<ThemeProps>`
  flex-direction: row;
  align-items: flex-end;
  padding: ${themed((theme) => `${theme.spacing(2)}px ${theme.spacing(3)}px`)};
  border-top-width: 1px;
  border-top-color: ${themed((theme) => theme.colors.divider)};
  background-color: ${themed((theme) => theme.colors.cardBackground)};
`;

const Input = styled.TextInput<ThemeProps>`
  flex: 1;
  max-height: 100px;
  padding: ${themed((theme) => `${theme.spacing(2)}px ${theme.spacing(2.5)}px`)};
  background-color: ${themed((theme) => theme.colors.background)};
  border-radius: ${themed((theme) => `${theme.radii.md}px`)};
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 15px;
  border-width: 1px;
  border-color: ${themed((theme) => theme.colors.divider)};
`;

const SendButton = styled.TouchableOpacity<ThemeProps>`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  background-color: ${themed((theme) => theme.colors.primary)};
  align-items: center;
  justify-content: center;
  margin-left: ${themed((theme) => `${theme.spacing(2)}px`)};
`;
