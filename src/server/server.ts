import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

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

const systemMessage = new SystemMessage({
  content: `Você é uma secretária virtual inteligente chamada SecretarIA que ajuda a gerenciar a agenda e responder perguntas.
  Você tem acesso ao calendário do usuário e pode ajudar a organizar compromissos, lembretes e tarefas.
  Seja sempre prestativa, profissional e amigável. Responda sempre em português.
  Quando perguntarem sobre compromissos específicos, verifique a lista de eventos e forneça informações detalhadas.
  Se não tiver informações suficientes, peça detalhes adicionais de forma educada.`
});

// Armazenamento em memória para eventos (em produção, usar um banco de dados)
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
  return events.map(event => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    
    return `
      - ${event.title}
      - Data: ${start.toLocaleDateString('pt-BR')}
      - Horário: ${start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} até ${end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      - Tipo: ${event.type}
      ${event.description ? `- Descrição: ${event.description}` : ''}
    `;
  }).join('\n');
};

// Rota para processar mensagens de chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    // Adiciona o contexto dos eventos ao system message
    const eventsContext = events.length > 0 
      ? `Aqui estão os eventos agendados:\n${formatEventsForChat(events)}`
      : 'Não há eventos agendados no momento.';
    
    const contextualizedSystemMessage = new SystemMessage({
      content: `${systemMessage.content}\n\n${eventsContext}`
    });
    
    const response = await chat.invoke([
      contextualizedSystemMessage,
      new HumanMessage({ content: message })
    ]);
    
    res.json({ response: response.content });
  } catch (error) {
    console.error('Erro no chat:', error);
    res.status(500).json({ error: 'Erro ao processar mensagem' });
  }
});

// Rota para buscar todos os eventos
app.get('/api/events', (req, res) => {
  res.json(events);
});

// Rota para criar um novo evento
app.post('/api/events', (req, res) => {
  const event: Event = req.body;
  events.push(event);
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
  
  events[index] = { ...events[index], ...req.body };
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
  res.json(deletedEvent);
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
}); 