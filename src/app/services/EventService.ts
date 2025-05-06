import { endOfWeek, startOfDay, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: string;
  description?: string;
  userId?: string;
}

export class EventService {
  static async getWeekEvents(fromDate: Date = new Date()): Promise<Event[]> {
    try {
      console.log('[EVENT_SERVICE] Buscando eventos da semana...');
      const response = await fetch('/api/events');

      if (!response.ok) {
        throw new Error('Erro ao buscar eventos');
      }

      const data = await response.json();
      console.log('[EVENT_SERVICE] Dados recebidos:', data);

      // Verifica se há dados válidos
      if (!Array.isArray(data)) {
        console.error('[EVENT_SERVICE] Formato inválido de dados:', data);
        return [];
      }

      const now = new Date();
      console.log('[EVENT_SERVICE] Data atual:', now);

      // Converte datas e garante que cada evento tenha um ID
      const events = data.map((event: any) => ({
        ...event,
        id: event.id || event._id,
        start: new Date(event.start),
        end: new Date(event.end)
      }));

      console.log('[EVENT_SERVICE] Eventos após conversão:', events);

      // Filtra eventos futuros (data de fim maior ou igual à data atual)
      const futureEvents = events.filter(event => {
        const isInFuture = event.end >= now;
        console.log(`[EVENT_SERVICE] Evento "${event.title}" (${event.end}) é futuro? ${isInFuture}`);
        return isInFuture;
      });

      console.log('[EVENT_SERVICE] Eventos futuros:', futureEvents);

      // Ordena por data de início
      return futureEvents.sort((a: Event, b: Event) => a.start.getTime() - b.start.getTime());
    } catch (error) {
      console.error('[EVENT_SERVICE] Erro ao buscar eventos:', error);
      throw error;
    }
  }

  static async createEvent(eventData: Omit<Event, 'id'>): Promise<Event> {
    try {
      // Remove o campo id se existir
      const { id, ...eventDataWithoutId } = eventData as any;
      
      console.log('[EVENT_SERVICE] Criando evento:', eventDataWithoutId);
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventDataWithoutId)
      });

      if (!response.ok) {
        throw new Error('Erro ao criar evento');
      }

      const data = await response.json();
      console.log('[EVENT_SERVICE] Evento criado:', data);

      return {
        ...data,
        start: new Date(data.start),
        end: new Date(data.end)
      };
    } catch (error) {
      console.error('[EVENT_SERVICE] Erro ao criar evento:', error);
      throw error;
    }
  }

  static async updateEvent(id: string, eventData: Partial<Event>): Promise<Event> {
    try {
      console.log('[EVENT_SERVICE] Atualizando evento:', id, eventData);
      const response = await fetch('/api/events', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...eventData, _id: id })
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar evento');
      }

      const data = await response.json();
      console.log('[EVENT_SERVICE] Evento atualizado:', data);

      return {
        ...data,
        start: new Date(data.start),
        end: new Date(data.end)
      };
    } catch (error) {
      console.error('[EVENT_SERVICE] Erro ao atualizar evento:', error);
      throw error;
    }
  }

  static async deleteEvent(id: string): Promise<void> {
    try {
      console.log('[EVENT_SERVICE] Deletando evento:', id);
      const response = await fetch(`/api/events?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar evento');
      }
    } catch (error) {
      console.error('[EVENT_SERVICE] Erro ao deletar evento:', error);
      throw error;
    }
  }

  static formatEventResponse(events: Event[]): string {
    if (events.length === 0) {
      return "Não há eventos agendados para este período. 📅";
    }

    // Organiza eventos por data
    const eventsByDate: { [key: string]: Event[] } = {};
    events.forEach(event => {
      const dateStr = event.start.toLocaleDateString('pt-BR', { 
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      if (!eventsByDate[dateStr]) {
        eventsByDate[dateStr] = [];
      }
      eventsByDate[dateStr].push(event);
    });

    // Formata resposta
    let result = '';
    
    // Ordena as datas
    const sortedDates = Object.keys(eventsByDate).sort((a, b) => {
      const dateA = new Date(a.split('/').reverse().join('-'));
      const dateB = new Date(b.split('/').reverse().join('-'));
      return dateA.getTime() - dateB.getTime();
    });
    
    sortedDates.forEach(dateStr => {
      const weekday = events.find(e => {
        return e.start.toLocaleDateString('pt-BR', { 
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }) === dateStr;
      })?.start.toLocaleDateString('pt-BR', { weekday: 'long' });
      
      const formattedDate = `${weekday}, ${dateStr}`;
      result += `\n📅 ${formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)}\n\n`;
      
      // Eventos do dia
      eventsByDate[dateStr].forEach((event, index) => {
        const start = event.start.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit'
        });
        const end = event.end.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit'
        });
        
        const emoji = event.type === 'Reunião' ? '👥' : 
                     event.type === 'Treinamento' ? '📚' : 
                     '🎯';
        
        result += `${index + 1}. ${event.title}\n`;
        result += `   🕐 ${start} às ${end}\n`;
        result += `   ${emoji} ${event.type}\n`;
        
        if (event.description) {
          result += `   ℹ️ ${event.description}\n`;
        }
        
        result += '\n';
      });
    });
    
    return result.trim();
  }
} 