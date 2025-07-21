import { ChatOpenAI } from "langchain/chat_models/openai";
import { PromptTemplate } from "langchain/prompts";
import { LLMChain } from "langchain/chains";
import { HumanMessage, SystemMessage } from "langchain/schema";
import { connectToDatabase } from '@/lib/mongoose';
import { Event as EventModel } from '@/server/models/Event';
import { EventService } from '@/app/services/EventService';
import { sendEventConfirmationEmail, scheduleReminderEmail } from './emailService';

// Configuração do modelo
const model = new ChatOpenAI({
  temperature: 0.7,
  modelName: "gpt-3.5-turbo",
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Modelo para conversas naturais
const chat = new ChatOpenAI({
  temperature: 0.8,
  modelName: "gpt-3.5-turbo",
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Função para obter o template com a data atual
const getCommandPromptTemplate = () => {
  const now = new Date();
  const today = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getDate().toString().padStart(2, '0')}/${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}/${tomorrow.getFullYear()}`;
  
  return `Você é um assistente de calendário inteligente chamado SecretarIA.
Analise o seguinte comando do usuário e extraia as informações necessárias:

Comando: {command}

A data atual é: ${today}
A data de amanhã é: ${tomorrowStr}

Extraia as seguintes informações em formato JSON:
{{
  "action": "criar" | "listar" | "excluir" | "editar" | "conversa" | "desconhecido",
  "title": "título do evento",
  "date": "data no formato dd/mm/yyyy",
  "time": "horário no formato hh:mm",
  "description": "descrição do evento",
  "type": "Reunião" | "Treinamento" | "Evento",
  "period": "semana" | "mês" | "futuro" | null,
  "conversationTopic": "tópico da conversa se for uma pergunta geral"
}}

Regras importantes:
1. Para datas relativas:
   - "hoje" = ${today} (data atual)
   - "amanhã" = ${tomorrowStr} (data atual + 1 dia)
2. Se não houver data específica, use a data atual: ${today}
3. Se não houver horário específico, use "09:00"
4. Para ações de listagem, identifique se é para semana ou mês
5. Para exclusão, priorize o título do evento
6. Para edição, identifique o título do evento a ser editado e as novas informações
7. Se o comando for uma saudação ou pergunta geral (como "olá", "oi", "quem é você"), use action: "conversa" e identifique o tópico
8. Se o comando não for reconhecido, use action: "desconhecido"

Responda APENAS com o JSON, sem texto adicional.`;
};

// Template para extração de informações do comando
const commandPrompt = new PromptTemplate({
  inputVariables: ["command"],
  template: getCommandPromptTemplate()
});

// Template para formatação da resposta
const responsePrompt = new PromptTemplate({
  inputVariables: ["action", "result", "details", "userMessage"],
  template: `Você é SecretarIA, uma assistente virtual inteligente e simpática. Responda ao usuário de forma natural, amigável e contextual, como se estivesse conversando com ele. Use emojis quando apropriado, seja clara e prestativa.

Mensagem do usuário: {userMessage}
Ação realizada: {action}
Resultado: {result}
Detalhes: {details}

INSTRUÇÕES IMPORTANTES:

1. Ao listar eventos, use a formatação já preparada no campo 'formattedEvents' dos detalhes, se disponível.

2. Quando listar eventos, apresente-os de forma organizada e visual:
   - Use emojis relevantes para cada tipo de evento
   - Destaque o título do evento em negrito
   - Apresente a data e hora de forma amigável ("Hoje às 14:00" em vez de "10/05/2025 14:00")
   - Separe cada evento com uma linha em branco para facilitar a leitura

3. Se não houver eventos para mostrar, seja amigável e ofereça ajuda para criar novos eventos.

4. Seja sempre amigável, prestativa e conversacional.

Exemplos de resposta:
- "Olá! Aqui estão seus eventos da semana: 📅"
- "Prontinho! Evento criado com sucesso! 🎉"
- "Não encontrei nenhum evento com esse nome. Quer tentar de novo?"
- "Se precisar de mais alguma coisa, é só me chamar! 😊"

Responda em português do Brasil com naturalidade como uma assistente virtual amigável.`
});

// Cadeia de processamento do comando
const commandChain = new LLMChain({
  llm: model,
  prompt: commandPrompt,
});

// Cadeia de formatação da resposta
const responseChain = new LLMChain({
  llm: model,
  prompt: responsePrompt,
});

interface CommandResult {
  success: boolean;
  message: string;
}

// Função para obter o nome do mês atual em português
function getCurrentMonthName(): string {
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  const currentMonth = new Date().getMonth(); // 0-indexed (0 = janeiro, 11 = dezembro)
  return months[currentMonth];
}

// Função para limpar caracteres estranhos das mensagens
function cleanMessage(text: string): string {
  return text
    .replace(/\\n/g, '\n') // Corrigir quebras de linha escapadas
    .replace(/\u0026\u0026/g, 'e') // Substituir && por 'e'
    .replace(/\u003e=/g, '>=') // Corrigir operadores
    .replace(/\u003c=/g, '<=') // Corrigir operadores
    .replace(/\u003e/g, '>') // Corrigir operadores
    .replace(/\u003c/g, '<') // Corrigir operadores
    .replace(/\u2013/g, '-') // Corrigir traços
    .replace(/\u2014/g, '-') // Corrigir traços
    .replace(/\u201c|\u201d/g, '"') // Corrigir aspas
    .replace(/\u2018|\u2019/g, "'") // Corrigir aspas simples
    .trim();
}

export async function processCommand(message: string, userId: string): Promise<CommandResult> {
  try {
    console.log('[CHAT] Processando comando:', message);

    // Extrair informações do comando usando LangChain
    const commandResult = await commandChain.call({ command: message });
    const commandInfo = JSON.parse(commandResult.text);

    console.log('[CHAT] Informações extraídas:', commandInfo);

    // Processar a ação baseada nas informações extraídas
    let result: any = null;
    let details: any = null;

    switch (commandInfo.action) {
      case 'criar':
        result = await handleCreateEvent(commandInfo, userId);
        // Disparar evento para atualizar o calendário
        if (typeof window !== 'undefined' && result.success) {
          const evento = new CustomEvent('atualizarEventosCalendario');
          window.dispatchEvent(evento);
        }
        break;
      case 'listar':
        result = await handleListEvents(commandInfo, userId);
        break;
      case 'excluir':
        result = await handleDeleteEvent(commandInfo, userId);
        // Disparar evento para atualizar o calendário
        if (typeof window !== 'undefined' && result.success) {
          const evento = new CustomEvent('atualizarEventosCalendario');
          window.dispatchEvent(evento);
        }
        break;
      case 'editar':
        result = await handleEditEvent(commandInfo, userId);
        // Disparar evento para atualizar o calendário
        if (typeof window !== 'undefined' && result.success) {
          const evento = new CustomEvent('atualizarEventosCalendario');
          window.dispatchEvent(evento);
        }
        break;
      case 'conversa':
        // Lidar com perguntas gerais e saudações
        result = {
          success: true,
          conversationTopic: commandInfo.conversationTopic
        };
        break;
      default:
        // Usar o LangChain para gerar uma resposta mais natural e contextual
        const conversationResponse = await chat.invoke([
          new SystemMessage(`Você é a SecretarIA, uma assistente virtual inteligente e amigável. 
          A data atual é ${new Date().toLocaleDateString('pt-BR')}.
          O mês atual é ${getCurrentMonthName()}.
          
          Você deve:
          1. Responder de forma natural e conversacional
          2. Ser útil e prestativa, mesmo quando não entender exatamente o que o usuário quer
          3. Sugerir funcionalidades relevantes baseadas no contexto da conversa
          4. Nunca usar respostas genéricas como "Desculpe, não entendi o comando"
          5. Explicar o que você pode fazer de forma amigável e contextual
          6. Quando perguntado sobre o mês atual, sempre responder que estamos no mês de ${getCurrentMonthName()}
          
          Suas principais funcionalidades são:
          - Gerenciar eventos no calendário (criar, editar, listar, excluir)
          - Armazenar e gerenciar senhas
          - Responder perguntas gerais
          - Conversar de forma natural
          
          IMPORTANTE SOBRE FORMATAÇÃO:
          1. Quando listar eventos ou confirmar a criação de um evento, use formatação clara com emojis e quebras de linha
          
          2. Para confirmar a criação de um evento, use o seguinte formato:
             "Evento **[TÍTULO]** criado com sucesso! [EMOJI APROPRIADO]\n\n" +
             "**Detalhes do evento:**\n" +
             "• **Data:** [DIA] de [MÊS] de [ANO]\n" +
             "• **Horário:** [HORA]:[MINUTOS]\n" +
             "• **Duração:** [DURAÇÃO]\n" +
             "• **Tipo:** [TIPO]\n" +
             (se houver descrição) "• **Descrição:** [DESCRIÇÃO]\n"
          
          3. Para eventos, use emojis apropriados:
             - Reuniões: 💼 (pasta de trabalho) em vez de 📅 (calendário)
             - Aniversários: 🎂 (bolo)
             - Consultas médicas: 🏥 (hospital)
             - Eventos com pets: 🐾 (pata)
             - Viagens: ✈️ (avião)
             - Eventos gerais: 📌 (alfinete)
          
          4. Use negrito para destacar informações importantes
          5. Apresente datas no formato "dia de mês de ano" (ex: "8 de maio de 2025")
          6. Apresente horários no formato "HH:MM" (ex: "14:30")
          
          Responda de forma breve, amigável e útil.`),
          new HumanMessage(message)
        ]);
        
        return {
          success: true,
          message: cleanMessage(conversationResponse.content.toString())
        };
    }

    // Preparar detalhes para a resposta
    let detailsObj = result;
    
    // Adicionar formatação especial para listagem de eventos
    if (commandInfo.action === 'listar' && result.success) {
      // Verificar se temos eventos para mostrar
      if (result.events && result.events.length > 0) {
        // Já temos formattedEvents preparado na função handleListEvents
        console.log('[CHAT] Eventos formatados disponíveis');
      } else {
        // Não há eventos para mostrar
        detailsObj.formattedEvents = 'Não encontrei nenhum evento para este período.';
      }
    }
    
    // Formatar a resposta usando LangChain
    const responseResult = await responseChain.call({
      action: commandInfo.action,
      result: result.success ? 'sucesso' : 'erro',
      details: JSON.stringify(detailsObj),
      userMessage: message
    });

    return {
      success: result.success,
      message: cleanMessage(responseResult.text)
    };

  } catch (error) {
    console.error('[CHAT][ERRO]', error);
    return {
      success: false,
      message: cleanMessage('Desculpe, ocorreu um erro ao processar seu comando. Por favor, tente novamente.')
    };
  }
}

async function handleCreateEvent(info: any, userId: string) {
  try {
    // Verificar se temos informações suficientes
    if (!info.title) {
      return {
        success: false,
        error: 'É necessário informar o título do evento'
      };
    }
    
    // Processar a data
    let year, month, day;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    // Verificar se é "hoje"
    if (info.date === 'hoje') {
      day = currentDate.getDate();
      month = currentDate.getMonth() + 1;
      year = currentYear;
      console.log(`[CHAT][CREATE] Data processada como HOJE: ${day}/${month}/${year}`);
    } 
    // Verificar se é "amanhã"
    else if (info.date === 'amanhã' || info.date === 'amanha') {
      const tomorrow = new Date(currentDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      day = tomorrow.getDate();
      month = tomorrow.getMonth() + 1;
      year = currentYear; // Usar o ano atual mesmo para amanhã
      console.log(`[CHAT][CREATE] Data processada como AMANHÃ: ${day}/${month}/${year}`);
    } 
    // Verificar se a data está no formato dd/mm/yyyy
    else if (info.date && info.date.includes('/')) {
      const dateParts = info.date.split('/');
      day = parseInt(dateParts[0]);
      month = parseInt(dateParts[1]);
      
      // Sempre usar o ano atual para garantir compatibilidade
      year = currentYear;
      
      console.log(`[CHAT][CREATE] Data no formato dd/mm/yyyy (usando ano atual): ${day}/${month}/${year}`);
    } 
    // Verificar se a data está no título ou mensagem
    else {
      // Verificar se o título ou mensagem menciona "amanhã"
      if (info.title && (info.title.toLowerCase().includes('amanhã') || info.title.toLowerCase().includes('amanha'))) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        day = tomorrow.getDate();
        month = tomorrow.getMonth() + 1;
        console.log(`[CHAT][CREATE] Data extraída do título como AMANHÃ: ${day}/${month}/${year}`);
      }
      // Verificar se há uma data específica mencionada (como dia 15/05)
      else if (info.title && info.title.includes('dia')) {
        const match = info.title.match(/dia (\d+)\/(\d+)/i);
        if (match) {
          day = parseInt(match[1]);
          month = parseInt(match[2]);
          console.log(`[CHAT][CREATE] Data extraída do título (dia XX/XX): ${day}/${month}/${year}`);
        } else {
          // Se não houver data específica, usar data atual
          const today = new Date();
          day = today.getDate();
          month = today.getMonth() + 1;
          console.log(`[CHAT][CREATE] Usando data atual como padrão: ${day}/${month}/${year}`);
        }
      } else {
        // Se não houver data específica, usar data atual
        const today = new Date();
        day = today.getDate();
        month = today.getMonth() + 1;
        console.log(`[CHAT][CREATE] Usando data atual como padrão: ${day}/${month}/${year}`);
      }
    }
    
    // Processar a hora
    let hour = 9, minute = 0; // Valor padrão: 09:00
    
    if (info.time && info.time.includes(':')) {
      [hour, minute] = info.time.split(':').map(Number);
    } else if (info.title && info.title.includes('às')) {
      // Tentar extrair a hora do título se contiver "às XX horas" ou "às XX:YY"
      const hourMatch = info.title.match(/às (\d+)(:|\s*h|\s*horas)/i);
      if (hourMatch) {
        hour = parseInt(hourMatch[1]);
        
        // Verificar se há minutos especificados
        const minuteMatch = info.title.match(/às \d+:(\d+)/i);
        if (minuteMatch) {
          minute = parseInt(minuteMatch[1]);
        }
      }
    }
    
    // Garantir que todos os valores são números válidos
    const validYear = year || new Date().getFullYear();
    const validMonth = month || 1;
    const validDay = day || 1;
    const validHour = hour || 0;
    const validMinute = minute || 0;
    
    console.log(`[CHAT][CREATE] Data processada: ${validDay}/${validMonth}/${validYear} ${validHour}:${validMinute}`);
    
    const start = new Date(validYear, validMonth - 1, validDay, validHour, validMinute);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1h padrão

    // Garantir que o tipo seja válido
    const validTypes = ['Reunião', 'Treinamento', 'Evento'];
    const type = validTypes.includes(info.type) ? info.type : 'Evento';

    // Obter o email do usuário para incluir no evento
    let userEmail = '';
    
    // No cliente, tentar obter do localStorage
    if (typeof window !== 'undefined') {
      userEmail = localStorage.getItem('userEmail') || '';
      console.log('[CHAT][CREATE] Email do usuário obtido do localStorage:', userEmail);
      
      // Se não encontrou no localStorage, tentar obter do sessionStorage
      if (!userEmail) {
        const session = JSON.parse(sessionStorage.getItem('session') || '{}');
        userEmail = session?.user?.email || '';
        console.log('[CHAT][CREATE] Email do usuário obtido da sessão:', userEmail);
      }
    }
    
    // Garantir que temos um email válido
    if (!userEmail || !userEmail.includes('@')) {
      console.log('[CHAT][CREATE] Email do usuário não encontrado ou inválido, usando email padrão');
      userEmail = process.env.NOTIFICATION_EMAIL || 'kayque221023@gmail.com';
    }

    const event = {
      title: info.title,
      start,
      end,
      type,
      userId,
      description: info.description || '',
      userEmail // Incluir o email do usuário no evento
    };

    console.log('[CHAT][CREATE] Criando evento:', event);

    if (typeof window === 'undefined') {
      await connectToDatabase();
      const createdEvent = await EventModel.create(event);
      console.log('[CHAT][CREATE] Evento criado no servidor:', createdEvent);
      
      // Chamar diretamente o serviço de notificações para enviar emails
      try {
        // Importar o serviço de notificações
        const NotificationService = require('@/server/services/NotificationService').default;
        const notificationService = new NotificationService([]);
        
        // Adicionar o email do usuário ao evento
        const eventWithEmail = {
          ...createdEvent.toObject(),
          userEmail: userEmail
        };
        
        console.log('[CHAT][CREATE] Chamando serviço de notificações diretamente');
        await notificationService.handleNewEvent(eventWithEmail);
        console.log('[CHAT][CREATE] Emails enviados com sucesso');
      } catch (error) {
        console.error('[CHAT][CREATE] Erro ao enviar emails:', error);
      }
      
      return {
        success: true,
        event: createdEvent
      };
    } else {
      const createdEvent = await EventService.createEvent(event);
      console.log('[CHAT][CREATE] Evento criado no cliente:', createdEvent);
      
      // Forçar atualização do calendário - disparar evento global
      try {
        const updateEvent = new CustomEvent('atualizarEventosCalendario');
        window.dispatchEvent(updateEvent);
        console.log('[CHAT][CREATE] Evento de atualização do calendário disparado');
        
        // Fazer uma chamada adicional para forçar o envio de emails
        console.log('[CHAT][CREATE] Fazendo chamada adicional para enviar emails');
        fetch('/api/send-event-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            eventId: createdEvent._id || createdEvent.id,
            userEmail: userEmail
          })
        }).then(response => {
          if (response.ok) {
            console.log('[CHAT][CREATE] Notificação de email enviada com sucesso');
          } else {
            console.error('[CHAT][CREATE] Erro ao enviar notificação de email');
          }
        }).catch(error => {
          console.error('[CHAT][CREATE] Erro na chamada de notificação:', error);
        });
      } catch (e) {
        console.log('[CHAT][CREATE] Erro ao disparar evento de atualização:', e);
      }
      
      return {
        success: true,
        event: createdEvent
      };
    }
  } catch (error) {
    console.error('[CHAT][CREATE][ERRO]', error);
    return {
      success: false,
      error: 'Erro ao criar evento'
    };
  }
}

// Função para obter o emoji apropriado para o tipo de evento
function getEventEmoji(eventType: string, eventTitle: string): string {
  const title = eventTitle.toLowerCase();
  
  // Verificar palavras-chave no título
  if (title.includes('reuni') || title.includes('meeting')) return '📅';
  if (title.includes('aniversário') || title.includes('niver') || title.includes('birthday')) return '🎂';
  if (title.includes('médico') || title.includes('doctor') || title.includes('consulta')) return '🏥';
  if (title.includes('aula') || title.includes('curso') || title.includes('class')) return '📚';
  if (title.includes('viagem') || title.includes('trip') || title.includes('voo') || title.includes('flight')) return '✈️';
  if (title.includes('almoço') || title.includes('jantar') || title.includes('lunch') || title.includes('dinner')) return '🍽️';
  if (title.includes('café') || title.includes('coffee')) return '☕';
  if (title.includes('academia') || title.includes('treino') || title.includes('workout') || title.includes('gym')) return '🏋️';
  if (title.includes('festa') || title.includes('party') || title.includes('celebração')) return '🎉';
  if (title.includes('compras') || title.includes('shopping')) return '🛒';
  if (title.includes('cinema') || title.includes('filme') || title.includes('movie')) return '🎬';
  if (title.includes('pet') || title.includes('cachorro') || title.includes('gato') || title.includes('dog') || title.includes('cat')) return '🐾';
  
  // Verificar o tipo de evento
  if (eventType === 'Reunião') return '📅';
  if (eventType === 'Treinamento') return '📚';
  
  // Emoji padrão
  return '📌';
}

// Função para formatar a data de forma amigável
function formatEventDate(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  const isToday = date.getDate() === today.getDate() && 
                 date.getMonth() === today.getMonth() && 
                 date.getFullYear() === today.getFullYear();
                 
  const isTomorrow = date.getDate() === tomorrow.getDate() && 
                    date.getMonth() === tomorrow.getMonth() && 
                    date.getFullYear() === tomorrow.getFullYear();
  
  // Formatar a hora
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;
  
  // Formatar a data
  if (isToday) {
    return `Hoje às ${timeStr}`;
  } else if (isTomorrow) {
    return `Amanhã às ${timeStr}`;
  } else {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year} às ${timeStr}`;
  }
}

// Função para obter apenas a data (sem hora) para agrupar eventos
function getDateKey(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  const isToday = date.getDate() === today.getDate() && 
                 date.getMonth() === today.getMonth() && 
                 date.getFullYear() === today.getFullYear();
                 
  const isTomorrow = date.getDate() === tomorrow.getDate() && 
                    date.getMonth() === tomorrow.getMonth() && 
                    date.getFullYear() === tomorrow.getFullYear();
  
  if (isToday) {
    return 'Hoje';
  } else if (isTomorrow) {
    return 'Amanhã';
  } else {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}

// Função para formatar eventos agrupados por dia
function formatEventsByDay(events: any[]): string {
  if (events.length === 0) {
    return 'Não há eventos agendados para este período.';
  }
  
  // Agrupar eventos por data
  const eventsByDay: Record<string, any[]> = {};
  
  events.forEach(event => {
    const dateKey = getDateKey(new Date(event.start));
    if (!eventsByDay[dateKey]) {
      eventsByDay[dateKey] = [];
    }
    eventsByDay[dateKey].push(event);
  });
  
  // Ordenar as datas
  const sortedDates = Object.keys(eventsByDay).sort((a, b) => {
    // Priorizar "Hoje" e "Amanhã"
    if (a === 'Hoje') return -1;
    if (b === 'Hoje') return 1;
    if (a === 'Amanhã') return -1;
    if (b === 'Amanhã') return 1;
    
    // Para outras datas, converter para objetos Date e comparar
    const [dayA, monthA, yearA] = a.split('/');
    const [dayB, monthB, yearB] = b.split('/');
    
    const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1, parseInt(dayA));
    const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1, parseInt(dayB));
    
    return dateA.getTime() - dateB.getTime();
  });
  
  // Formatar a saída
  let output = '';
  
  sortedDates.forEach((dateKey, index) => {
    // Adicionar quebra de linha com espaçamento consistente entre dias
    if (index === 0) {
      output += '\n';
    } else {
      output += '\n\n\n'; // Mais espaço entre os dias
    }
    
    // Adicionar cabeçalho do dia com formatação mais limpa e destacada
    output += `📅 **${dateKey}**\n\n`;
    
    // Ordenar eventos do dia por hora
    const sortedEvents = eventsByDay[dateKey].sort((a, b) => {
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });
    
    // Adicionar cada evento
    sortedEvents.forEach((event, eventIndex) => {
      // Obter emoji apropriado para o tipo de evento
      const emoji = getEventEmoji(event.type, event.title);
      
      // Formatar data e hora de forma mais amigável
      const eventDate = new Date(event.start);
      const startTime = eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      // Calcular duração do evento
      const duration = new Date(event.end).getTime() - eventDate.getTime();
      const durationHours = Math.floor(duration / (1000 * 60 * 60));
      const durationMinutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
      const durationText = durationHours > 0 
        ? `${durationHours}h${durationMinutes > 0 ? ` ${durationMinutes}min` : ''}` 
        : `${durationMinutes}min`;
      
      // Formatar data completa para exibição
      const formattedDate = eventDate.toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      
      // Construir a saída formatada com melhor organização visual
      output += `${emoji} **${event.title}**\n`;
      output += `┌─────────────────────────┐\n`;
      output += `│ **Data:** ${formattedDate.padEnd(30)}│\n`;
      output += `│ **Horário:** ${startTime.padEnd(26)}│\n`;
      output += `│ **Duração:** ${durationText.padEnd(25)}│\n`;
      
      if (event.description) {
        // Quebrar descrição longa em múltiplas linhas se necessário
        const maxLength = 30;
        let desc = event.description;
        
        if (desc.length <= maxLength) {
          output += `│ **Descrição:** ${desc.padEnd(24)}│\n`;
        } else {
          // Primeira linha com o rótulo
          output += `│ **Descrição:** ${desc.substring(0, maxLength).padEnd(24)}│\n`;
          
          // Linhas adicionais para o resto da descrição
          let remaining = desc.substring(maxLength);
          while (remaining.length > 0) {
            const chunk = remaining.substring(0, maxLength);
            output += `│ ${chunk.padEnd(35)}│\n`;
            remaining = remaining.substring(maxLength);
          }
        }
      }
      
      output += `└─────────────────────────┘\n`;
      
      // Adicionar espaço entre eventos do mesmo dia
      if (eventIndex < sortedEvents.length - 1) {
        output += '\n';
      }
    });
  });
  
  return output;
}

async function handleListEvents(info: any, userId: string) {
  try {
    await connectToDatabase();
    const events = await EventModel.find({ userId });
    
    if (info.period === 'semana') {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfWeek = new Date(startOfToday);
      endOfWeek.setDate(startOfToday.getDate() + (7 - startOfToday.getDay()));
      
      const weekEvents = events.filter(e => {
        const eventDate = new Date(e.start);
        return eventDate >= startOfToday && eventDate <= endOfWeek;
      });
      
      // Ordenar eventos por data
      weekEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

      return {
        success: true,
        events: weekEvents,
        period: 'semana',
        formattedEvents: weekEvents.length === 0 
          ? 'Não há eventos agendados para esta semana.'
          : formatEventsByDay(weekEvents)
      };
    } else if (info.period === 'mês') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const monthEvents = events.filter(e => {
        const eventDate = new Date(e.start);
        return eventDate >= startOfMonth && eventDate <= endOfMonth;
      });
      
      // Ordenar eventos por data
      monthEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

      return {
        success: true,
        events: monthEvents,
        period: 'mês',
        formattedEvents: monthEvents.length === 0 
          ? 'Não há eventos agendados para este mês.'
          : formatEventsByDay(monthEvents)
      };
    }

    return {
      success: true,
      events: events
    };
  } catch (error) {
    console.error('[CHAT][LIST][ERRO]', error);
    return {
      success: false,
      error: 'Erro ao listar eventos'
    };
  }
}

async function handleDeleteEvent(info: any, userId: string) {
  try {
    if (!info.title) {
      return {
        success: false,
        error: 'É necessário informar o título do evento para exclusão'
      };
    }

    await connectToDatabase();
    const events = await EventModel.find({ userId });
    
    const eventToDelete = events.find(e => 
      e.title.toLowerCase().includes(info.title.toLowerCase())
    );

    if (!eventToDelete) {
      return {
        success: false,
        error: 'Evento não encontrado'
      };
    }

    console.log('[CHAT][DELETE] Excluindo evento:', eventToDelete);
    await EventModel.deleteOne({ _id: eventToDelete._id });
    
    return {
      success: true,
      event: eventToDelete
    };
  } catch (error) {
    console.error('[CHAT][DELETE][ERRO]', error);
    return {
      success: false,
      error: 'Erro ao excluir evento'
    };
  }
}

async function handleEditEvent(info: any, userId: string) {
  try {
    if (!info.title) {
      return {
        success: false,
        error: 'É necessário informar o título do evento para edição'
      };
    }

    await connectToDatabase();
    const events = await EventModel.find({ userId });
    
    const eventToEdit = events.find(e => 
      e.title.toLowerCase().includes(info.title.toLowerCase())
    );

    if (!eventToEdit) {
      return {
        success: false,
        error: 'Evento não encontrado'
      };
    }

    // Preparar os dados para atualização
    const updateData: any = {};
    
    // Atualizar data e hora se fornecidos
    if (info.date && info.date !== 'hoje' && info.date !== 'amanhã' && info.date !== 'amanha') {
      const [day, month, year] = info.date.split('/').map(Number);
      const currentStart = new Date(eventToEdit.start);
      const currentEnd = new Date(eventToEdit.end);
      
      // Atualizar apenas a data, mantendo a hora
      const newStart = new Date(year, month - 1, day, currentStart.getHours(), currentStart.getMinutes());
      const newEnd = new Date(year, month - 1, day, currentEnd.getHours(), currentEnd.getMinutes());
      
      updateData.start = newStart;
      updateData.end = newEnd;
    } else if (info.date === 'hoje') {
      const today = new Date();
      const currentStart = new Date(eventToEdit.start);
      const currentEnd = new Date(eventToEdit.end);
      
      const newStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 
                               currentStart.getHours(), currentStart.getMinutes());
      const newEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 
                             currentEnd.getHours(), currentEnd.getMinutes());
      
      updateData.start = newStart;
      updateData.end = newEnd;
    } else if (info.date === 'amanhã' || info.date === 'amanha') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const currentStart = new Date(eventToEdit.start);
      const currentEnd = new Date(eventToEdit.end);
      
      const newStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 
                               currentStart.getHours(), currentStart.getMinutes());
      const newEnd = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 
                             currentEnd.getHours(), currentEnd.getMinutes());
      
      updateData.start = newStart;
      updateData.end = newEnd;
    }
    
    // Atualizar hora se fornecida
    if (info.time) {
      const [hour, minute] = info.time.split(':').map(Number);
      
      // Se já atualizamos a data, usamos as novas datas
      const startDate = updateData.start || new Date(eventToEdit.start);
      const endDate = updateData.end || new Date(eventToEdit.end);
      
      startDate.setHours(hour, minute);
      endDate.setHours(hour + 1, minute); // Assumindo duração de 1h
      
      updateData.start = startDate;
      updateData.end = endDate;
    }
    
    // Atualizar descrição se fornecida
    if (info.description) {
      updateData.description = info.description;
    }
    
    // Atualizar tipo se fornecido
    if (info.type) {
      const validTypes = ['Reunião', 'Treinamento', 'Evento'];
      updateData.type = validTypes.includes(info.type) ? info.type : eventToEdit.type;
    }
    
    console.log('[CHAT][EDIT] Atualizando evento:', eventToEdit._id, 'com dados:', updateData);
    
    // Atualizar o evento
    const updatedEvent = await EventModel.findByIdAndUpdate(
      eventToEdit._id,
      { $set: updateData },
      { new: true }
    );
    
    return {
      success: true,
      event: updatedEvent
    };
  } catch (error) {
    console.error('[CHAT][EDIT][ERRO]', error);
    return {
      success: false,
      error: 'Erro ao editar evento'
    };
  }
}