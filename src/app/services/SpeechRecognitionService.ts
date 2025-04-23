'use client';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  onstart: () => void;
  onaudiostart: () => void;
  onsoundstart: () => void;
  onspeechstart: () => void;
  onspeechend: () => void;
  onsoundend: () => void;
  onaudioend: () => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface Window {
  SpeechRecognition: new () => SpeechRecognition;
  webkitSpeechRecognition: new () => SpeechRecognition;
}

export class SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private onResultCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onEndCallback: (() => void) | null = null;
  private silenceTimer: NodeJS.Timeout | null = null;
  private lastSpeechTime: number = 0;
  private readonly SILENCE_TIMEOUT = 4000; // 4 segundos de silêncio antes de finalizar
  private readonly FINAL_RESULT_DELAY = 2000; // 2 segundos após resultado final
  private readonly MIN_SPEECH_LENGTH = 1000; // 1 segundo mínimo de fala

  constructor() {
    this.initializeRecognition();
  }

  private initializeRecognition() {
    try {
      console.log('Iniciando inicialização do reconhecimento de voz...');
      console.log('Navegador:', navigator.userAgent);
      
      // Força o uso do webkitSpeechRecognition para Edge e Chrome
      const SpeechRecognitionAPI = (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognitionAPI) {
        throw new Error('Reconhecimento de voz não é suportado neste navegador');
      }

      // Se houver uma instância anterior, limpa ela primeiro
      if (this.recognition) {
        this.recognition.onend = () => {};
        this.recognition.onresult = () => {};
        this.recognition.onerror = () => {};
        this.recognition.abort();
        this.recognition = null;
      }
      
      this.recognition = new SpeechRecognitionAPI();

      if (!this.recognition) {
        throw new Error('Falha ao criar instância do reconhecimento de voz');
      }

      // Configurações básicas
      this.recognition.lang = 'pt-BR';
      this.recognition.continuous = true; // Alterado para true para manter escutando
      this.recognition.interimResults = true;

      this.setupEventListeners();
      console.log('Reconhecimento de voz inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar reconhecimento:', error);
      this.recognition = null;
    }
  }

  private resetSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }
    this.lastSpeechTime = Date.now();
    this.silenceTimer = setTimeout(() => {
      const timeSinceLastSpeech = Date.now() - this.lastSpeechTime;
      console.log('Verificando silêncio...', timeSinceLastSpeech);
      if (timeSinceLastSpeech >= this.SILENCE_TIMEOUT) {
        console.log('Silêncio prolongado detectado, finalizando reconhecimento...');
        if (this.isListening) {
          this.stopListening();
        }
      }
    }, this.SILENCE_TIMEOUT);
  }

  private setupEventListeners() {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      console.log('Reconhecimento iniciado');
      this.isListening = true;
      this.lastSpeechTime = Date.now();
      this.resetSilenceTimer();
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (!this.onResultCallback) return;

      try {
        const result = event.results[event.results.length - 1];
        if (!result) return;

        const transcript = result[0]?.transcript?.trim();
        if (!transcript) return;

        const currentTime = Date.now();
        const speechDuration = currentTime - this.lastSpeechTime;
        
        console.log('Texto reconhecido:', transcript, 'Final:', result.isFinal, 'Duração:', speechDuration);
        
        // Atualiza o tempo da última fala e reseta o timer
        this.lastSpeechTime = currentTime;
        this.resetSilenceTimer();

        // Sempre envia o resultado para atualização em tempo real
        this.onResultCallback(transcript, result.isFinal);

        // Se for resultado final, aguarda um pouco antes de finalizar
        if (result.isFinal) {
          if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
          }
          this.silenceTimer = setTimeout(() => {
            console.log('Finalizando após resultado final...');
            this.stopListening();
            this.initializeRecognition(); // Reinicializa para próxima captura
          }, this.FINAL_RESULT_DELAY);
        }
      } catch (error) {
        console.error('Erro ao processar resultado:', error);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Erro no reconhecimento:', event.error);
      console.error('Mensagem de erro:', event.message);
      if (this.onErrorCallback) {
        this.onErrorCallback(event.message || event.error);
      }
      // Em caso de erro, tenta reinicializar
      this.stopListening();
      this.initializeRecognition();
    };

    this.recognition.onend = () => {
      console.log('Reconhecimento finalizado');
      this.isListening = false;
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
      if (this.onEndCallback) {
        this.onEndCallback();
      }
      // Reinicializa para próxima captura
      this.initializeRecognition();
    };

    this.recognition.onsoundstart = () => {
      console.log('Som detectado');
      this.resetSilenceTimer();
    };

    this.recognition.onspeechstart = () => {
      console.log('Fala detectada');
      this.lastSpeechTime = Date.now();
      this.resetSilenceTimer();
    };

    this.recognition.onspeechend = () => {
      console.log('Fala finalizada');
      const timeSinceLastSpeech = Date.now() - this.lastSpeechTime;
      console.log('Tempo desde última fala:', timeSinceLastSpeech);
      
      // Aguarda um pouco mais antes de considerar que a fala realmente terminou
      setTimeout(() => {
        const currentTimeSinceLastSpeech = Date.now() - this.lastSpeechTime;
        if (currentTimeSinceLastSpeech >= this.SILENCE_TIMEOUT) {
          console.log('Tempo suficiente de silêncio após fala, finalizando...');
          this.stopListening();
        }
      }, this.SILENCE_TIMEOUT);
    };
  }

  public startListening(
    onResult: (text: string, isFinal: boolean) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ) {
    if (!this.recognition) {
      this.initializeRecognition();
      if (!this.recognition) {
        onError('Reconhecimento de voz não inicializado');
        return;
      }
    }

    if (this.isListening) {
      this.stopListening();
    }

    this.onResultCallback = onResult;
    this.onErrorCallback = onError;
    this.onEndCallback = onEnd;
    this.lastSpeechTime = Date.now();

    try {
      this.recognition.start();
    } catch (error) {
      console.error('Erro ao iniciar reconhecimento:', error);
      onError('Erro ao iniciar reconhecimento de voz');
      this.initializeRecognition();
    }
  }

  public stopListening() {
    if (!this.recognition || !this.isListening) return;

    try {
      this.recognition.stop();
      this.isListening = false;
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    } catch (error) {
      console.error('Erro ao parar reconhecimento:', error);
    }
  }

  public isRecognitionActive(): boolean {
    return this.isListening;
  }
}

export default SpeechRecognitionService; 