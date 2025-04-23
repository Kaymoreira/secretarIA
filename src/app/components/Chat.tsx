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
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@chakra-ui/react';
import { ArrowUpIcon } from '@chakra-ui/icons';
import { FaTrash } from 'react-icons/fa';
import Logo from './Logo';
import MicrophoneButton from './MicrophoneButton';
import useChatStore from '../store/chatStore';
import { EventService } from '../services/EventService';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const formatEventResponse = (text: string) => {
  // Verifica se é uma resposta com eventos
  if (text.includes('**') && text.includes('•')) {
    return text.split('\n').map((line, index) => {
      // Formata data do evento
      if (line.startsWith('**')) {
        return `\n📅 ${line.replace(/\*\*/g, '')}`;
      }
      // Formata título do evento
      if (line.startsWith('•')) {
        return `\n${line}`;
      }
      // Formata horário
      if (line.includes('⏰')) {
        return `   ${line}`;
      }
      // Formata descrição
      if (line.trim().startsWith('📝')) {
        return `   ${line}`;
      }
      return line;
    }).join('\n');
  }
  return text;
};

export default function Chat() {
  const { messages, addMessage, clearMessages } = useChatStore();
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string = inputMessage) => {
    if (!text.trim()) return;

    addMessage(text, true);
    setInputMessage('');
    setIsProcessing(true);

    try {
      // Se a mensagem for sobre eventos da semana
      if (text.toLowerCase().includes('eventos') && text.toLowerCase().includes('semana')) {
        const events = await EventService.getWeekEvents();
        const response = EventService.formatEventResponse(events);
        addMessage(response, false);
      } else {
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
        addMessage(data.response || 'Desculpe, ocorreu um erro ao processar sua mensagem.', false);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      addMessage('Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.', false);
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

  const handleClearChat = () => {
    clearMessages();
    onClose();
    toast({
      title: 'Chat limpo com sucesso',
      status: 'success',
      duration: 2000,
      position: 'top-right',
    });
  };

  return (
    <Box p={0}>
      <Flex align="center" borderBottom="1px" borderColor="gray.200" bg="white">
        <Box px={6} py={4} width="100%">
          <HStack spacing={6} align="center" justify="space-between">
            <HStack spacing={6}>
              <Logo />
              <HStack spacing={2}>
                <Divider orientation="vertical" height="20px" borderColor="gray.300" />
                <Text fontSize="xl" color="gray.600" fontWeight="normal">
                  Chat
                </Text>
              </HStack>
            </HStack>
            <IconButton
              aria-label="Limpar chat"
              icon={<FaTrash />}
              onClick={onOpen}
              colorScheme="red"
              variant="ghost"
              size="sm"
            />
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
                <Text color="gray.500" fontSize="lg" fontFamily="'Inter', sans-serif">
                  Olá! Como posso ajudar você hoje?
                </Text>
                <Text color="gray.400" fontSize="md" mt={2} fontFamily="'Inter', sans-serif">
                  Você pode me perguntar sobre sua agenda, compromissos ou pedir para salvar suas senhas.
                </Text>
              </Box>
            ) : (
              messages.map((message) => (
                <Card
                  key={message.id}
                  alignSelf={message.isUser ? 'flex-end' : 'flex-start'}
                  maxW="80%"
                  bg={message.isUser ? 'purple.500' : 'white'}
                  color={message.isUser ? 'white' : 'inherit'}
                  boxShadow="sm"
                  borderRadius="lg"
                >
                  <CardBody py={2} px={4}>
                    <HStack spacing={3} align="start">
                      {!message.isUser && (
                        <Avatar size="sm" name="AI Assistant" bg="purple.500" />
                      )}
                      <Box>
                        <Text
                          fontSize="sm"
                          whiteSpace="pre-wrap"
                          wordBreak="break-word"
                          fontFamily="'Inter', sans-serif"
                          lineHeight="1.6"
                          letterSpacing="0.2px"
                        >
                          {message.isUser ? message.text : formatEventResponse(message.text)}
                        </Text>
                        <Text
                          fontSize="xs"
                          color={message.isUser ? 'whiteAlpha.700' : 'gray.500'}
                          mt={1}
                          fontFamily="'Inter', sans-serif"
                        >
                          {new Date(message.timestamp).toLocaleTimeString()}
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
              fontFamily="'Inter', sans-serif"
            />
            <IconButton
              aria-label="Enviar mensagem"
              icon={<ArrowUpIcon />}
              onClick={() => handleSendMessage()}
              colorScheme="purple"
              disabled={isProcessing || !inputMessage.trim()}
            />
            <MicrophoneButton
              onSpeechResult={handleSpeechResult}
              disabled={isProcessing}
            />
          </HStack>
        </Box>
      </Box>

      {/* Modal de confirmação para limpar chat */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontFamily="'Inter', sans-serif">Limpar Chat</ModalHeader>
          <ModalBody fontFamily="'Inter', sans-serif">
            Tem certeza que deseja limpar todo o histórico do chat? Esta ação não pode ser desfeita.
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancelar
            </Button>
            <Button colorScheme="red" onClick={handleClearChat}>
              Limpar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
} 