import { createTransport } from 'nodemailer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { IEvent } from '../types';

export default class NotificationService {
  private events: IEvent[];
  private readonly transporter;
  private readonly notificationEmail: string;
  private sentNotifications: Set<string>;

  constructor(initialEvents: IEvent[] = []) {
    this.events = initialEvents;
    this.sentNotifications = new Set();
    
    // Configuração do transportador de email
    this.transporter = createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      }
    });

    this.notificationEmail = process.env.NOTIFICATION_EMAIL || '';
  }

  async updateEvents(newEvents: IEvent[]) {
    // Apenas atualiza a lista de eventos sem enviar notificações
    this.events = newEvents;
  }

  async handleNewEvent(event: IEvent) {
    console.log('\n=== HANDLE NEW EVENT CHAMADO ===');
    
    // Extrair e verificar o email do usuário
    const userEmail = (event as any).userEmail;
    
    console.log('Evento recebido:', {
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      type: event.type,
      userEmail: userEmail || 'NÃO FORNECIDO'
    });
    
    if (!userEmail) {
      console.error('ALERTA: Email do usuário não fornecido no evento! O email de notificação padrão será usado.');
    } else {
      console.log('Email do usuário encontrado:', userEmail);
    }
    
    // Adiciona o evento à lista de eventos
    this.events.push(event);
    console.log('Evento adicionado à lista de eventos');
    
    // Envia notificação imediata
    console.log('Enviando notificação imediata...');
    const notificationSent = await this.sendImmediateNotification(event);
    
    if (notificationSent) {
      console.log('Notificação imediata enviada com sucesso!');
    } else {
      console.error('Falha ao enviar notificação imediata!');
    }
    
    // Verifica e agenda notificações futuras
    console.log('Verificando e agendando notificações futuras...');
    await this.checkAndSendNotifications();
    
    console.log('=== FIM DO HANDLE NEW EVENT ===\n');
    return notificationSent;
  }

  private generateEmailContent(events: IEvent[]) {
    const formattedEvents = events.map(event => {
      const formattedDate = format(event.start, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      return `
        📅 Data: ${formattedDate}
        📌 Título: ${event.title}
        🎯 Tipo: ${event.type}
        ${event.description ? `ℹ️ Descrição: ${event.description}` : ''}
      `;
    }).join('\n\n');

    const subject = events.length === 1 
      ? `Novo evento agendado: ${events[0].title}`
      : 'Novos eventos agendados';
    
    const text = events.length === 1
      ? `Um novo evento foi agendado:\n\n${formattedEvents}`
      : `Novos eventos foram agendados:\n\n${formattedEvents}`;

    return { subject, text };
  }

  public async sendImmediateNotification(event: IEvent): Promise<boolean> {
    try {
      const { subject, text } = this.generateEmailContent([event]);
      // Usar o email do usuário se disponível, caso contrário usar o email de notificação padrão
      const userEmail = (event as any).userEmail || this.notificationEmail;
      
      console.log('Tentando enviar notificação para:', userEmail);
      const emailSent = await this.sendEmail(subject, text, userEmail);
      
      if (emailSent) {
        console.log('Notificação imediata enviada com sucesso para o evento:', event.title);
        return true;
      } else {
        console.error('Falha ao enviar email de notificação para o evento:', event.title);
        return false;
      }
    } catch (error) {
      console.error('Erro ao enviar notificação imediata:', error);
      return false;
    }
  }

  private async checkAndSendNotifications() {
    console.log('\n=== Verificação de Notificações ===');
    const now = new Date();
    console.log('Data/Hora atual:', format(now, "dd/MM/yyyy 'às' HH:mm:ss"));

    console.log(`\nVerificando ${this.events.length} eventos...\n`);

    for (const event of this.events) {
      console.log(`Analisando evento: "${event.title}"`);
      console.log('Data do evento:', format(event.start, "dd/MM/yyyy 'às' HH:mm:ss"));

      const timeUntilEvent = event.start.getTime() - now.getTime();
      const hoursUntilEvent = timeUntilEvent / (1000 * 60 * 60);

      if (timeUntilEvent < 0) {
        console.log('➡️ Evento já passou, pulando...\n');
        continue;
      }

      // Notifica 24 horas antes
      if (hoursUntilEvent <= 24 && hoursUntilEvent > 23) {
        await this.sendReminderEmail(event, '24 horas');
      }
      // Notifica 1 hora antes
      else if (hoursUntilEvent <= 1 && hoursUntilEvent > 0) {
        await this.sendReminderEmail(event, '1 hora');
      }
      // Notifica 30 minutos antes
      else if (hoursUntilEvent <= 0.5 && hoursUntilEvent > 0) {
        await this.sendReminderEmail(event, '30 minutos');
      }
      
      console.log('');
    }

    console.log('✅ Verificação concluída!\n');
  }

  private async sendReminderEmail(event: IEvent, timeFrame: string) {
    const notificationKey = `${event.id}-${timeFrame}`;
    if (this.sentNotifications.has(notificationKey)) {
      return;
    }

    const formattedDate = format(event.start, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    const subject = `Lembrete: ${event.title} em ${timeFrame}`;
    const text = `
      Lembrete de evento:
      
      ⏰ Acontecerá em: ${timeFrame}
      📅 Data: ${formattedDate}
      📌 Título: ${event.title}
      🏷️ Tipo: ${event.type}
      ${event.description ? `ℹ️ Descrição: ${event.description}` : ''}
    `;

    // Usar o email do usuário se disponível, caso contrário usar o email de notificação padrão
    const userEmail = (event as any).userEmail || this.notificationEmail;
    await this.sendEmail(subject, text, userEmail);
    this.sentNotifications.add(notificationKey);
  }

  private async sendEmail(subject: string, text: string, to: string) {
    console.log('\n=== NOTIFICATION SERVICE - TENTANDO ENVIAR EMAIL ===');
    
    if (!to) {
      console.error('ERRO CRÍTICO: Email de destinatário não fornecido!');
      console.log('NOTIFICATION_EMAIL (fallback):', process.env.NOTIFICATION_EMAIL);
      
      // Usar o email de notificação como fallback se disponível
      if (process.env.NOTIFICATION_EMAIL) {
        to = process.env.NOTIFICATION_EMAIL;
        console.log('Usando email de fallback:', to);
      } else {
        console.error('Nenhum email de fallback disponível. Abortando envio.');
        return;
      }
    }

    // Verificar se as credenciais de email estão configuradas
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
      console.error('ERRO CRÍTICO: Credenciais de email não configuradas!');
      console.log('EMAIL_USER configurado:', !!process.env.EMAIL_USER);
      console.log('EMAIL_APP_PASSWORD configurado:', !!process.env.EMAIL_APP_PASSWORD);
      return;
    }

    console.log('Configurações do transportador:', {
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER ? process.env.EMAIL_USER.substring(0, 5) + '...' : 'não definido',
        pass: process.env.EMAIL_APP_PASSWORD ? '******' : 'não definido'
      }
    });
    console.log('Destinatário:', to);
    console.log('Assunto:', subject);
    console.log('Conteúdo (resumo):', text.substring(0, 50) + '...');

    try {
      const result = await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: to,
        subject,
        text: text.trim()
      });
      console.log('✉️ Email enviado com sucesso!');
      console.log('Resultado do envio:', result);
      return true;
    } catch (error) {
      console.error('ERRO AO ENVIAR EMAIL:', error);
      return false;
    } finally {
      console.log('=== FIM DA TENTATIVA DE ENVIO ===\n');
    }
  }
} 