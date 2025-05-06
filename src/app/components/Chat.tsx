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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (text: string = inputMessage) => {
    if (!text.trim()) return;

    addMessage(text, true);
    setInputMessage('');
    setIsProcessing(true);

    try {
      // Lista de frases que indicam que o usuário quer ver eventos
      const viewEventPhrases = [
        'mostrar eventos', 'listar eventos', 'proximos eventos', 
        'eventos futuros', 'compromissos', 'agenda'
      ];
      
      // Lista de frases que indicam que o usuário quer criar eventos
      const createEventPhrases = [
        'criar evento', 'agendar evento', 'adicionar evento', 
        'marcar compromisso', 'novo evento', 'cadastrar evento'
      ];
      
      // Lista de frases que indicam que o usuário quer deletar eventos
      const deleteEventPhrases = [
        'deletar evento', 'excluir evento', 'apagar evento', 
        'remover evento', 'cancelar evento', 'cancelar compromisso'
      ];
      
      // Verificar se é uma consulta de visualização de eventos
      const isViewEventQuery = viewEventPhrases.some(phrase => 
        text.toLowerCase().includes(phrase.toLowerCase())
      );
      
      // Verificar se é um comando para criar evento
      const isCreateEventQuery = createEventPhrases.some(phrase => 
        text.toLowerCase().includes(phrase.toLowerCase())
      );
      
      // Verificar se é um comando para deletar evento
      const isDeleteEventQuery = deleteEventPhrases.some(phrase => 
        text.toLowerCase().includes(phrase.toLowerCase())
      );
      
      if (isViewEventQuery && !isCreateEventQuery && !isDeleteEventQuery) {
        // Processamento para visualização de eventos (já implementado)
        console.log('Solicitação de eventos detectada:', text);
        const events = await EventService.getWeekEvents();
        console.log('Eventos recuperados do EventService:', events);
        
        if (events.length === 0) {
          addMessage('Não há eventos agendados para os próximos dias.', false);
        } else {
          const response = EventService.formatEventResponse(events);
          console.log('Resposta formatada:', response);
          addMessage('Aqui estão os seus próximos eventos:\n\n' + response, false);
        }
      } 
      else if (isCreateEventQuery && !isDeleteEventQuery) {
        // Processamento para criação de eventos
        console.log('Solicitação de criação de evento detectada:', text);
        await handleCreateEventCommand(text);
      } 
      else if (isDeleteEventQuery) {
        // Processamento para exclusão de eventos
        console.log('Solicitação de exclusão de evento detectada:', text);
        await handleDeleteEventCommand(text);
      }
      else {
        // Processamento para outros comandos
        const response = await fetch('/api/chat', {
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
        if (data.error) {
          throw new Error(data.error);
        }
        
        addMessage(data.response || 'Desculpe, ocorreu um erro ao processar sua mensagem.', false);
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao processar sua mensagem',
        status: 'error',
        duration: 3000,
        position: 'top-right',
      });
      addMessage('Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.', false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Função para processar comandos de exclusão de eventos
  const handleDeleteEventCommand = async (message: string) => {
    try {
      // Primeiro listar eventos para permitir a seleção
      const events = await EventService.getWeekEvents();
      
      if (events.length === 0) {
        addMessage('Não há eventos agendados para excluir.', false);
        return;
      }
      
      // Verificar se o comando inclui um título específico
      const eventTitleMatch = message.match(/(?:deletar|excluir|apagar|remover|cancelar)\s+(?:evento|compromisso)\s+(.+?)(?:\s*$|\s+(?:do dia|dia|data))/i);
      const eventTitle = eventTitleMatch ? eventTitleMatch[1].trim() : '';
      
      if (eventTitle) {
        // Procurar pelo evento com o título especificado
        const eventToDelete = events.find(event => 
          event.title.toLowerCase().includes(eventTitle.toLowerCase())
        );
        
        if (eventToDelete) {
          // Deletar o evento encontrado
          await EventService.deleteEvent(eventToDelete.id);
          
          // Notificar calendário sobre a exclusão
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('atualizarEventosCalendario'));
          }
          
          addMessage(
            `✅ Evento "${eventToDelete.title}" foi excluído com sucesso!\n\n` +
            `Sua agenda foi atualizada.`,
            false
          );
        } else {
          // Não encontrou o evento com o título especificado
          addMessage(
            `Não encontrei nenhum evento com o título "${eventTitle}".\n\n` +
            `Por favor, verifique o título do evento e tente novamente.`,
            false
          );
        }
      } else {
        // Listar eventos para que o usuário possa escolher qual excluir
        const response = EventService.formatEventResponse(events);
        addMessage(
          'Para excluir um evento, por favor especifique qual evento deseja remover. ' +
          'Você pode usar "excluir evento [título do evento]".\n\n' +
          'Aqui estão seus próximos eventos:\n\n' + response,
          false
        );
      }
    } catch (error) {
      console.error('Erro ao excluir evento:', error);
      addMessage(
        'Não foi possível excluir o evento. Por favor, tente novamente usando o formato:\n\n' +
        '"Excluir evento [título do evento]"',
        false
      );
    }
  };

  // Função para processar comandos de criação de eventos
  const handleCreateEventCommand = async (message: string) => {
    try {
      // Extrair título do evento
      const titleMatch = message.match(/(?:evento|criar|adicionar|agendar|marcar|novo|cadastrar)\s+([^0-9]+?)(?:\s+(?:no dia|para o dia|dia|data|em|para|às|as|,)|$)/i);
      const title = titleMatch ? titleMatch[1].trim() : '';

      // Extrair data do evento
      const dateMatch = message.match(/(?:no dia|para o dia|dia|data|em|para)\s*(?:o\s+dia\s+)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{1,2}\s+de\s+[a-záàâãéèêíïóôõöúçñ]+(?:\s+de\s+\d{2,4})?)/i);
      let dateStr = '';
      
      if (dateMatch) {
        if (dateMatch[1].includes('/')) {
          // Formato dd/mm/yyyy
          dateStr = dateMatch[1].trim();
          
          // Adicionar ano se não estiver presente
          if (dateStr.split('/').length === 2) {
            dateStr += '/' + new Date().getFullYear();
          }
        } else {
          // Formato "dd de mes"
          const dateParts = dateMatch[1].toLowerCase().match(/(\d{1,2})\s+de\s+([a-záàâãéèêíïóôõöúçñ]+)(?:\s+de\s+(\d{2,4}))?/);
          
          if (dateParts) {
            const day = parseInt(dateParts[1]);
            const monthName = dateParts[2];
            const year = dateParts[3] ? parseInt(dateParts[3]) : new Date().getFullYear();
            
            // Mapear nome do mês para número
            const months = {
              'janeiro': 1, 'fevereiro': 2, 'março': 3, 'abril': 4,
              'maio': 5, 'junho': 6, 'julho': 7, 'agosto': 8,
              'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
            };
            
            const month = months[monthName as keyof typeof months] || 0;
            
            if (month > 0) {
              dateStr = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
            }
          }
        }
      }

      // Extrair hora do evento
      const timeMatch = message.match(/(?:às|as|hora|horário)\s*(\d{1,2})[:\s]?(\d{2})?(?:\s*(?:horas?|h))?/i);
      let timeStr = '';
      
      if (timeMatch) {
        const hours = timeMatch[1];
        const minutes = timeMatch[2] || '00';
        timeStr = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
      }

      console.log('Dados extraídos:', { title, dateStr, timeStr });
      
      // Validar dados extraídos
      if (!title || !dateStr || !timeStr) {
        addMessage(
          'Não consegui entender todos os detalhes do evento. Por favor, forneça o título, data e hora do evento.\n\n' +
          'Exemplo: "Criar evento Reunião de Equipe no dia 15/05 às 14:30"',
          false
        );
        return;
      }

      // Converter para objetos Date
      const [day, month, year] = dateStr.split('/').map(Number);
      const [hour, minute] = timeStr.split(':').map(Number);
      const start = new Date(year, month - 1, day, hour, minute);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hora de duração padrão
      
      // Criar evento
      const event = {
        title,
        start,
        end,
        type: 'Evento',
        description: message.includes('descrição') ? message.split('descrição')[1].trim() : undefined
      };
      
      console.log('Enviando evento para criação:', event);
      
      const createdEvent = await EventService.createEvent(event);
      console.log('Evento criado:', createdEvent);
      
      // Notificar calendário sobre o novo evento
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('atualizarEventosCalendario'));
      }
      
      // Responder ao usuário
      addMessage(
        `✅ Evento "${title}" criado com sucesso!\n\n` +
        `📅 Data: ${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}\n` +
        `⏰ Horário: ${timeStr}\n\n` +
        `Sua agenda foi atualizada.`,
        false
      );
      
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      addMessage(
        'Não foi possível criar o evento. Por favor, tente novamente usando o formato:\n\n' +
        '"Criar evento [título] no dia [dd/mm/yyyy] às [hh:mm]"',
        false
      );
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