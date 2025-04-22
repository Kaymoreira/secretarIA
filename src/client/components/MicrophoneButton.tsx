import React, { useState, useEffect, useCallback } from 'react';
import SpeechRecognitionService from '../services/SpeechRecognitionService';

interface MicrophoneButtonProps {
  onSpeechResult: (text: string) => void;
  disabled?: boolean;
}

const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({ onSpeechResult, disabled = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speechService] = useState(() => new SpeechRecognitionService());
  const [interimText, setInterimText] = useState<string>('');

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
    
    // Limpa o erro após 3 segundos
    setTimeout(() => setError(null), 3000);
  }, []);

  const handleEnd = useCallback(() => {
    setIsListening(false);
    setInterimText('');
  }, []);

  const toggleListening = useCallback(() => {
    if (!speechService.isSupported()) {
      handleError('Seu navegador não suporta reconhecimento de voz');
      return;
    }

    if (isListening) {
      speechService.stopListening();
    } else {
      setError(null);
      speechService.startListening(handleSpeechResult, handleError, handleEnd);
    }
    setIsListening(!isListening);
  }, [isListening, speechService, handleSpeechResult, handleError, handleEnd]);

  // Limpa o reconhecimento quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (isListening) {
        speechService.stopListening();
      }
    };
  }, [isListening, speechService]);

  return (
    <div className="relative">
      <button
        onClick={toggleListening}
        disabled={disabled}
        className={`
          p-3 rounded-lg transition-all duration-200
          ${disabled 
            ? 'bg-gray-300 cursor-not-allowed' 
            : isListening 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-blue-500 hover:bg-blue-600'
          }
          ${error ? 'animate-shake' : ''}
        `}
        title={error || (isListening ? 'Clique para parar' : 'Clique para falar')}
      >
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isListening ? (
            // Ícone de parar (X)
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            // Ícone de microfone
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 18.5v-2m0 0c3.5 0 6.5-2 6.5-6V8c0-4-3-6-6.5-6S5.5 4 5.5 8v2.5c0 4 3 6 6.5 6zM12 18.5a9 9 0 01-9-9V8h18v1.5a9 9 0 01-9 9z"
            />
          )}
        </svg>
      </button>

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
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-100 rounded text-sm text-gray-600 whitespace-nowrap">
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