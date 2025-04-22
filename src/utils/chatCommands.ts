interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
}

export async function processCommand(message: string): Promise<CommandResult> {
  // Comando para guardar senha
  if (message.toLowerCase().startsWith('guardar senha')) {
    const parts = message.split(' ');
    if (parts.length < 5) {
      return {
        success: false,
        message: 'Formato inválido. Use: guardar senha [título] [login] [senha]'
      };
    }

    const title = parts[2];
    const login = parts[3];
    const password = parts[4];

    try {
      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, login, password }),
      });

      const data = await response.json();
      if (data.success) {
        return {
          success: true,
          message: `Credencial para ${title} salva com sucesso!`
        };
      } else {
        return {
          success: false,
          message: 'Erro ao salvar a credencial.'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao processar o comando.'
      };
    }
  }

  // Comando para mostrar senha
  if (message.toLowerCase().startsWith('mostrar senha')) {
    const parts = message.split(' ');
    if (parts.length < 3) {
      return {
        success: false,
        message: 'Formato inválido. Use: mostrar senha [título]'
      };
    }

    const title = parts[2];

    try {
      const response = await fetch('/api/credentials');
      const data = await response.json();
      
      if (data.success) {
        const credential = data.credentials.find((c: any) => 
          c.title.toLowerCase() === title.toLowerCase()
        );

        if (credential) {
          return {
            success: true,
            message: `Credenciais para ${title}:\nLogin: ${credential.login}\nSenha: ${credential.password}`
          };
        } else {
          return {
            success: false,
            message: `Nenhuma credencial encontrada para ${title}`
          };
        }
      }
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao buscar as credenciais.'
      };
    }
  }

  // Se não for um comando conhecido
  return {
    success: false,
    message: 'Comando não reconhecido. Comandos disponíveis:\n- guardar senha [título] [login] [senha]\n- mostrar senha [título]'
  };
} 