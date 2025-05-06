import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { authOptions } from '@/lib/auth';
import { Event } from '@/server/models/Event';
import { Chat } from '@/server/models/Chat';
import { connectToDatabase } from '@/lib/mongoose';
import { processCommand } from '@/utils/chatCommands';
import NotificationService from '@/server/services/NotificationService';

// Configuração do modelo de chat
const chat = new ChatOpenAI({
  temperature: 0.7,
  modelName: 'gpt-3.5-turbo',
});

// Inicializa o serviço de notificações
const notificationService = new NotificationService([]);

// Definição do SystemMessage Base
const baseSystemPrompt = `Você é uma secretária virtual inteligente chamada SecretarIA que ajuda a gerenciar a agenda, senhas e responder perguntas.
[... resto do prompt do sistema ...]`;

// Função para ajustar o fuso horário
const adjustTimeZone = (date: Date): Date => {
  return new Date(date);
};

// Funções de manipulação de eventos
async function getEvents(userId: string): Promise<any[]> {
  await connectToDatabase();
  return Event.find({ userId });
}

// Função para salvar mensagem no histórico
async function saveMessage(userId: string, text: string, isUser: boolean) {
  await connectToDatabase();
  const chatDoc = await Chat.findOneAndUpdate(
    { userId },
    { 
      $push: { 
        messages: { 
          text, 
          isUser, 
          timestamp: new Date() 
        } 
      } 
    },
    { upsert: true, new: true }
  );
  return chatDoc;
}

// Função para obter histórico de mensagens
async function getChatHistory(userId: string) {
  await connectToDatabase();
  const chatDoc = await Chat.findOne({ userId });
  return chatDoc?.messages || [];
}

// Funções auxiliares
const filterEvents = (events: any[], query: string): any[] => {
  // ... lógica de filtro de eventos ...
  return events;
};

const formatEventsForChat = (events: any[], query: string) => {
  // ... lógica de formatação de eventos ...
  return '';
};

const findEventByTitle = async (title: string, userId: string): Promise<any | null> => {
  await connectToDatabase();
  return Event.findOne({ title: new RegExp(title, 'i'), userId });
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json({ error: 'Mensagem não fornecida' }, { status: 400 });
    }

    // Salva a mensagem do usuário
    await saveMessage(session.user.id, message, true);

    // Verifica se é um comando de senha
    const commandResult = await processCommand(message, session.user.id);
    if (commandResult.success) {
      // Salva a resposta do comando
      await saveMessage(session.user.id, commandResult.message, false);
      return NextResponse.json({ response: commandResult.message });
    }

    // Obtém eventos atuais para contexto
    const events = await getEvents(session.user.id);
    
    // Atualiza o serviço de notificações
    await notificationService.updateEvents(events);

    // Prepara o contexto atual
    const currentDate = new Date();
    const dateStr = format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
    
    const systemMessage = new SystemMessage(baseSystemPrompt);
    const userMessage = new HumanMessage(`
Contexto atual:
Data: ${dateStr}
Número de eventos futuros: ${events.filter(e => new Date(e.end) >= currentDate).length}

Mensagem do usuário:
${message}
    `);

    const response = await chat.invoke([systemMessage, userMessage]);
    
    // Salva a resposta da IA
    await saveMessage(session.user.id, response.content as string, false);

    return NextResponse.json({ response: response.content });
  } catch (error) {
    console.error('Erro no processamento do chat:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Rota GET para obter histórico de mensagens
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const messages = await getChatHistory(session.user.id);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Erro ao obter histórico do chat:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 