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
    this.events.push(event);
    await this.sendImmediateNotification(event);
    await this.checkAndSendNotifications();
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

  public async sendImmediateNotification(event: IEvent) {
    try {
      const { subject, text } = this.generateEmailContent([event]);
      await this.sendEmail(subject, text);
      console.log('Notificação imediata enviada com sucesso para o evento:', event.title);
    } catch (error) {
      console.error('Erro ao enviar notificação imediata:', error);
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
      🎯 Tipo: ${event.type}
      ${event.description ? `ℹ️ Descrição: ${event.description}` : ''}
    `;

    await this.sendEmail(subject, text);
    this.sentNotifications.add(notificationKey);
  }

  private async sendEmail(subject: string, text: string) {
    if (!this.notificationEmail) {
      console.error('Email de notificação não configurado');
      return;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: this.notificationEmail,
        subject,
        text: text.trim()
      });
      console.log('✉️ Email enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar email:', error);
    }
  }
} 