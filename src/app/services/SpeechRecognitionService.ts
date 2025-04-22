'use client';

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

class SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionImpl = (window as any).SpeechRecognition || 
                                  (window as any).webkitSpeechRecognition || 
                                  null;

      if (SpeechRecognitionImpl) {
        try {
          this.recognition = new SpeechRecognitionImpl();
          
          if (this.recognition) {
            this.recognition.lang = 'pt-BR';
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
          }
        } catch (error) {
          console.error('Erro ao inicializar reconhecimento de voz:', error);
          this.recognition = null;
        }
      }
    }
  }

  public isSupported(): boolean {
    return this.recognition !== null;
  }

  public startListening(
    onResult: (text: string, isFinal: boolean) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ): void {
    if (!this.recognition) {
      onError('Reconhecimento de voz não suportado');
      return;
    }

    if (this.isListening) {
      this.stopListening();
    }

    this.isListening = true;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;
      const isFinal = result.isFinal;
      onResult(text, isFinal);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = 'Erro no reconhecimento de voz';
      
      switch (event.error) {
        case 'not-allowed':
          errorMessage = 'Permissão de microfone negada';
          break;
        case 'no-speech':
          errorMessage = 'Nenhuma fala detectada';
          break;
        case 'network':
          errorMessage = 'Erro de rede';
          break;
        case 'aborted':
          errorMessage = 'Reconhecimento interrompido';
          break;
        default:
          errorMessage = `Erro: ${event.error}`;
      }
      
      onError(errorMessage);
      this.isListening = false;
    };

    this.recognition.onend = () => {
      this.isListening = false;
      onEnd();
    };

    try {
      this.recognition.start();
    } catch (error) {
      onError(`Erro ao iniciar: ${error}`);
      this.isListening = false;
    }
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
}

export default SpeechRecognitionService; 