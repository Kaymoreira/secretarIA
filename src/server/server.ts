import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { format } from 'date-fns'; // Usaremos para formatar a data atual para a IA
import { ptBR } from 'date-fns/locale';

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
Quando perguntarem sobre compromissos específicos, verifique a lista de eventos fornecida e forneça informações detalhadas.
Se não tiver informações suficientes, peça detalhes adicionais de forma educada.
Quando listar eventos, use listas com marcadores (como '*') e formate as informações de forma clara e concisa, usando markdown para ênfase (ex: **Título**).

**Instrução MUITO IMPORTANTE:** Se o usuário pedir para **CRIAR** um novo evento, compromisso, tarefa ou agendamento, sua **ÚNICA** resposta deve ser um objeto JSON contendo os detalhes extraídos. NÃO inclua nenhuma outra palavra ou explicação fora do JSON. Tente inferir a data e hora com base na data atual fornecida e na conversa. Se não conseguir extrair informações essenciais como título ou data/hora de início, peça esclarecimentos ao usuário em formato de texto normal.

O formato JSON esperado para criação de evento é:
{
  "action": "create_event",
  "details": {
    "title": "(string) Nome do evento",
    "start": "(string) Data e hora de início no formato ISO 8601 (YYYY-MM-DDTHH:mm:ss)",
    "end": "(string) Data e hora de término no formato ISO 8601 (YYYY-MM-DDTHH:mm:ss) - se não especificado, assuma 1 hora após o início",
    "type": "(string) Tipo do evento (ex: Meeting, Task, Event, Training - escolha o mais apropriado ou use 'Event' como padrão)",
    "description": "(string, opcional) Descrição adicional"
  }
}

Se o pedido NÃO for para criar um evento, responda normalmente em texto.
`;

// Armazenamento em memória para eventos
interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: string;
  description?: string;
}

let events: Event[] = [
  {
    id: '1',
    title: 'New Inventory Training',
    start: new Date('2025-03-14T05:00:00'),
    end: new Date('2025-03-14T08:00:00'),
    type: 'Training',
    description: 'It\'s a training session on the new model year vehicles and features. No sleeping in for you!'
  },
  {
    id: '2',
    title: 'Client Meeting - Audi Q7',
    start: new Date('2025-03-14T10:00:00'),
    end: new Date('2025-03-14T11:00:00'),
    type: 'Meeting',
    description: 'Family\'s looking for a luxury SUV—client is Thomas Garcia (Phone: 555-333-2222). Seems like a nice fella!'
  },
  {
    id: '3',
    title: 'Regional Auto Show',
    start: new Date('2025-03-14T13:00:00'),
    end: new Date('2025-03-21T18:00:00'),
    type: 'Event',
    description: 'Regional Auto Show runs from March 14 to March 21'
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

    // Formatação usando Markdown
    return (
      `*   **${event.title}** (${event.type})\n` +
      `    *   *Início:* ${format(start, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n` +
      `    *   *Fim:* ${format(end, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n` +
      `${event.description ? `    *   *Descrição:* ${event.description}\n` : ''}`
    );
  }).join('\n'); // Junta cada evento formatado com uma nova linha
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

A data e hora atuais são: ${format(currentDate, "'Dia' dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}

${eventsContext}`;

    const systemMessage = new SystemMessage({ content: fullSystemPrompt });

    console.log('Enviando para a IA:');
    console.log('System:', fullSystemPrompt);
    console.log('User:', message);

    const response = await chat.invoke([
      systemMessage,
      new HumanMessage({ content: message })
    ]);

    const aiResponseContent = response.content as string;
    console.log('Resposta da IA:', aiResponseContent);

    let finalResponse = aiResponseContent;
    let eventCreated = false;

    try {
      // Tenta interpretar a resposta da IA como JSON
      const parsedResponse = JSON.parse(aiResponseContent);

      // Verifica se é um comando de criação de evento
      if (parsedResponse.action === 'create_event' && parsedResponse.details) {
        const details = parsedResponse.details;
        
        // Validação básica (poderia ser mais robusta)
        if (!details.title || !details.start || !details.end || !details.type) {
          throw new Error('Dados insuficientes no JSON para criar evento.');
        }

        const newEvent: Event = {
          id: Date.now().toString(), // ID simples baseado no timestamp
          title: details.title,
          start: new Date(details.start), // Confia que a IA formatou corretamente
          end: new Date(details.end),     // Confia que a IA formatou corretamente
          type: details.type,
          description: details.description || undefined,
        };

        // Verifica se as datas são válidas após a conversão
        if (isNaN(newEvent.start.getTime()) || isNaN(newEvent.end.getTime())) {
          throw new Error('Formato de data inválido recebido da IA.');
        }

        // Adiciona o evento à lista (ou salvaria no DB)
        events.push(newEvent);
        console.log('Evento criado:', newEvent);

        // Prepara uma resposta de confirmação para o usuário
        finalResponse = `✅ Evento "${newEvent.title}" agendado com sucesso para ${format(newEvent.start, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.`;
        eventCreated = true;
      }

    } catch (error) {
      // Se não for JSON ou ocorrer erro na criação, a 'finalResponse' continua sendo a resposta original da IA (texto)
      if (error instanceof SyntaxError) {
        // Era esperado, a IA respondeu em texto normal.
        console.log('Resposta da IA é texto normal.');
      } else {
        // Algum outro erro durante o processamento do JSON ou criação do evento
        console.error('Erro ao processar comando da IA:', error);
        finalResponse = `Houve um problema ao tentar processar sua solicitação. (Erro: ${error instanceof Error ? error.message : String(error)})`;
      }
    }

    // Envia a resposta final (confirmação ou texto da IA) para o frontend
    res.json({ response: finalResponse, eventCreated });

  } catch (error) {
    console.error('Erro no chat:', error);
    // Verifica se o erro é de quota insuficiente e personaliza a mensagem
    let errorMessage = 'Erro ao processar mensagem';
    if (error instanceof Error && error.message.includes('InsufficientQuotaError')) {
        errorMessage = 'Erro de quota: Verifique seu plano e detalhes de cobrança na OpenAI.';
        // Poderia até enviar um status code específico se o frontend fosse tratar
    }
    res.status(500).json({ error: errorMessage });
  }
});

// Rota para buscar todos os eventos
app.get('/api/events', (req, res) => {
  res.json(events);
});

// Rota para criar um novo evento (usada pelo frontend e agora talvez pela IA)
app.post('/api/events', (req, res) => {
  const event: Event = {
    ...req.body,
    start: new Date(req.body.start), // Garante que as datas sejam objetos Date
    end: new Date(req.body.end)
  };
  events.push(event);
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
     start: new Date(req.body.start || events[index].start),
     end: new Date(req.body.end || events[index].end)
  };

  events[index] = updatedEvent;
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
  console.log('Evento excluído:', deletedEvent);
  res.json(deletedEvent);
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
}); 