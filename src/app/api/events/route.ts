import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongoose';
import { Event } from '@/server/models/Event';
import { authOptions } from '@/lib/auth';
import NotificationService from '@/server/services/NotificationService';

// Inicializa o serviço de notificações
const notificationService = new NotificationService([]);

// Atualiza o serviço de notificações quando eventos são modificados
const updateNotificationService = async (userId: string) => {
  try {
    const events = await Event.find({ userId });
    await notificationService.updateEvents(events);
  } catch (error) {
    console.error('[NOTIFICATION] Erro ao atualizar notificações:', error);
  }
};

export async function GET() {
  try {
    console.log('[API][EVENTS][GET] Iniciando...');
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('[API][EVENTS][GET] Usuário não autenticado');
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[API][EVENTS][GET] Usuário:', session.user.id);
    await connectToDatabase();
    
    const events = await Event.find({ userId: session.user.id });
    console.log('[API][EVENTS][GET] Eventos encontrados:', events.length);
    
    return NextResponse.json(events, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[API][EVENTS][GET][ERRO]', error);
    return NextResponse.json(
      { error: 'Erro ao buscar eventos' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request: Request) {
  try {
    console.log('[API][EVENTS][POST] Iniciando...');
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('[API][EVENTS][POST] Usuário não autenticado');
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    console.log('[API][EVENTS][POST] Usuário:', session.user.id, 'Body:', body);
    
    // Remova o campo id para evitar conflitos com o índice único
    const { id, ...eventDataWithoutId } = body;
    
    await connectToDatabase();
    const event = await Event.create({ ...eventDataWithoutId, userId: session.user.id });
    console.log('[API][EVENTS][POST] Evento criado:', event);
    
    await updateNotificationService(session.user.id);
    
    return NextResponse.json(event, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[API][EVENTS][POST][ERRO]', error);
    return NextResponse.json(
      { error: 'Erro ao criar evento' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const body = await request.json();
    console.log('[API][EVENTS][PUT] Usuário:', session.user.id, 'Body:', body);
    
    await connectToDatabase();
    
    // Use o id enviado pelo cliente, já que o frontend usa id e não _id
    const eventId = body.id || body._id;
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'ID do evento não fornecido' },
        { status: 400 }
      );
    }
    
    // Remova id e _id do objeto de atualização para evitar conflitos
    const { id, _id, ...updateData } = body;
    
    console.log('[API][EVENTS][PUT] Atualizando evento:', eventId, 'com dados:', updateData);
    
    const event = await Event.findOneAndUpdate(
      { _id: eventId, userId: session.user.id },
      updateData,
      { new: true }
    );
    
    if (!event) {
      console.log('[API][EVENTS][PUT] Evento não encontrado:', eventId);
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      );
    }
    
    console.log('[API][EVENTS][PUT] Evento atualizado:', event);
    await updateNotificationService(session.user.id);
    
    return NextResponse.json(event, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[API][EVENTS][PUT][ERRO]', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar evento' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    console.log('[API][EVENTS][DELETE] Iniciando...');
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('[API][EVENTS][DELETE] Usuário não autenticado');
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    console.log('[API][EVENTS][DELETE] Usuário:', session.user.id, 'ID:', id);
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID do evento não fornecido' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await connectToDatabase();
    const event = await Event.findOneAndDelete({ _id: id, userId: session.user.id });
    
    if (!event) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[API][EVENTS][DELETE] Evento deletado:', event);
    await updateNotificationService(session.user.id);
    
    return NextResponse.json(
      { success: true, message: 'Evento deletado com sucesso' },
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API][EVENTS][DELETE][ERRO]', error);
    return NextResponse.json(
      { error: 'Erro ao deletar evento' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 