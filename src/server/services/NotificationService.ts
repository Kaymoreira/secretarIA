import nodemailer from 'nodemailer';
import { format, subHours, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import cron from 'node-cron';

interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: string;
  description?: string;
}

class NotificationService {
  private transporter: nodemailer.Transporter;
  private events: Event[];
  private emailQueue: Array<{
    to: string;
    subject: string;
    text: string;
    retries: number;
  }> = [];
  private isProcessingQueue = false;
  private maxRetries = 3;

  constructor(events: Event[]) {
    this.events = events;
    
    // Configuração do serviço de email com pool
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      },
      pool: true,
      maxConnections: 5,
      maxMessages: Infinity,
      rateDelta: 1000,
      rateLimit: 5
    });

    // Inicia o agendador de verificações
    this.startNotificationScheduler();
  }

  private async sendEmail(to: string, subject: string, text: string, retries = 0) {
    console.log(`Adicionando email à fila: ${subject}`);
    this.emailQueue.push({ to, subject, text, retries });
    
    // Processa a fila imediatamente
    await this.processEmailQueue();
  }

  private async processEmailQueue() {
    if (this.isProcessingQueue || this.emailQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    console.log(`Processando fila de emails (${this.emailQueue.length} emails na fila)`);

    while (this.emailQueue.length > 0) {
      const email = this.emailQueue[0];
      
      try {
        console.log(`Tentando enviar email: ${email.subject}`);
        await this.transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email.to,
          subject: email.subject,
          text: email.text
        });
        
        console.log(`✅ Email enviado com sucesso para ${email.to}`);
        this.emailQueue.shift();
      } catch (error) {
        console.error('❌ Erro ao enviar email:', error);
        
        if (email.retries < this.maxRetries) {
          console.log(`Tentativa ${email.retries + 1}/${this.maxRetries} - Movendo para o final da fila`);
          this.emailQueue.shift();
          this.emailQueue.push({
            ...email,
            retries: email.retries + 1
          });
        } else {
          console.error(`❌ Falha ao enviar email após ${this.maxRetries} tentativas`);
          this.emailQueue.shift();
        }
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('Fila de emails processada');
    this.isProcessingQueue = false;
  }

  private generateEmailContent(event: Event, timeUntilEvent: string): string {
    return `
Olá!

${timeUntilEvent === 'agora' 
  ? 'Um novo evento foi adicionado à sua agenda:'
  : `Este é um lembrete para seu evento que acontecerá ${timeUntilEvent}:`}

Evento: ${event.title}
Data: ${format(event.start, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
${event.description ? `Descrição: ${event.description}` : ''}

Atenciosamente,
SecretarIA
    `.trim();
  }

  private async checkAndSendNotifications() {
    const now = new Date();
    const userEmail = process.env.NOTIFICATION_EMAIL;

    console.log('\n=== Verificação de Notificações ===');
    console.log('Data/Hora atual:', format(now, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR }));

    if (!userEmail) {
      console.error('❌ Email do usuário não configurado para notificações');
      return;
    }

    console.log(`\nVerificando ${this.events.length} eventos...`);

    for (const event of this.events) {
      const eventStart = new Date(event.start);
      
      console.log(`\nAnalisando evento: "${event.title}"`);
      console.log('Data do evento:', format(eventStart, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR }));
      
      if (isBefore(eventStart, now)) {
        console.log('➡️ Evento já passou, pulando...');
        continue;
      }

      const oneHourBefore = subHours(eventStart, 1);
      const timeDiffMinutes = Math.round((eventStart.getTime() - now.getTime()) / (1000 * 60));

      console.log('Uma hora antes:', format(oneHourBefore, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR }));
      console.log('Minutos até o evento:', timeDiffMinutes);

      const shouldSendHourBefore = timeDiffMinutes <= 60 && timeDiffMinutes >= 58;

      if (shouldSendHourBefore) {
        console.log('📧 Enviando notificação de uma hora antes...');
        await this.sendEmail(
          userEmail,
          `Lembrete: ${event.title} - Em 1 hora`,
          this.generateEmailContent(event, 'em 1 hora')
        );
      } else {
        console.log(`⏳ Ainda não é hora de enviar notificação (faltam ${timeDiffMinutes} minutos)`);
      }
    }

    console.log('\n✅ Verificação concluída!\n');
  }

  private startNotificationScheduler() {
    console.log('🔄 Iniciando agendador de notificações...');
    cron.schedule('* * * * *', () => {
      this.checkAndSendNotifications();
    });
    console.log('✅ Agendador iniciado com sucesso!');
  }

  public async updateEvents(newEvents: Event[]) {
    console.log('\n=== Atualizando eventos ===');
    
    // Encontra eventos novos comparando IDs
    const newAddedEvents = newEvents.filter(newEvent => 
      !this.events.some(existingEvent => existingEvent.id === newEvent.id)
    );

    // Atualiza a lista de eventos
    this.events = newEvents;

    // Envia notificação imediata para cada novo evento
    const userEmail = process.env.NOTIFICATION_EMAIL;
    if (userEmail && newAddedEvents.length > 0) {
      console.log(`📧 Enviando notificações para ${newAddedEvents.length} novos eventos...`);
      
      try {
        for (const event of newAddedEvents) {
          console.log(`\nPreparando notificação imediata para: ${event.title}`);
          
          // Envia o email diretamente, sem usar a fila
          await this.transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: `Novo Evento: ${event.title}`,
            text: this.generateEmailContent(event, 'agora')
          });
          
          console.log(`✅ Notificação imediata enviada com sucesso para: ${event.title}`);
        }
      } catch (error) {
        console.error('❌ Erro ao enviar notificação imediata:', error);
      }
    } else {
      console.log('Nenhum novo evento para notificar');
    }

    console.log('✅ Atualização de eventos concluída\n');
  }

  // Método público para enviar notificação imediata
  public async sendImmediateNotification(event: Event) {
    console.log(`\n📧 Enviando notificação imediata para: ${event.title}`);
    const userEmail = process.env.NOTIFICATION_EMAIL;
    
    if (!userEmail) {
      console.error('❌ Email do usuário não configurado para notificações');
      return;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: `Novo Evento: ${event.title}`,
        text: this.generateEmailContent(event, 'agora')
      });
      console.log('✅ Notificação imediata enviada com sucesso');
    } catch (error) {
      console.error('❌ Erro ao enviar notificação imediata:', error);
      throw error; // Propaga o erro para tratamento adequado
    }
  }
}

export default NotificationService; 