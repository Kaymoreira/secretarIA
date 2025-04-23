'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { IconButton, useToast, Tooltip, Text, Box } from '@chakra-ui/react';
import { FaMicrophone } from 'react-icons/fa';
import { MdStop } from 'react-icons/md';
import SpeechRecognitionService from '../services/SpeechRecognitionService';

interface MicrophoneButtonProps {
  onSpeechResult: (text: string) => void;
  disabled?: boolean;
}

const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({ onSpeechResult, disabled = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [currentText, setCurrentText] = useState<string>('');
  const speechServiceRef = useRef<SpeechRecognitionService | null>(null);
  const [browserStatus, setBrowserStatus] = useState<string>('');
  const toast = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      speechServiceRef.current = new SpeechRecognitionService();
      
      // Detecta o navegador
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (userAgent.indexOf('edg') > -1) {
        setBrowserStatus('Edge');
      } else if (userAgent.indexOf('chrome') > -1) {
        setBrowserStatus('Chrome');
      } else {
        setBrowserStatus('Outro');
      }
    }
  }, []);

  const handleSpeechResult = useCallback((text: string, isFinal: boolean) => {
    setCurrentText(text);
    if (isFinal) {
      onSpeechResult(text);
      setIsListening(false);
      setCurrentText('');
      toast({
        title: 'Texto reconhecido',
        description: text,
        status: 'success',
        duration: 2000,
        isClosable: true,
        position: 'top-right',
      });
    }
  }, [onSpeechResult, toast]);

  const handleError = useCallback((errorMessage: string) => {
    console.error('Erro de reconhecimento:', errorMessage);
    setCurrentText('');
    toast({
      title: 'Erro no reconhecimento de voz',
      description: errorMessage,
      status: 'error',
      duration: 5000,
      isClosable: true,
      position: 'top-right',
    });
    setIsListening(false);
  }, [toast]);

  const handleEnd = useCallback(() => {
    setIsListening(false);
    setCurrentText('');
  }, []);

  const toggleListening = useCallback(() => {
    if (!speechServiceRef.current) {
      handleError('Serviço de reconhecimento de voz não inicializado');
      return;
    }

    if (isListening) {
      speechServiceRef.current.stopListening();
      setIsListening(false);
      setCurrentText('');
      toast({
        title: 'Gravação interrompida',
        status: 'info',
        duration: 2000,
        isClosable: true,
        position: 'top-right',
      });
    } else {
      try {
        speechServiceRef.current.startListening(
          handleSpeechResult,
          handleError,
          handleEnd
        );
        setIsListening(true);
        toast({
          title: 'Gravação iniciada',
          description: 'Fale agora...',
          status: 'info',
          duration: 2000,
          isClosable: true,
          position: 'top-right',
        });
      } catch (error) {
        handleError(`Erro ao iniciar gravação: ${error}`);
      }
    }
  }, [isListening, handleSpeechResult, handleError, handleEnd, toast]);

  const buttonTooltip = isListening 
    ? `Gravando no ${browserStatus}... Clique para parar` 
    : `Iniciar gravação no ${browserStatus}`;

  return (
    <Box position="relative">
      <Tooltip label={buttonTooltip} hasArrow>
        <IconButton
          aria-label={buttonTooltip}
          icon={isListening ? <MdStop /> : <FaMicrophone />}
          onClick={toggleListening}
          disabled={disabled}
          colorScheme={isListening ? 'red' : 'purple'}
          variant={isListening ? 'solid' : 'outline'}
          className={isListening ? 'animate-pulse' : ''}
          _hover={{
            transform: 'scale(1.05)',
          }}
        />
      </Tooltip>
      {currentText && (
        <Text
          position="absolute"
          bottom="-25px"
          left="50%"
          transform="translateX(-50%)"
          fontSize="sm"
          color="gray.600"
          width="max-content"
          maxWidth="300px"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
        >
          {currentText}
        </Text>
      )}
    </Box>
  );
};

export default MicrophoneButton; 