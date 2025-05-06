import { Document } from 'mongoose';
import { decrypt } from './encryption';
import { EventService } from '@/app/services/EventService';

interface CommandResult {
  success: boolean;
  message: string;
}

interface CredentialDocument extends Document {
  title: string;
  login: string;
  password: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Definindo a URL base
const API_BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

// Função auxiliar para construir URLs absolutas
function getAbsoluteUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

// Função auxiliar para fazer requisições autenticadas
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  try {
    console.log('Iniciando requisição para:', url);
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('Status da resposta:', response.status);
    const contentType = response.headers.get('content-type');
    console.log('Content-Type da resposta:', contentType);

    if (response.status === 401) {
      throw new Error('Não autorizado - faça login novamente');
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resposta não-OK:', errorText);
      throw new Error(`Erro na requisição: ${response.status}`);
    }

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Resposta não-JSON:', text);
      throw new Error('Resposta inválida do servidor: formato não é JSON');
    }

    const data = await response.json();
    console.log('Dados recebidos:', data);
    
    if (!data || typeof data !== 'object') {
      throw new Error('Resposta inválida do servidor: formato inesperado');
    }

    return data;
  } catch (error: any) {
    console.error('Erro em fetchWithAuth:', error);
    if (error instanceof SyntaxError) {
      throw new Error('Resposta inválida do servidor: JSON inválido');
    }
    throw error;
  }
}

// Função auxiliar para limpar o título de palavras comuns
function cleanTitle(title: string): string {
  const commonWords = ['de', 'do', 'da', 'dos', 'das'];
  return title
    .split(' ')
    .filter(word => !commonWords.includes(word.toLowerCase()))
    .join(' ')
    .trim();
}

function atualizarCalendario() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('atualizarEventosCalendario'));
  }
}

export async function processCommand(message: string, userId: string): Promise<CommandResult> {
  try {
    console.log('[CHAT] processCommand chamado com:', message);
    const normalizedMessage = message.toLowerCase();

    // --- EVENTOS ---
    // Listar eventos futuros
    if (
      normalizedMessage.includes('proximos eventos') ||
      normalizedMessage.includes('mostrar eventos') ||
      normalizedMessage.includes('listar eventos')
    ) {
      try {
        console.log('[CHAT] Buscando eventos...');
        const events = await EventService.getWeekEvents();
        console.log('[CHAT] Eventos recebidos:', events);
        
        if (events.length === 0) {
          return { success: true, message: 'Não há eventos futuros agendados.' };
        }

        atualizarCalendario();
        return { 
          success: true, 
          message: EventService.formatEventResponse(events)
        };
      } catch (error) {
        console.error('[CHAT][GET][ERRO]', error);
        return { 
          success: false, 
          message: 'Não foi possível buscar os eventos. Por favor, tente novamente.' 
        };
      }
    }

    // Criar evento
    if (
      normalizedMessage.includes('criar evento') ||
      normalizedMessage.includes('adicionar evento') ||
      normalizedMessage.includes('agendar evento') ||
      normalizedMessage.includes('crie um evento')
    ) {
      try {
        // Parsing do comando
        let tituloMatch = message.match(/(?:evento|criar|adicionar|agendar)\s+([^0-9]+?)(?:\s+(?:as|às|para|no dia|em|,)|$)/i);
        let title = tituloMatch ? tituloMatch[1].trim() : '';

        let dataMatch = message.match(/(?:dia|data|em|para)\s*(?:o\s+dia\s+)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i);
        let dateStr = dataMatch ? dataMatch[1].trim() : '';
        if (dateStr && dateStr.split('/').length === 2) {
          dateStr += '/' + new Date().getFullYear();
        }

        let horaMatch = message.match(/(?:as|às|hora)\s*(\d{1,2})[:\s]?(\d{2})?/i);
        let timeStr = '';
        if (horaMatch) {
          const hours = horaMatch[1];
          const minutes = horaMatch[2] || '00';
          timeStr = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        }

        console.log('[CHAT][PARSE][CRIAR] title:', title, 'dateStr:', dateStr, 'timeStr:', timeStr);
        
        if (!title || !dateStr || !timeStr) {
          return { 
            success: false, 
            message: 'Formato inválido. Por favor, use o formato: "crie um evento [título] para o dia [dd/mm/yyyy] às [hh:mm]"'
          };
        }

        const [day, month, year] = dateStr.split('/').map(Number);
        const [hour, minute] = timeStr.split(':').map(Number);
        const start = new Date(year, month - 1, day, hour, minute);
        const end = new Date(start.getTime() + 60 * 60 * 1000); // 1h padrão
        
        const event = { 
          title, 
          start, 
          end, 
          type: 'Evento',
          userId 
        };

        console.log('[CHAT][CREATE] Criando evento:', event);
        await EventService.createEvent(event);
        atualizarCalendario();

        return { 
          success: true, 
          message: `Evento "${title}" criado com sucesso para o dia ${dateStr} às ${timeStr}. A agenda foi atualizada.` 
        };
      } catch (error) {
        console.error('[CHAT][CREATE][ERRO]', error);
        return { 
          success: false, 
          message: 'Não foi possível criar o evento. Por favor, tente novamente.' 
        };
      }
    }

    // Deletar evento
    if (
      normalizedMessage.includes('deletar evento') ||
      normalizedMessage.includes('excluir evento') ||
      normalizedMessage.includes('remover evento') ||
      normalizedMessage.includes('delete o evento')
    ) {
      try {
        let tituloMatch = message.match(/(?:deletar|excluir|remover|delete)\s+(?:o\s+)?evento\s+([^0-9]+?)(?:\s+(?:do|da|de|em|no|na|às|as|,)|$)/i);
        let title = tituloMatch ? tituloMatch[1].trim() : '';

        let dataMatch = message.match(/(?:dia|data|em|do dia)\s*(\d{1,2})/i);
        let dateStr = '';
        if (dataMatch) {
          const day = dataMatch[1].padStart(2, '0');
          const currentDate = new Date();
          const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
          const year = currentDate.getFullYear();
          dateStr = `${day}/${month}/${year}`;
        }

        console.log('[CHAT][PARSE][DELETAR] title:', title, 'dateStr:', dateStr);
        
        if (!title || !dateStr) {
          return { 
            success: false, 
            message: 'Formato inválido. Por favor, use o formato: "deletar evento [título] do dia [dd]"' 
          };
        }

        // Busca todos os eventos
        const events = await EventService.getWeekEvents();
        const [day, month, year] = dateStr.split('/').map(Number);
        
        // Encontra o evento pelo título e data
        const event = events.find((e: any) => {
          const eventDate = new Date(e.start);
          return e.title.toLowerCase() === title.toLowerCase() &&
                 eventDate.getDate() === day &&
                 eventDate.getMonth() === month - 1 &&
                 eventDate.getFullYear() === year;
        });

        if (!event) {
          return { success: false, message: 'Evento não encontrado para deletar.' };
        }

        // Deleta o evento
        await EventService.deleteEvent(event.id);
        atualizarCalendario();

        return { 
          success: true, 
          message: `Evento "${title}" do dia ${dateStr} foi excluído com sucesso. A agenda foi atualizada.` 
        };
      } catch (error) {
        console.error('[CHAT][DELETE][ERRO]', error);
        return { 
          success: false, 
          message: 'Não foi possível deletar o evento. Por favor, tente novamente.' 
        };
      }
    }

    // Se não for um comando conhecido
    return {
      success: false,
      message: 'Comando não reconhecido. Use um dos seguintes formatos:\n' +
               '- "mostrar próximos eventos"\n' +
               '- "crie um evento [título] para o dia [dd/mm/yyyy] às [hh:mm]"\n' +
               '- "deletar evento [título] do dia [dd]"'
    };
  } catch (err) {
    console.error('[CHAT][ERRO GLOBAL]', err);
    return { 
      success: false, 
      message: 'Erro inesperado no processamento do comando. Por favor, tente novamente.' 
    };
  }
}

async function handleShowPasswordCommand(cred: CredentialDocument | null): Promise<CommandResult> {
  if (!cred) {
    return {
      success: false,
      message: "Por favor, forneça uma credencial para buscar a senha."
    };
  }

  const cleanedTitle = cleanTitle(cred.title);

  try {
    const decryptedPassword = decrypt(cred.password);
    return {
      success: true,
      message: `Senha para "${cred.title}": ${decryptedPassword}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Erro ao descriptografar a senha para "${cred.title}". A senha pode estar corrompida.`
    };
  }
}

async function handleListPasswordsCommand(): Promise<string> {
  try {
    const response = await fetch(getAbsoluteUrl('/api/credentials'), {
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Erro na requisição');
    }

    const data = await response.json();
    
    if (!data.success || !data.credentials || data.credentials.length === 0) {
      return 'Nenhuma credencial encontrada. Use "guardar senha [título] [login] [senha]" para adicionar uma nova credencial.';
    }

    const credentialList = data.credentials.map((cred: CredentialDocument, index: number) => {
      return `${index + 1}. ${cred.title} (Login: ${cred.login})`;
    });

    return `Aqui estão suas credenciais salvas:\n\n${credentialList.join('\n')}\n\nPara ver a senha de uma credencial específica, use o comando "mostrar senha [título]".`;
  } catch (error) {
    console.error('Erro ao listar credenciais:', error);
    return 'Ocorreu um erro ao listar as credenciais. Por favor, tente novamente.';
  }
} 