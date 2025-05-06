import mongoose from 'mongoose';
import { ICredential } from '../types';

const credentialSchema = new mongoose.Schema<ICredential>(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    login: { type: String, required: true },
    password: { type: String, required: true },
    userId: { type: String, required: true, index: true }
  },
  { timestamps: true }
);

// Adiciona índices compostos para melhorar a busca
credentialSchema.index({ userId: 1, title: 1 });
credentialSchema.index({ userId: 1, login: 1 });

// Verifica se o modelo já existe antes de criar um novo
export const Credential = mongoose.models.Credential || mongoose.model<ICredential>('Credential', credentialSchema); 