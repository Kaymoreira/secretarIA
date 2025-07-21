import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongoose';
import { Event } from '@/server/models/Event';
import { authOptions } from '@/lib/auth';
import NotificationService from '@/server/services/NotificationService';

// Inicializa o serviço de notificações
const notificationService = new NotificationService([]);

export async function POST(request: Request) {
  try {
    console.log('\n=== API SEND-EVENT-NOTIFICATION - INICIANDO ===');
    
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('[API][SEND-EVENT-NOTIFICATION] Usuário não autenticado');
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extrair dados da requisição
    const body = await request.json();
    const { eventId, userEmail } = body;
    
    console.log('[API][SEND-EVENT-NOTIFICATION] Dados recebidos:', {
      eventId,
      userEmail,
      userId: session.user.id
    });
    
    if (!eventId) {
      console.error('[API][SEND-EVENT-NOTIFICATION] ID do evento não fornecido');
      return NextResponse.json(
        { error: 'ID do evento não fornecido' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Conectar ao banco de dados
    await connectToDatabase();
    
    // Buscar o evento
    const event = await Event.findById(eventId);
    if (!event) {
      console.error('[API][SEND-EVENT-NOTIFICATION] Evento não encontrado');
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Verificar se o evento pertence ao usuário
    if (event.userId.toString() !== session.user.id) {
      console.error('[API][SEND-EVENT-NOTIFICATION] Evento não pertence ao usuário');
      return NextResponse.json(
        { error: 'Evento não pertence ao usuário' },
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Adicionar o email do usuário ao evento
    const eventWithUserInfo = {
      ...event.toObject(),
      userEmail: userEmail || session.user.email
    };
    
    console.log('[API][SEND-EVENT-NOTIFICATION] Evento com informações do usuário:', {
      id: eventWithUserInfo._id,
      title: eventWithUserInfo.title,
      userEmail: eventWithUserInfo.userEmail
    });
    
    // Enviar notificação
    console.log('[API][SEND-EVENT-NOTIFICATION] Chamando serviço de notificações');
    try {
      await notificationService.handleNewEvent(eventWithUserInfo);
      console.log('[API][SEND-EVENT-NOTIFICATION] Notificação enviada com sucesso');
    } catch (error) {
      console.error('[API][SEND-EVENT-NOTIFICATION] Erro ao enviar notificação:', error);
      return NextResponse.json(
        { error: 'Erro ao enviar notificação' },
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('=== API SEND-EVENT-NOTIFICATION - CONCLUÍDO ===\n');
    
    return NextResponse.json(
      { success: true, message: 'Notificação enviada com sucesso' },
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API][SEND-EVENT-NOTIFICATION][ERRO]', error);
    return NextResponse.json(
      { error: 'Erro ao processar notificação' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
