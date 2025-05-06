import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  // Remove o cookie de autenticação
  cookies().delete('auth-token');

  return NextResponse.json({
    message: 'Logout realizado com sucesso'
  });
} 