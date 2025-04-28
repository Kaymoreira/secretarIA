import crypto from 'crypto';

// Função para garantir que a chave tenha 32 bytes
function normalizeKey(key: string): Buffer {
  // Se a chave for menor que 32 bytes, completa com zeros
  // Se for maior, corta para 32 bytes
  const buffer = Buffer.from(key);
  if (buffer.length < 32) {
    const newBuffer = Buffer.alloc(32);
    buffer.copy(newBuffer);
    return newBuffer;
  }
  return buffer.slice(0, 32);
}

const ENCRYPTION_KEY = normalizeKey(process.env.ENCRYPTION_KEY || 'your-fallback-encryption-key-32-chars!!');
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift() || '', 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
} 