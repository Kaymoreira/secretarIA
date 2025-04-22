'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { IconButton } from '@chakra-ui/react';
import { FaMicrophone } from 'react-icons/fa';
import { MdStop } from 'react-icons/md';
import SpeechRecognitionService from '../services/SpeechRecognitionService';

interface MicrophoneButtonProps {
  onSpeechResult: (text: string) => void;
  disabled?: boolean;
}

const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({ onSpeechResult, disabled = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');
  const [speechService] = useState(() => new SpeechRecognitionService());

  useEffect(() => {
    // Limpa o erro após 3 segundos
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSpeechResult = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      onSpeechResult(text);
      setInterimText('');
      setIsListening(false);
    } else {
      setInterimText(text);
    }
  }, [onSpeechResult]);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsListening(false);
    setInterimText('');
  }, []);

  const handleEnd = useCallback(() => {
    setIsListening(false);
    setInterimText('');
  }, []);

  const toggleListening = useCallback(() => {
    if (!speechService.isSupported()) {
      setError('Seu navegador não suporta reconhecimento de voz');
      return;
    }

    if (isListening) {
      speechService.stopListening();
      setIsListening(false);
      setInterimText('');
    } else {
      setError(null);
      speechService.startListening(
        handleSpeechResult,
        handleError,
        handleEnd
      );
      setIsListening(true);
    }
  }, [isListening, handleSpeechResult, handleError, handleEnd, speechService]);

  return (
    <div className="relative">
      <IconButton
        aria-label={isListening ? 'Parar gravação' : 'Iniciar gravação'}
        icon={isListening ? <MdStop /> : <FaMicrophone />}
        onClick={toggleListening}
        disabled={disabled}
        colorScheme={isListening ? 'red' : 'purple'}
        variant={isListening ? 'solid' : 'outline'}
      />

      {/* Feedback visual de gravação */}
      {isListening && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-1 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-1 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}

      {/* Texto intermediário */}
      {interimText && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-100 rounded text-sm text-gray-600 whitespace-nowrap max-w-xs truncate">
          {interimText}
        </div>
      )}

      {/* Mensagem de erro */}
      {error && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-red-100 text-red-600 rounded text-sm whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  );
};

export default MicrophoneButton; 