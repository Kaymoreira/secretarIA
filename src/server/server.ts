import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { format } from 'date-fns'; // Usaremos para formatar a data atual para a IA
import { ptBR } from 'date-fns/locale';
import NotificationService from './services/NotificationService';

// Carrega as variáveis de ambiente do arquivo .env
config();

const app = express();
app.use(cors());
app.use(express.json());

// Verifica se a chave da API da OpenAI foi definida
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('ERRO: OPENAI_API_KEY não definida no arquivo .env');
  process.exit(1);
}

// Verifica se as configurações de email estão definidas
if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD || !process.env.NOTIFICATION_EMAIL) {
  console.error('ERRO: Configurações de email não definidas no arquivo .env');
  console.error('Por favor, defina EMAIL_USER, EMAIL_APP_PASSWORD e NOTIFICATION_EMAIL');
  process.exit(1);
}

// Configuração do modelo de chat
const chat = new ChatOpenAI({
  temperature: 0.7,
  modelName: 'gpt-3.5-turbo',
  openAIApiKey: apiKey,
});

// Definição do SystemMessage Base (sem contexto de eventos ainda)
const baseSystemPrompt = `Você é uma secretária virtual inteligente chamada SecretarIA que ajuda a gerenciar a agenda e responder perguntas.
Você tem acesso ao calendário do usuário e pode ajudar a organizar compromissos, lembretes e tarefas.
Seja sempre prestativa, profissional e amigável. Responda sempre em português.

**REGRAS IMPORTANTES PARA CRIAÇÃO DE EVENTOS:**

1. Quando o usuário mencionar "marque", "agende", "crie um evento", ou similar, você DEVE criar o evento IMEDIATAMENTE
2. Se o usuário disser "amanhã", use a data atual do contexto para calcular
3. Se não especificada a duração, assuma 1 hora
4. Se não especificado o tipo, use "Reunião" para reuniões/conversas e "Evento" para outros
5. NUNCA peça confirmação, apenas crie o evento
6. SEMPRE retorne apenas o JSON, sem texto adicional
7. SEMPRE salve os títulos e descrições em português
8. Use "Reunião" ou "Evento" como tipos (não use "Meeting" ou "Event")

**REGRAS IMPORTANTES PARA EDIÇÃO DE EVENTOS:**

1. Quando o usuário mencionar "mude", "altere", "atualize" ou similar, você DEVE editar o evento IMEDIATAMENTE
2. Use o ID do evento fornecido na listagem para fazer a edição
3. NUNCA peça confirmação, apenas faça a edição
4. SEMPRE retorne apenas o JSON, sem texto adicional
5. SEMPRE mantenha os títulos e descrições em português

**REGRAS IMPORTANTES PARA DELEÇÃO DE EVENTOS:**

1. Quando o usuário mencionar "delete", "remova", "cancele", "exclua" ou similar, você DEVE deletar o evento IMEDIATAMENTE
2. Use o ID do evento fornecido na listagem para fazer a deleção
3. NUNCA peça confirmação, apenas delete o evento
4. SEMPRE retorne apenas o JSON, sem texto adicional

**REGRAS PARA CONSULTAS DE AGENDA:**
1. Quando o usuário perguntar sobre eventos/compromissos, SEMPRE liste TODOS os eventos FUTUROS
2. Para consultas sobre "agenda da semana", mostre todos os eventos dos próximos 7 dias
3. Para consultas sobre "agenda do dia" ou "hoje", mostre eventos do dia atual
4. Para consultas sobre "amanhã", mostre eventos do dia seguinte
5. Use listas com marcadores (como '*') e formate as informações de forma clara e concisa
6. Use markdown para ênfase (ex: **Título**)
7. Se não houver eventos para o período consultado, responda "Não há eventos agendados para este período."
8. SEMPRE inclua a data, hora e descrição (se houver) dos eventos

O formato JSON para criação de evento é:
{
  "action": "create_event",
  "details": {
    "title": "Nome do evento em português",
    "start": "Data e hora de início em ISO 8601 (YYYY-MM-DDTHH:mm:ss)",
    "end": "Data e hora de término em ISO 8601 (YYYY-MM-DDTHH:mm:ss)",
    "type": "Reunião ou Evento",
    "description": "Descrição detalhada do evento em português"
  }
}

O formato JSON para edição de evento é:
{
  "action": "edit_event",
  "target": {
    "id": "ID do evento existente"
  },
  "updates": {
    "title": "Novo título em português (opcional)",
    "start": "Nova data/hora início ISO 8601 (opcional)",
    "end": "Nova data/hora término ISO 8601 (opcional)",
    "type": "Reunião ou Evento (opcional)",
    "description": "Nova descrição em português (opcional)"
  }
}

O formato JSON para deleção de evento é:
{
  "action": "delete_event",
  "target": {
    "id": "ID do evento a ser deletado"
  }
}

IMPORTANTE:
- Use JSON APENAS para criar, editar ou deletar eventos
- Para CONSULTAS e LISTAGENS, use SEMPRE texto normal
- NUNCA misture JSON com texto normal
- NUNCA crie novos formatos de JSON além dos especificados acima
- SEMPRE considere eventos FUTUROS ao responder consultas sobre a agenda
- SEMPRE use português para títulos, tipos e descrições de eventos`;

// Armazenamento em memória para eventos
interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: string;
  description?: string;
}

// Função para ajustar o fuso horário
const adjustTimeZone = (date: Date): Date => {
  // Removendo o ajuste automático do fuso horário
  // pois as datas já vêm no fuso horário local do usuário
  return new Date(date);
};

let events: Event[] = [
  {
    id: '1',
    title: 'New Inventory Training',
    start: adjustTimeZone(new Date('2025-04-13T05:00:00')),
    end: adjustTimeZone(new Date('2025-04-13T08:00:00')),
    type: 'Training',
    description: 'It\'s a training session on the new model year vehicles and features. No sleeping in for you!'
  },
  {
    id: '2',
    title: 'Client Meeting - Audi Q7',
    start: adjustTimeZone(new Date('2025-04-13T10:00:00')),
    end: adjustTimeZone(new Date('2025-04-13T11:00:00')),
    type: 'Meeting',
    description: 'Family\'s looking for a luxury SUV—client is Thomas Garcia (Phone: 555-333-2222). Seems like a nice fella!'
  },
  {
    id: '3',
    title: 'Regional Auto Show',
    start: adjustTimeZone(new Date('2025-04-13T13:00:00')),
    end: adjustTimeZone(new Date('2025-04-20T18:00:00')),
    type: 'Event',
    description: 'Regional Auto Show runs from April 13 to April 20, 2025'
  }
];

// Função auxiliar para formatar os eventos para o chat
const formatEventsForChat = (events: Event[]) => {
  if (events.length === 0) {
    return 'Nenhum evento agendado.';
  }
  return events.map(event => {
    const start = new Date(event.start);
    const end = new Date(event.end);

    // Formatação usando Markdown e incluindo o ID
    return (
      `*   **${event.title}** (${event.type}) [ID: ${event.id}]\n` +
      `    *   *Início:* ${format(start, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n` +
      `    *   *Fim:* ${format(end, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n` +
      `${event.description ? `    *   *Descrição:* ${event.description}\n` : ''}`
    );
  }).join('\n');
};

// Função auxiliar para encontrar evento por título (case insensitive e parcial)
const findEventByTitle = (title: string): Event | undefined => {
  return events.find(event => 
    event.title.toLowerCase().includes(title.toLowerCase())
  );
};

// Inicializa o serviço de notificações com a lista de eventos
const notificationService = new NotificationService(events);

// Atualiza o serviço de notificações quando eventos são modificados
const updateNotificationService = async () => {
  await notificationService.updateEvents(events);
};

// Rota para processar mensagens de chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const currentDate = new Date();

    // Adiciona o contexto dos eventos e a data atual ao prompt base
    const eventsContext = events.length > 0
      ? `Aqui estão os seus eventos agendados atualmente:\n${formatEventsForChat(events)}`
      : 'Não há eventos agendados no momento.';

    const fullSystemPrompt = `${baseSystemPrompt}

A data e hora atuais são: ${format(currentDate, "'Dia' dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })} Use isso como referência para datas relativas como 'amanhã', mas priorize datas explícitas do usuário.

${eventsContext}`;

    const systemMessage = new SystemMessage({ content: fullSystemPrompt });

    console.log('--- Nova Requisição /api/chat ---');
    console.log('Enviando para a IA:');
    console.log('System Prompt Snippet:', fullSystemPrompt.substring(0, 500) + '...'); // Log mais curto
    console.log('User Message:', message);

    const response = await chat.invoke([
      systemMessage,
      new HumanMessage({ content: message })
    ]);
    
    const aiResponseContent = response.content as string;
    console.log('Resposta BRUTA da IA:', aiResponseContent);

    let finalResponse = aiResponseContent;
    let eventCreated = false;

    try {
      const parsedResponse = JSON.parse(aiResponseContent);
      
      if (parsedResponse.action === 'create_event' && parsedResponse.details) {
        const details = parsedResponse.details;
        console.log('IA retornou JSON para criação:', details);

        if (!details.title || !details.start || !details.end || !details.type) {
          console.error('JSON da IA está incompleto');
          throw new Error('Dados insuficientes no JSON para criar evento.');
        }
        
        // Garante que o tipo seja "Reunião" ou "Evento"
        const type = details.type === 'Meeting' ? 'Reunião' : 
                    details.type === 'Event' ? 'Evento' : 
                    details.type;

        const newEvent: Event = {
          id: Date.now().toString(),
          title: details.title,
          start: adjustTimeZone(new Date(details.start)),
          end: adjustTimeZone(new Date(details.end)),
          type: type,
          description: details.description || undefined,
        };

        // Verifica se as datas são válidas APÓS a conversão
        if (isNaN(newEvent.start.getTime()) || isNaN(newEvent.end.getTime())) {
          console.error('Falha ao converter datas recebidas da IA para objetos Date.');
          throw new Error('Formato de data inválido recebido da IA.');
        }

        // Primeiro adiciona o evento à lista
        events.push(newEvent);

        try {
          // Envia a notificação imediata
          await notificationService.sendImmediateNotification(newEvent);
        } catch (error) {
          console.error('Falha ao enviar notificação imediata:', error);
        }

        // Atualiza o serviço de notificações com a nova lista
        await updateNotificationService();
        console.log('Evento criado com sucesso no backend:', newEvent);

        finalResponse = `✅ Evento "${newEvent.title}" agendado com sucesso para ${format(newEvent.start, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.`;
        eventCreated = true;
      } else if (parsedResponse.action === 'edit_event' && parsedResponse.target && parsedResponse.updates) {
        const target = parsedResponse.target;
        const updates = parsedResponse.updates;
        console.log('IA retornou JSON para edição:', target, updates);

        const event = events.find(e => e.id === target.id);
        if (event) {
          // Garante que o tipo seja "Reunião" ou "Evento" se estiver sendo atualizado
          const type = updates.type ? 
                      (updates.type === 'Meeting' ? 'Reunião' : 
                       updates.type === 'Event' ? 'Evento' : 
                       updates.type) : 
                      event.type;

          const updatedEvent: Event = {
            ...event,
            ...updates,
            type: type,
            start: adjustTimeZone(new Date(updates.start || event.start)),
            end: adjustTimeZone(new Date(updates.end || event.end))
          };

          const index = events.findIndex(e => e.id === target.id);
          if (index !== -1) {
            events[index] = updatedEvent;
            console.log('Evento atualizado:', updatedEvent);
            finalResponse = `✅ Evento "${updatedEvent.title}" atualizado com sucesso.`;
            eventCreated = true;
          } else {
            console.error('Evento não encontrado para edição');
            finalResponse = 'Evento não encontrado para edição.';
          }
        } else {
          console.error('Evento não encontrado para edição');
          finalResponse = 'Evento não encontrado para edição.';
        }
      } else if (parsedResponse.action === 'delete_event' && parsedResponse.target && parsedResponse.target.id) {
        const id = parsedResponse.target.id;
        console.log('IA retornou JSON para deleção:', id);

        const index = events.findIndex(e => e.id === id);
        if (index !== -1) {
          const deletedEvent = events[index];
          events = events.filter(e => e.id !== id);
          console.log('Evento excluído:', deletedEvent);
          finalResponse = `✅ Evento "${deletedEvent.title}" excluído com sucesso.`;
          eventCreated = true;
        } else {
          console.error('Evento não encontrado para deleção');
          finalResponse = 'Evento não encontrado para deleção.';
        }
      } else {
          // O JSON não era uma ação de criar, editar ou deletar evento válida
          console.log('JSON recebido não era comando de criação, edição ou deleção válido.');
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.log('Resposta da IA é texto normal (não JSON).');
        // finalResponse já contém a resposta em texto
      } else {
        console.error('Erro ao processar comando JSON da IA ou criar/editar/deletar evento:', error);
        finalResponse = `Houve um problema ao tentar processar sua solicitação. (Erro: ${error instanceof Error ? error.message : String(error)})`;
        // Mantém eventCreated como false
      }
    }

    console.log('Enviando resposta para o Frontend:', { response: finalResponse, eventCreated });
    res.json({ response: finalResponse, eventCreated });

  } catch (error) {
      console.error('Erro GERAL no /api/chat:', error);
      let errorMessage = 'Erro ao processar mensagem';
      if (error instanceof Error && error.message.includes('InsufficientQuotaError')) {
          errorMessage = 'Erro de quota: Verifique seu plano e detalhes de cobrança na OpenAI.';
      }
      res.status(500).json({ error: errorMessage });
  }
});

// Rota para buscar todos os eventos
app.get('/api/events', (req, res) => {
  res.json(events);
});

// Rota para criar um novo evento
app.post('/api/events', (req, res) => {
  const event: Event = {
    ...req.body,
    start: adjustTimeZone(new Date(req.body.start)),
    end: adjustTimeZone(new Date(req.body.end))
  };
  events.push(event);
  updateNotificationService();
  console.log('Evento criado via POST direto:', event);
  res.status(201).json(event);
});

// Rota para buscar um evento específico
app.get('/api/events/:id', (req, res) => {
  const event = events.find(e => e.id === req.params.id);
  if (!event) {
    return res.status(404).json({ message: 'Evento não encontrado' });
  }
  res.json(event);
});

// Rota para atualizar um evento
app.put('/api/events/:id', (req, res) => {
  const index = events.findIndex(e => e.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: 'Evento não encontrado' });
  }
  
  const updatedEvent: Event = {
    ...events[index],
    ...req.body,
    start: adjustTimeZone(new Date(req.body.start || events[index].start)),
    end: adjustTimeZone(new Date(req.body.end || events[index].end))
  };

  events[index] = updatedEvent;
  updateNotificationService();
  console.log('Evento atualizado:', updatedEvent);
  res.json(events[index]);
});

// Rota para excluir um evento
app.delete('/api/events/:id', (req, res) => {
  const index = events.findIndex(e => e.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: 'Evento não encontrado' });
  }
  
  const deletedEvent = events[index];
  events = events.filter(e => e.id !== req.params.id);
  updateNotificationService(); // Atualiza o serviço de notificações
  console.log('Evento excluído:', deletedEvent);
  res.json(deletedEvent);
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
}); 