// Script para corrigir a senha do usuário no banco de dados
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Conectar ao banco de dados
async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado ao MongoDB');
  } catch (error) {
    console.error('Erro ao conectar ao MongoDB:', error);
    process.exit(1);
  }
}

// Definir o modelo de usuário
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
}, {
  timestamps: true
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Função para corrigir a senha do usuário
async function fixUserPassword(email, newPassword) {
  try {
    // Encontrar o usuário pelo email
    const user = await User.findOne({ email });
    
    if (!user) {
      console.error(`Usuário com email ${email} não encontrado`);
      return false;
    }
    
    // Gerar hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Atualizar a senha do usuário
    user.password = hashedPassword;
    await user.save();
    
    console.log(`Senha do usuário ${email} atualizada com sucesso`);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar senha:', error);
    return false;
  }
}

// Função principal
async function main() {
  await connectToDatabase();
  
  // Email e nova senha do usuário
  const email = process.argv[2];
  const newPassword = process.argv[3];
  
  if (!email || !newPassword) {
    console.error('Uso: node fix-password.js <email> <nova-senha>');
    process.exit(1);
  }
  
  const success = await fixUserPassword(email, newPassword);
  
  if (success) {
    console.log('Senha atualizada com sucesso!');
  } else {
    console.error('Falha ao atualizar a senha');
  }
  
  // Desconectar do banco de dados
  await mongoose.disconnect();
  console.log('Desconectado do MongoDB');
}

// Executar a função principal
main().catch(console.error);
