import crypto from 'crypto';
import bcrypt from 'bcrypt';

// Função para garantir que a chave tenha 32 bytes usando SHA-256
function normalizeKey(key: string): Buffer {
  // Sempre usa SHA-256 para gerar uma chave consistente de 32 bytes
  const hash = crypto.createHash('sha256');
  hash.update(key);
  return hash.digest();
}

// Usa uma única chave de criptografia para toda a aplicação
const ENCRYPTION_KEY = normalizeKey(process.env.ENCRYPTION_KEY || 'dev-key-secretaria-development-only');
const IV_LENGTH = 16;

const SALT_ROUNDS = 10;

// Funções para autenticação de usuários
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePasswords(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

// Funções para criptografia de credenciais
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  try {
    const textParts = text.split(':');
    if (textParts.length !== 2) {
      throw new Error('Formato inválido de texto criptografado');
    }
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = Buffer.from(textParts[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Erro ao descriptografar:', error);
    throw new Error('Falha ao descriptografar a senha');
  }
} 