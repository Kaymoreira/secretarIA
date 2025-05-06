import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import mongoose from 'mongoose';

export async function GET() {
  try {
    // Tenta conectar ao MongoDB
    await connectToDatabase();
    
    // Cria uma coleção de teste temporária
    const TestModel = mongoose.models.Test || mongoose.model('Test', new mongoose.Schema({
      message: String,
      timestamp: Date
    }));

    // Insere um documento de teste
    const testDoc = await TestModel.create({
      message: 'Teste de conexão com MongoDB',
      timestamp: new Date()
    });

    // Recupera o documento
    const foundDoc = await TestModel.findById(testDoc._id);

    // Deleta o documento
    await TestModel.findByIdAndDelete(testDoc._id);

    return NextResponse.json({
      status: 'success',
      message: 'Conexão com MongoDB funcionando corretamente',
      testResults: {
        connected: true,
        documentCreated: !!testDoc,
        documentFound: !!foundDoc,
        documentDeleted: true
      }
    });

  } catch (error) {
    console.error('Erro no teste do MongoDB:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Erro ao testar conexão com MongoDB',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
} 