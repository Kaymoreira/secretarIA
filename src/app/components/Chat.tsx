'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Input,
  IconButton,
  Text,
  Avatar,
  useToast,
  Card,
  CardBody,
  Flex,
  Divider,
} from '@chakra-ui/react';
import { ArrowUpIcon } from '@chakra-ui/icons';
import Logo from './Logo';
import MicrophoneButton from './MicrophoneButton';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string = inputMessage) => {
    if (!text.trim()) return;

    const newMessage: Message = {
      id: Date.now(),
      text: text,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setIsProcessing(true);

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) {
        throw new Error('Erro na comunicação com o servidor');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: Date.now() + 1,
        text: data.response || 'Desculpe, ocorreu um erro ao processar sua mensagem.',
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      const assistantMessage: Message = {
        id: Date.now() + 1,
        text: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSpeechResult = (text: string) => {
    if (text.trim()) {
      handleSendMessage(text);
    }
  };

  return (
    <Box p={0}>
      <Flex align="center" borderBottom="1px" borderColor="gray.200" bg="white">
        <Box px={6} py={4}>
          <HStack spacing={6} align="center">
            <Logo />
            <HStack spacing={2}>
              <Divider orientation="vertical" height="20px" borderColor="gray.300" />
              <Text fontSize="xl" color="gray.600" fontWeight="normal">
                Chat
              </Text>
            </HStack>
          </HStack>
        </Box>
      </Flex>

      <Box 
        position="relative" 
        h="calc(100vh - 240px)"
        px={6}
      >
        <Box 
          flex="1" 
          overflowY="auto" 
          h="calc(100% - 70px)"
          pb={2}
        >
          <VStack spacing={4} align="stretch">
            {messages.length === 0 ? (
              <Box textAlign="center" py={10}>
                <Text color="gray.500" fontSize="lg">
                  Olá! Como posso ajudar você hoje?
                </Text>
                <Text color="gray.400" fontSize="md" mt={2}>
                  Você pode me perguntar sobre sua agenda, compromissos ou pedir para salvar suas senhas.
                </Text>
              </Box>
            ) : (
              messages.map((message) => (
                <Card
                  key={message.id}
                  alignSelf={message.sender === 'user' ? 'flex-end' : 'flex-start'}
                  maxW="80%"
                  bg={message.sender === 'user' ? 'purple.500' : 'white'}
                  color={message.sender === 'user' ? 'white' : 'inherit'}
                  boxShadow="sm"
                  borderRadius="lg"
                >
                  <CardBody py={2} px={4}>
                    <HStack spacing={3} align="start">
                      {message.sender === 'assistant' && (
                        <Avatar size="sm" name="AI Assistant" bg="purple.500" />
                      )}
                      <Box>
                        <Text
                          fontSize="sm"
                          whiteSpace="pre-wrap"
                          wordBreak="break-word"
                        >
                          {message.text}
                        </Text>
                        <Text
                          fontSize="xs"
                          color={message.sender === 'user' ? 'whiteAlpha.700' : 'gray.500'}
                          mt={1}
                        >
                          {message.timestamp.toLocaleTimeString()}
                        </Text>
                      </Box>
                    </HStack>
                  </CardBody>
                </Card>
              ))
            )}
            <div ref={messagesEndRef} />
          </VStack>
        </Box>

        <Box 
          position="absolute" 
          bottom={0} 
          left={0} 
          right={0} 
          px={6}
          py={3}
          bg="white" 
          borderTop="1px" 
          borderColor="gray.200"
        >
          <HStack>
            <Input
              placeholder="Digite sua mensagem..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isProcessing}
              focusBorderColor="purple.500"
              bg="white"
            />
            <IconButton
              aria-label="Enviar mensagem"
              icon={<ArrowUpIcon />}
              onClick={() => handleSendMessage()}
              isLoading={isProcessing}
              colorScheme="purple"
            />
            <MicrophoneButton
              onSpeechResult={handleSpeechResult}
              disabled={isProcessing}
            />
          </HStack>
        </Box>
      </Box>
    </Box>
  );
} 