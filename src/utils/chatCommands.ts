import { Document } from 'mongoose';
import { decrypt } from './encryption';
import { EventService } from '@/app/services/EventService';
import { connectToDatabase } from '@/lib/mongoose';
import { Event as EventModel } from '@/server/models/Event';

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
    console.log('[CHAT] processCommand chamado com:', message, 'userId:', userId);
    const normalizedMessage = message.toLowerCase();

    // --- EVENTOS ---
    // Listar eventos futuros
    if (
      /proxim[oa]s? eventos?|mostrar|listar|me mostre|ver|exibir|agenda|compromissos?/i.test(normalizedMessage)
    ) {
      try {
        if (typeof window === 'undefined') {
          await connectToDatabase();
          const events = await EventModel.find({ userId });
          console.log('[CHAT][SERVER] Eventos recebidos do banco:', events);
          if (events.length === 0) {
            return { success: true, message: 'Não há eventos futuros agendados.' };
          }
          // Formatar resposta manualmente (pode usar EventService.formatEventResponse se importar para cá)
          return {
            success: true,
            message: events.map(e => `- ${e.title} em ${e.start.toLocaleString('pt-BR')}`).join('\n')
          };
        } else {
          console.log('[CHAT] Buscando eventos...');
          const events = await EventService.getWeekEvents();
          console.log('[CHAT] Eventos recebidos do EventService.getWeekEvents:', events);
          if (events.length === 0) {
            return { success: true, message: 'Não há eventos futuros agendados.' };
          }
          atualizarCalendario();
          return {
            success: true,
            message: EventService.formatEventResponse(events)
          };
        }
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
      /criar|adicionar|agendar|agende|crie|novo compromisso|novo evento|agende|marque|registre|adicione|marcar|inserir|agendamento|agend[aeiou]/i.test(normalizedMessage)
    ) {
      try {
        // --- MELHORIA DO PARSER ---
        let title = '';
        let dateStr = '';
        let timeStr = '';
        let description = '';
        let dataMatch = message.match(/(?:dia|data|em|para|no dia|pra|para|hoje|amanhã)\s*(?:o\s+dia\s+)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i);
        let horaMatch = message.match(/(?:as|às|hora|horas)\s*(\d{1,2})[:\s]?(\d{2})?/i);
        let hojeMatch = message.match(/(hoje)/i);
        let amanhaMatch = message.match(/(amanhã|amanha)/i);
        // Extrair hora
        if (horaMatch) {
          const hours = horaMatch[1];
          const minutes = horaMatch[2] || '00';
          timeStr = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        }
        // Extrair data
        if (hojeMatch) {
          const hoje = new Date();
          dateStr = hoje.toLocaleDateString('pt-BR');
        } else if (amanhaMatch) {
          const amanha = new Date();
          amanha.setDate(amanha.getDate() + 1);
          dateStr = amanha.toLocaleDateString('pt-BR');
        } else if (dataMatch && dataMatch[1]) {
          dateStr = dataMatch[1].trim();
          if (dateStr && dateStr.split('/').length === 2) {
            dateStr += '/' + new Date().getFullYear();
          }
        }
        // Extrair tipo do evento
        let tipo = 'Evento';
        if (/reuni[aã]o/i.test(message)) tipo = 'Reunião';
        else if (/treinamento/i.test(message)) tipo = 'Treinamento';
        else if (/evento/i.test(message)) tipo = 'Evento';

        // Extrair base para título e descrição
        let titleRaw = message
          .replace(/crie?\s+um?\s+evento/i, '')
          .replace(/crie?\s+evento/i, '')
          .replace(/adicionar?\s+evento/i, '')
          .replace(/agendar?\s+evento/i, '')
          .replace(/agende?\s+um?\s+compromisso/i, '')
          .replace(/novo compromisso|novo evento|agende|criar|adicionar|agendar|crie|evento|compromisso|marque|registre|adicione/gi, '')
          .replace(/pro|pra|para|no dia|em|hoje|amanhã|amanha|às|as|hora|horas|dia|data/gi, '')
          .replace(/de nome|com nome|chamado/gi, '')
          .replace(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g, '')
          .replace(/\d{1,2}[:\s]?(\d{2})?/g, '')
          .replace(/[.,;:!?]/g, '') // remove pontuação
          .replace(/\s+/g, ' ')
          .trim();
        // Remover palavras soltas comuns do início/fim do título
        titleRaw = titleRaw.replace(/^(o|a|s|nome|do|da|de|um|uma|para|pro|pra|no|na|em|ao|à|e|com|sem)\s+/gi, '').replace(/\s+(o|a|s|nome|do|da|de|um|uma|para|pro|pra|no|na|em|ao|à|e|com|sem)$/gi, '').trim();

        // Extrair descrição
        let descricao = '';
        let descMatch = message.match(/(?:de descrição|descrição|sobre|detalhe|detalhes|observação|observacoes|obs)\s*[:\-]?\s*([^,\.\n]+)/i);
        if (descMatch && descMatch[1]) {
          descricao = descMatch[1].trim();
        } else {
          // Se houver vírgula e o texto após a última vírgula não for título, pode ser descrição
          if (message.includes(',')) {
            let partes = message.split(',');
            let afterComma = partes[partes.length - 1].trim();
            if (afterComma.length > 2 && !/\d{1,2}\/\d{1,2}/.test(afterComma) && !/\d{1,2}[:\s]?\d{2}/.test(afterComma)) {
              // Se o título já foi extraído, e o afterComma não é igual ao título, pode ser descrição
              if (afterComma !== titleRaw) {
                descricao = afterComma;
              }
            }
          }
        }

        // Extrair título (mais robusto)
        title = '';
        // 1. Se houver 'de nome', 'com nome', 'chamado', priorize esse trecho
        let nomeMatch = message.match(/(?:de nome|com nome|chamado)\s*[:,]?\s*([^,\.\n]+)/i);
        if (nomeMatch && nomeMatch[1]) {
          title = nomeMatch[1].replace(/[.,;:!?]/g, '').trim();
        } else if (message.includes(',')) {
          // 2. Se houver vírgula, pega o texto após a última vírgula, se não for data/hora
          let partes = message.split(',');
          let afterComma = partes[partes.length - 1].trim();
          if (!/\d{1,2}\/\d{1,2}/.test(afterComma) && !/\d{1,2}[:\s]?\d{2}/.test(afterComma) && afterComma.length > 2) {
            title = afterComma.replace(/[.,;:!?]/g, '').trim();
          } else {
            title = titleRaw;
          }
        } else {
          // 3. Se houver 'um ... de ...' ou 'um ... para ...' tente extrair o título depois disso
          let tituloMatch = titleRaw.match(/um (.+)/i);
          if (tituloMatch && tituloMatch[1]) {
            title = tituloMatch[1].trim();
          } else {
            // 4. Se não, pega o que sobrou
            title = titleRaw;
          }
        }
        // 5. Se ainda ficou genérico ou muito curto, tenta pegar as últimas 2-3 palavras relevantes
        if ((!title || title.length < 3 || title.split(' ').length <= 2) && titleRaw.split(' ').length > 2) {
          let palavras = titleRaw.split(' ');
          title = palavras.slice(-3).join(' ').trim();
        }
        // 6. Remover duplicidade de palavras comuns, palavras soltas e palavras de descrição
        title = title.replace(/\b(evento|pro|para|um|uma|o|a|de|do|da|no|na|em|com|e|as|os|ao|à|pra|pro|s|descrição|descriçã|vai|ser|blabla|detalhe|detalhes|sobre|observação|observacoes|obs)\b/gi, '').replace(/\s+/g, ' ').trim();
        // 7. Se ainda ficou vazio, use 'Evento sem título'
        if (!title || title.length < 2) title = 'Evento sem título';
        // Log para debug
        console.log('[CHAT][PARSE][TITULO FINAL]', title, '| Tipo:', tipo, '| Descrição:', descricao);
        // Mensagens de erro mais claras
        if (!title && (!dateStr || !timeStr)) {
          return {
            success: false,
            message: 'Por favor, forneça o título, data e hora do evento.\nExemplo: "Criar evento Reunião no dia 15/05 às 14:30"'
          };
        }
        if (!title) {
          return {
            success: false,
            message: 'Por favor, forneça o título do evento.\nExemplo: "Criar evento Reunião no dia 15/05 às 14:30"'
          };
        }
        if (!dateStr) {
          return {
            success: false,
            message: 'Por favor, forneça a data do evento.\nExemplo: "Criar evento Reunião no dia 15/05 às 14:30"'
          };
        }
        if (!timeStr) {
          return {
            success: false,
            message: 'Por favor, forneça o horário do evento.\nExemplo: "Criar evento Reunião no dia 15/05 às 14:30"'
          };
        }
        // Normalizar data para Date
        let [day, month, year] = dateStr.split('/').map(Number);
        if (!year) year = new Date().getFullYear();
        const [hour, minute] = timeStr.split(':').map(Number);
        const start = new Date(year, month - 1, day, hour, minute);
        const end = new Date(start.getTime() + 60 * 60 * 1000); // 1h padrão
        const event = {
          title,
          start,
          end,
          type: tipo,
          userId,
          ...(descricao ? { description: descricao } : {})
        };
        if (typeof window === 'undefined') {
          await connectToDatabase();
          let createdEvent = null;
          try {
            createdEvent = await EventModel.create(event);
          } catch (err) {
            console.error('[CHAT][SERVER][CREATE][ERRO]', err);
            return {
              success: false,
              message: 'Não foi possível criar o evento. Por favor, tente novamente.'
            };
          }
          if (!createdEvent || !createdEvent._id) {
            return {
              success: false,
              message: 'Não foi possível criar o evento. Por favor, tente novamente.'
            };
          }
          return {
            success: true,
            message: `✅ Evento criado com sucesso!\n\nAqui estão os detalhes do evento:\n- Título: ${createdEvent.title}\n- Data: ${dateStr}\n- Horário: ${timeStr}\n- Tipo: ${createdEvent.type}${createdEvent.description ? `\n- Descrição: ${createdEvent.description}` : ''}\n\nPosso ajudar com mais alguma coisa?`
          };
        } else {
          let createdEvent = null;
          try {
            createdEvent = await EventService.createEvent(event);
          } catch (err) {
            return {
              success: false,
              message: 'Não foi possível criar o evento. Por favor, tente novamente.'
            };
          }
          if (!createdEvent || !createdEvent.id) {
            return {
              success: false,
              message: 'Não foi possível criar o evento. Por favor, tente novamente.'
            };
          }
          atualizarCalendario();
          return {
            success: true,
            message: `✅ Evento criado com sucesso!\n\nAqui estão os detalhes do evento:\n- Título: ${createdEvent.title}\n- Data: ${dateStr}\n- Horário: ${timeStr}\n- Tipo: ${createdEvent.type}${createdEvent.description ? `\n- Descrição: ${createdEvent.description}` : ''}\n\nPosso ajudar com mais alguma coisa?`
          };
        }
      } catch (error) {
        console.error('[CHAT][CREATE][ERRO]', error);
        return {
          success: false,
          message: 'Não foi possível criar o evento. Por favor, tente novamente.'
        };
      }
    }

    // Excluir evento
    if (
      /exclua|excluir|remova|remover|delete|apague|apagar|exclui|deleta|deletar|apaga|remova o evento|exclua o evento|delete o evento|apague o evento/i.test(normalizedMessage)
    ) {
      try {
        // Extrair título e data
        let title = '';
        let dateStr = '';
        // Tenta pegar o título após 'evento' ou 'de nome'
        let titleMatch = message.match(/(?:evento|de nome|com nome|chamado)\s+([\w\s]+)/i);
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1].replace(/[.,;:!?]/g, '').trim();
        } else {
          // Se não encontrar, pega tudo após 'exclua' ou 'remova' ou após a última vírgula
          let altMatch = message.match(/(?:exclua|remova|delete|apague|apagar|deleta|deletar|apaga)\s+(.+)/i);
          if (altMatch && altMatch[1]) {
            let afterComma = altMatch[1].split(',');
            title = afterComma[afterComma.length - 1].replace(/evento|de nome|com nome|chamado|do dia|da data/gi, '').replace(/[.,;:!?]/g, '').trim();
          }
        }
        // Tenta pegar data se houver
        let dataMatch = message.match(/(?:dia|data|em|para|no dia|pra|para)\s*(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i);
        if (dataMatch && dataMatch[1]) {
          dateStr = dataMatch[1].trim();
          if (dateStr && dateStr.split('/').length === 2) {
            dateStr += '/' + new Date().getFullYear();
          }
        }
        if (!title) {
          return {
            success: false,
            message: 'Por favor, forneça o título do evento que deseja excluir.\nExemplo: "Exclua o evento Reunião de equipe do dia 15/05"'
          };
        }
        // Busca todos os eventos do usuário
        await connectToDatabase();
        const events = await EventModel.find({ userId });
        let eventToDelete = null;
        if (dateStr) {
          // Se forneceu data, busca por título e data
          let [day, month, year] = dateStr.split('/').map(Number);
          eventToDelete = events.find(e => {
            const eventDate = new Date(e.start);
            return (
              e.title.trim().toLowerCase() === title.trim().toLowerCase() &&
              eventDate.getDate() === day &&
              eventDate.getMonth() === month - 1 &&
              eventDate.getFullYear() === year
            );
          });
        } else {
          // Se não forneceu data, busca pelo título mais recente
          eventToDelete = events.reverse().find(e => e.title.trim().toLowerCase() === title.trim().toLowerCase());
        }
        if (!eventToDelete) {
          return {
            success: false,
            message: `Não encontrei nenhum evento chamado "${title}"${dateStr ? ` na data ${dateStr}` : ''}.` 
          };
        }
        // Exclui o evento
        await EventModel.deleteOne({ _id: eventToDelete._id });
        return {
          success: true,
          message: `🗑️ Evento excluído com sucesso!\n\nAqui estão os detalhes do evento removido:\n- Título: ${eventToDelete.title}\n- Data: ${eventToDelete.start.toLocaleDateString('pt-BR')}\n- Horário: ${new Date(eventToDelete.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}${eventToDelete.description ? `\n- Descrição: ${eventToDelete.description}` : ''}\n\nSe precisar de mais alguma coisa, estou à disposição.`
        };
      } catch (error) {
        console.error('[CHAT][DELETE][ERRO]', error);
        return {
          success: false,
          message: 'Não foi possível excluir o evento. Por favor, tente novamente.'
        };
      }
    }

    // Listar eventos da semana
    if (/eventos da semana|agenda da semana|semana|quais.*semana/i.test(normalizedMessage)) {
      try {
        await connectToDatabase();
        const events = await EventModel.find({ userId });
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfWeek = new Date(startOfToday);
        endOfWeek.setDate(startOfToday.getDate() + (7 - startOfToday.getDay())); // até domingo
        const weekEvents = events.filter(e => {
          const eventDate = new Date(e.start);
          return eventDate >= startOfToday && eventDate <= endOfWeek;
        });
        if (weekEvents.length === 0) {
          return {
            success: true,
            message: 'Não há eventos agendados para esta semana.'
          };
        }
        // Agrupar por dia
        const days: { [key: string]: typeof weekEvents } = {};
        weekEvents.forEach(e => {
          const d = new Date(e.start);
          const key = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
          if (!days[key]) days[key] = [];
          days[key].push(e);
        });
        let msg = 'Aqui estão os eventos agendados para esta semana:\n';
        Object.keys(days).forEach(day => {
          msg += `\n- ${day}:`;
          days[day].forEach((ev: any) => {
            const start = new Date(ev.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            msg += `\n  • ${ev.title} às ${start}`;
          });
        });
        return {
          success: true,
          message: msg
        };
      } catch (error) {
        console.error('[CHAT][WEEK][ERRO]', error);
        return {
          success: false,
          message: 'Não foi possível buscar os eventos da semana. Por favor, tente novamente.'
        };
      }
    }

    // Listar eventos do mês
    if (/eventos do mês|eventos do mes|compromissos do mês|compromissos do mes|agenda do mês|agenda do mes|me mostre os eventos do mês|me mostre os eventos do mes|me mostre os compromissos do mês|me mostre os compromissos do mes|eventos de [a-zç]+|compromissos de [a-zç]+|agenda de [a-zç]+|do mês [a-zç]+|do mes [a-zç]+|do mês \d{1,2}|do mes \d{1,2}/i.test(normalizedMessage)) {
      try {
        await connectToDatabase();
        const events = await EventModel.find({ userId });
        const now = new Date();
        let month = now.getMonth();
        let year = now.getFullYear();
        // Tenta extrair o mês por nome ou número
        const meses = ['janeiro','fevereiro','março','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
        let mesMatch = message.match(/m[eê]s\s+([a-zç]+)/i);
        let mesNumMatch = message.match(/m[eê]s\s+(\d{1,2})/i);
        let mesPorNome = null;
        if (mesMatch && mesMatch[1]) {
          mesPorNome = meses.findIndex(m => m.startsWith(mesMatch[1].toLowerCase()));
          if (mesPorNome >= 0) month = mesPorNome;
        } else if (mesNumMatch && mesNumMatch[1]) {
          const num = parseInt(mesNumMatch[1], 10);
          if (num >= 1 && num <= 12) month = num - 1;
        } else {
          // Tenta pegar "eventos de maio", "compromissos de junho", etc
          let deMesMatch = message.match(/de\s+([a-zç]+)/i);
          if (deMesMatch && deMesMatch[1]) {
            mesPorNome = meses.findIndex(m => m.startsWith(deMesMatch[1].toLowerCase()));
            if (mesPorNome >= 0) month = mesPorNome;
          }
        }
        // Tenta pegar o ano se informado
        let anoMatch = message.match(/(\d{4})/);
        if (anoMatch && anoMatch[1]) {
          year = parseInt(anoMatch[1], 10);
        }
        // Filtra eventos do mês
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
        const monthEvents = events.filter(e => {
          const eventDate = new Date(e.start);
          return eventDate >= startOfMonth && eventDate <= endOfMonth;
        });
        if (monthEvents.length === 0) {
          return {
            success: true,
            message: `Não há eventos agendados para ${meses[month]} de ${year}.`
          };
        }
        // Agrupar por dia (formato igual ao dos próximos eventos)
        const days: { [key: string]: typeof monthEvents } = {};
        monthEvents.forEach(e => {
          const d = new Date(e.start);
          const key = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
          if (!days[key]) days[key] = [];
          days[key].push(e);
        });
        let msg = `📅 Aqui estão seus eventos para ${meses[month]} de ${year}:`;
        Object.keys(days).forEach(day => {
          msg += `\n\n📅 ${day.charAt(0).toUpperCase() + day.slice(1)}`;
          days[day].forEach((ev: any, idx: number) => {
            const start = new Date(ev.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const end = new Date(ev.end).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const emoji = ev.type === 'Reunião' ? '👥' : ev.type === 'Treinamento' ? '📚' : '🎯';
            msg += `\n${idx + 1}. ${ev.title}\n   🕐 ${start} às ${end}\n   ${emoji} ${ev.type}`;
            if (ev.description) {
              msg += `\n   ℹ️ ${ev.description}`;
            }
          });
        });
        return {
          success: true,
          message: msg
        };
      } catch (error) {
        console.error('[CHAT][MONTH][ERRO]', error);
        return {
          success: false,
          message: 'Não foi possível buscar os eventos do mês. Por favor, tente novamente.'
        };
      }
    }

    // Se não for um comando conhecido
    console.log('[CHAT] Comando não reconhecido:', message);
    return {
      success: false,
      message: 'Comando não reconhecido. Use um dos seguintes formatos:\n' +
               '- "mostrar próximos eventos"\n' +
               '- "crie um evento [título] para o dia [dd/mm/yyyy] às [hh:mm]"\n' +
               '- "exclua o evento [título] do dia [dd]"'
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