import nodemailer from 'nodemailer';

// Configuração do transporte de email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

// Função para enviar email de confirmação de criação de evento
export async function sendEventConfirmationEmail(
  userEmail: string,
  eventTitle: string,
  eventDate: Date,
  eventTime: string,
  eventDuration: string,
  eventDescription?: string
) {
  const formattedDate = eventDate.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Emoji baseado no título do evento
  let emoji = '📅';
  if (eventTitle.toLowerCase().includes('reunião') || eventTitle.toLowerCase().includes('reuniao')) {
    emoji = '💼';
  } else if (eventTitle.toLowerCase().includes('aniversário') || eventTitle.toLowerCase().includes('aniversario')) {
    emoji = '🎂';
  } else if (eventTitle.toLowerCase().includes('médico') || eventTitle.toLowerCase().includes('medico') || eventTitle.toLowerCase().includes('saúde') || eventTitle.toLowerCase().includes('saude')) {
    emoji = '🏥';
  } else if (eventTitle.toLowerCase().includes('viagem') || eventTitle.toLowerCase().includes('viajar')) {
    emoji = '✈️';
  } else if (eventTitle.toLowerCase().includes('esporte') || eventTitle.toLowerCase().includes('treino') || eventTitle.toLowerCase().includes('academia')) {
    emoji = '🏋️';
  } else if (eventTitle.toLowerCase().includes('cachorro') || eventTitle.toLowerCase().includes('pet') || eventTitle.toLowerCase().includes('gato')) {
    emoji = '🐾';
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: `${emoji} Evento criado: ${eventTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #6a5acd; text-align: center;">${emoji} Seu evento foi criado com sucesso!</h2>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <h3 style="margin-top: 0; color: #333;">${eventTitle}</h3>
          <p style="margin: 5px 0;"><strong>Data:</strong> ${formattedDate}</p>
          <p style="margin: 5px 0;"><strong>Horário:</strong> ${eventTime}</p>
          <p style="margin: 5px 0;"><strong>Duração:</strong> ${eventDuration}</p>
          ${eventDescription ? `<p style="margin: 5px 0;"><strong>Descrição:</strong> ${eventDescription}</p>` : ''}
        </div>
        <p style="text-align: center; margin-top: 20px; color: #666;">Este é um email automático enviado pela SecretarIA. Não responda a este email.</p>
      </div>
    `
  };

  try {
    console.log('=== TENTANDO ENVIAR EMAIL DE CONFIRMAÇÃO ===');
    console.log('Configurações do transportador:', {
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER ? process.env.EMAIL_USER.substring(0, 5) + '...' : 'não definido',
        pass: process.env.EMAIL_APP_PASSWORD ? '******' : 'não definido'
      }
    });
    console.log('Destinatário:', userEmail);
    console.log('Assunto:', mailOptions.subject);
    
    const result = await transporter.sendMail(mailOptions);
    console.log(`Email de confirmação enviado para ${userEmail}`);
    console.log('Resultado do envio:', result);
    return true;
  } catch (error) {
    console.error('Erro ao enviar email de confirmação:', error);
    return false;
  }
}

// Função para enviar email de lembrete de evento (1 hora antes)
export async function sendEventReminderEmail(
  userEmail: string,
  eventTitle: string,
  eventDate: Date,
  eventTime: string,
  eventLocation?: string
) {
  const formattedDate = eventDate.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Emoji baseado no título do evento (mesmo padrão da função anterior)
  let emoji = '📅';
  if (eventTitle.toLowerCase().includes('reunião') || eventTitle.toLowerCase().includes('reuniao')) {
    emoji = '💼';
  } else if (eventTitle.toLowerCase().includes('aniversário') || eventTitle.toLowerCase().includes('aniversario')) {
    emoji = '🎂';
  } else if (eventTitle.toLowerCase().includes('médico') || eventTitle.toLowerCase().includes('medico') || eventTitle.toLowerCase().includes('saúde') || eventTitle.toLowerCase().includes('saude')) {
    emoji = '🏥';
  } else if (eventTitle.toLowerCase().includes('viagem') || eventTitle.toLowerCase().includes('viajar')) {
    emoji = '✈️';
  } else if (eventTitle.toLowerCase().includes('esporte') || eventTitle.toLowerCase().includes('treino') || eventTitle.toLowerCase().includes('academia')) {
    emoji = '🏋️';
  } else if (eventTitle.toLowerCase().includes('cachorro') || eventTitle.toLowerCase().includes('pet') || eventTitle.toLowerCase().includes('gato')) {
    emoji = '🐾';
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: `⏰ Lembrete: ${eventTitle} em 1 hora`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #6a5acd; text-align: center;">⏰ Lembrete de evento</h2>
        <p style="text-align: center; font-size: 16px;">Seu evento começa em 1 hora!</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <h3 style="margin-top: 0; color: #333;">${emoji} ${eventTitle}</h3>
          <p style="margin: 5px 0;"><strong>Data:</strong> ${formattedDate}</p>
          <p style="margin: 5px 0;"><strong>Horário:</strong> ${eventTime}</p>
          ${eventLocation ? `<p style="margin: 5px 0;"><strong>Local:</strong> ${eventLocation}</p>` : ''}
        </div>
        <p style="text-align: center; margin-top: 20px; color: #666;">Este é um email automático enviado pela SecretarIA. Não responda a este email.</p>
      </div>
    `
  };

  try {
    console.log('=== TENTANDO ENVIAR EMAIL DE LEMBRETE ===');
    console.log('Configurações do transportador:', {
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER ? process.env.EMAIL_USER.substring(0, 5) + '...' : 'não definido',
        pass: process.env.EMAIL_APP_PASSWORD ? '******' : 'não definido'
      }
    });
    console.log('Destinatário:', userEmail);
    console.log('Assunto:', mailOptions.subject);
    
    const result = await transporter.sendMail(mailOptions);
    console.log(`Email de lembrete enviado para ${userEmail}`);
    console.log('Resultado do envio:', result);
    return true;
  } catch (error) {
    console.error('Erro ao enviar email de lembrete:', error);
    return false;
  }
}

// Função para agendar o envio de email de lembrete 1 hora antes do evento
export function scheduleReminderEmail(
  userEmail: string,
  eventTitle: string,
  eventDate: Date,
  eventTime: string,
  eventLocation?: string
) {
  const eventDateTime = new Date(eventDate);
  const reminderTime = new Date(eventDateTime.getTime() - 60 * 60 * 1000); // 1 hora antes
  const now = new Date();
  
  // Se o horário de lembrete já passou, não agendar
  if (reminderTime <= now) {
    console.log('Horário de lembrete já passou, não será agendado');
    return;
  }
  
  // Calcular o tempo de espera em milissegundos
  const timeToWait = reminderTime.getTime() - now.getTime();
  
  // Agendar o envio do email para 1 hora antes do evento
  setTimeout(() => {
    sendEventReminderEmail(userEmail, eventTitle, eventDate, eventTime, eventLocation);
  }, timeToWait);
  
  console.log(`Lembrete agendado para ${reminderTime.toLocaleString('pt-BR')} (1 hora antes do evento)`);
}
