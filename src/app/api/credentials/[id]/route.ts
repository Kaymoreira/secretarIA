import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Credential } from '@/server/models/Credential';
import { connectToDatabase } from '@/lib/mongoose';
import { encrypt } from '@/utils/encryption';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    await connectToDatabase();
    const credential = await Credential.findOne({
      _id: params.id,
      userId: session.user.id,
    });

    if (!credential) {
      return NextResponse.json({ error: 'Credencial não encontrada' }, { status: 404 });
    }

    return NextResponse.json(credential);
  } catch (error) {
    console.error('Erro ao buscar credencial:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    await connectToDatabase();

    // Criptografa a senha se ela foi fornecida
    if (body.password) {
      body.password = encrypt(body.password);
    }

    const credential = await Credential.findOneAndUpdate(
      { _id: params.id, userId: session.user.id },
      { $set: body },
      { new: true }
    );

    if (!credential) {
      return NextResponse.json({ error: 'Credencial não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, credential });
  } catch (error) {
    console.error('Erro ao atualizar credencial:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    await connectToDatabase();
    const credential = await Credential.findOneAndDelete({
      _id: params.id,
      userId: session.user.id,
    });

    if (!credential) {
      return NextResponse.json({ success: false, error: 'Credencial não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Credencial excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir credencial:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
} 