import { NextResponse } from 'next/server';
import { Credential } from '@/server/models/Credential';
import dbConnect from '@/server/db';
import { encrypt } from '@/utils/encryption';

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const { title, login, password } = await req.json();
    
    const encryptedPassword = encrypt(password);
    const credential = await Credential.findByIdAndUpdate(
      params.id,
      { title, login, password: encryptedPassword },
      { new: true }
    );

    if (!credential) {
      return NextResponse.json(
        { success: false, error: 'Credential not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, credential });
  } catch (error) {
    console.error('Error updating credential:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update credential' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const credential = await Credential.findByIdAndDelete(params.id);

    if (!credential) {
      return NextResponse.json(
        { success: false, error: 'Credential not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting credential:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete credential' },
      { status: 500 }
    );
  }
} 