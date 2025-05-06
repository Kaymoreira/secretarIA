import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import { User } from '@/server/models/User';
import { encrypt, decrypt } from '@/utils/encryption';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.ENCRYPTION_KEY || 'default-secret-key';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Busca o usuário
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 401 }
      );
    }

    // Verifica a senha
    const encryptedPassword = encrypt(password);
    if (user.password !== encryptedPassword) {
      return NextResponse.json(
        { error: 'Senha incorreta' },
        { status: 401 }
      );
    }

    // Cria o token JWT
    const token = await new SignJWT({ 
      userId: user._id,
      email: user.email,
      name: user.name
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(new TextEncoder().encode(JWT_SECRET));

    // Define o cookie com o token
    cookies().set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 // 24 horas
    });

    // Remove a senha do retorno
    const { password: _, ...userWithoutPassword } = user.toObject();

    return NextResponse.json({
      user: userWithoutPassword,
      message: 'Login realizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer login' },
      { status: 500 }
    );
  }
} 