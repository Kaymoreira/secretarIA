import mongoose from 'mongoose';
import { encrypt } from '@/utils/encryption';

export interface IUser {
  _id?: string;
  email: string;
  password: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new mongoose.Schema<IUser>({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    validate: {
      validator: function(v: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Email inválido'
    }
  },
  password: { 
    type: String, 
    required: true,
    set: (password: string) => encrypt(password) // Criptografa a senha antes de salvar
  },
  name: { type: String, required: true },
}, {
  timestamps: true
});

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema); 