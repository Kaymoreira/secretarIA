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
import { processCommand } from '@/utils/chatProcessor';
import NotificationService from '@/server/services/NotificationService';

// Configuração do modelo de chat
const chat = new ChatOpenAI({
  temperature: 0.7,
  modelName: 'gpt-3.5-turbo',
});

// Inicializa o serviço de notificações
const notificationService = new NotificationService([]);

// Definição do SystemMessage Base com data atual dinâmica
const getSystemPrompt = () => {
  const now = new Date();
  const formattedDate = format(now, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const formattedTime = format(now, "HH:mm", { locale: ptBR });
  
  return `Você é uma secretária virtual inteligente chamada SecretarIA que ajuda a gerenciar a agenda, senhas e responder perguntas.
  
  Informações importantes:
  - A data atual é: ${formattedDate}
  - A hora atual é: ${formattedTime}
  
  Quando o usuário perguntar sobre a data ou hora atual, sempre use as informações acima e nunca invente datas ou horários.
  Seja sempre educada, prestativa e responda de forma natural e conversacional.`;
};

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
async function saveMessage(userId: string, content: string, isUser: boolean) {
  try {
    await connectToDatabase();
    await Chat.updateOne(
      { userId },
      {
        $push: {
          messages: {
            text: content,
            isUser,
            timestamp: new Date()
          }
        }
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('Erro ao salvar mensagem:', error);
  }
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

    // Verifica se é uma pergunta sobre data ou hora atual
    const dateTimeRegex = /(que dia (é|eh|e) hoje|qual (é|eh|e) a data (atual|de hoje)|que horas s(ã|a)o|qual (é|eh|e) o hor(á|a)rio)/i;
    
    if (dateTimeRegex.test(message)) {
      // Se for uma pergunta sobre data/hora, usa o prompt dinâmico
      const systemPrompt = getSystemPrompt();
      const response = await chat.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(message)
      ]);
      
      // Salva a resposta
      const responseText = response.content.toString();
      await saveMessage(session.user.id, responseText, false);
      
      return NextResponse.json({ response: responseText });
    } else {
      // Para outros comandos, usa o processador normal
      const commandResult = await processCommand(message, session.user.id);
      
      // Salva a resposta do comando
      await saveMessage(session.user.id, commandResult.message, false);
      
      return NextResponse.json({ response: commandResult.message });
    }
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