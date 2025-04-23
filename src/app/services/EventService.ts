import { endOfWeek, startOfDay, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: string;
  description?: string;
}

export class EventService {
  static async getWeekEvents(fromDate: Date = new Date()): Promise<Event[]> {
    try {
      const response = await fetch('http://localhost:3001/api/events');
      if (!response.ok) {
        throw new Error('Erro ao buscar eventos');
      }

      const data = await response.json();
      const events = data.map((event: any) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end)
      }));

      // Define o intervalo da semana (do dia atual até domingo)
      const weekInterval = {
        start: startOfDay(fromDate),
        end: endOfWeek(fromDate, { locale: ptBR })
      };

      // Filtra eventos dentro do intervalo
      return events.filter(event => 
        isWithinInterval(event.start, weekInterval)
      ).sort((a, b) => a.start.getTime() - b.start.getTime());
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      return [];
    }
  }

  static formatEventResponse(events: Event[]): string {
    if (events.length === 0) {
      return "Não há eventos agendados para esta semana.";
    }

    let currentDate = '';
    return events.reduce((response, event) => {
      const eventDate = event.start.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      let eventText = '';
      if (currentDate !== eventDate) {
        currentDate = eventDate;
        eventText += `\n**${eventDate}**\n`;
      }

      eventText += `• **${event.title}** (${event.type})\n`;
      eventText += `⏰ ${event.start.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit'
      })} - ${event.end.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit'
      })}\n`;
      
      if (event.description) {
        eventText += `📝 ${event.description}\n`;
      }

      return response + eventText;
    }, '');
  }
} 