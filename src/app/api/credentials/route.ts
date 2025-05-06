import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Credential } from '@/server/models/Credential';
import { connectToDatabase } from '@/lib/mongoose';
import { ICredential } from '@/server/types';
import { encrypt, decrypt } from '@/utils/encryption';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    await connectToDatabase();
    
    const credentials = await Credential.find({ userId: session.user.id });
    
    if (!Array.isArray(credentials)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Formato de resposta inválido do banco de dados' 
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }
    
    // Descriptografa as senhas antes de enviar
    const decryptedCredentials = credentials.map(cred => {
      const obj = cred.toObject();
      try {
        if (!obj.password) {
          return {
            ...obj,
            password: '*** Senha não encontrada ***',
            _id: obj._id.toString()
          };
        }
        const decryptedPassword = decrypt(obj.password);
        return {
          ...obj,
          password: decryptedPassword,
          _id: obj._id.toString()
        };
      } catch (error) {
        return {
          ...obj,
          password: '*** Erro ao descriptografar ***',
          _id: obj._id.toString()
        };
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      credentials: decryptedCredentials 
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    console.error('Erro ao buscar credenciais:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    await connectToDatabase();

    // Criptografa a senha antes de salvar
    const encryptedPassword = encrypt(body.password);

    const credential = new Credential({
      ...body,
      id: new mongoose.Types.ObjectId().toString(), // Gera um ID único
      password: encryptedPassword,
      userId: session.user.id,
    });

    await credential.save();
    return NextResponse.json({ success: true, credential });
  } catch (error) {
    console.error('Erro ao criar credencial:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
} 