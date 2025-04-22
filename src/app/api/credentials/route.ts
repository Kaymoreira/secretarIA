import { NextResponse } from 'next/server';
import { Credential } from '@/server/models/Credential';
import dbConnect from '@/server/db';
import { encrypt, decrypt } from '@/utils/encryption';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { title, login, password } = await req.json();
    
    const encryptedPassword = encrypt(password);
    const credential = await Credential.create({
      title,
      login,
      password: encryptedPassword,
      userId: 'temp-user-id' // TODO: Pegar o userId da sessão
    });

    return NextResponse.json({ 
      success: true, 
      credential: {
        ...credential.toObject(),
        password: decrypt(credential.password)
      }
    });
  } catch (error) {
    console.error('Error creating credential:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create credential' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await dbConnect();
    const credentials = await Credential.find({ userId: 'temp-user-id' }); // TODO: Pegar o userId da sessão
    
    const decryptedCredentials = credentials.map(cred => ({
      ...cred.toObject(),
      password: decrypt(cred.password)
    }));

    return NextResponse.json({ success: true, credentials: decryptedCredentials });
  } catch (error) {
    console.error('Error fetching credentials:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch credentials' },
      { status: 500 }
    );
  }
} 