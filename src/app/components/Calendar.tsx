'use client';

import { useState, useEffect } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  addMonths, 
  subMonths, 
  isSameDay, 
  addYears, 
  subYears,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  addDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import EventModal from './EventModal';
import EventDetailModal from './EventDetailModal';
import Logo from './Logo';

interface Event {
  id: string;
  _id?: string;  // Campo opcional para o ID do MongoDB
  title: string;
  start: Date;
  end: Date;
  type: string;
  description?: string;
}

type ViewMode = 'month' | 'year' | 'agenda';

const getEventColor = (type: string) => {
  switch (type.toLowerCase()) {
    case 'treinamento':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'reunião':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'evento':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'tarefa':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Adicione uma função global para atualizar eventos
export function atualizarEventosCalendario() {
  // Esta função pode ser chamada pelo chat (via window.dispatchEvent, por exemplo)
  // para forçar o calendário a buscar os eventos mais recentes
  const evento = new CustomEvent('atualizarEventosCalendario');
  window.dispatchEvent(evento);
}

const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    title: '',
    type: 'Evento',
    start: new Date(),
    end: new Date()
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { locale: ptBR });
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Gera os nomes dos dias da semana começando com Domingo
  const weekDays = eachDayOfInterval({
    start: startOfWeek(new Date(), { locale: ptBR }),
    end: endOfWeek(new Date(), { locale: ptBR })
  }).map(day => format(day, 'EEE', { locale: ptBR }));

  // Busca eventos do backend
  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  // Adiciona um listener para atualizar eventos quando o chat disparar
  useEffect(() => {
    function handleAtualizarEventos() {
      fetchEvents();
    }
    window.addEventListener('atualizarEventosCalendario', handleAtualizarEventos);
    return () => {
      window.removeEventListener('atualizarEventosCalendario', handleAtualizarEventos);
    };
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (response.ok) {
        const data = await response.json();
        console.log('Eventos recebidos da API:', data);
        
        if (!Array.isArray(data)) {
          console.error('Dados recebidos não são um array:', data);
          return;
        }
        
        // Garantindo que cada evento tenha um campo id válido e datas corretamente formatadas
        const parsedEvents = data.map((event: any) => {
          // Converte as strings de data para objetos Date
          const startDate = new Date(event.start);
          const endDate = new Date(event.end);
          
          return {
            ...event,
            // Se o evento não tiver um campo id, usa o _id como id
            id: event.id || event._id,
            start: startDate,
            end: endDate
          };
        });
        
        console.log('Eventos processados:', parsedEvents);
        
        // Define o ano como 2025 para eventos sem ano
        const eventsWithCorrectYear = parsedEvents.map((event: any) => {
          const start = new Date(event.start);
          const end = new Date(event.end);
          
          // Se o ano for 2001 (padrão em alguns casos), ajusta para 2025
          if (start.getFullYear() < 2022) {
            start.setFullYear(2025);
          }
          
          if (end.getFullYear() < 2022) {
            end.setFullYear(2025);
          }
          
          return {
            ...event,
            start,
            end
          };
        });
        
        setEvents(eventsWithCorrectYear);
      }
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handlePreviousYear = () => {
    setCurrentDate(subYears(currentDate, 1));
  };

  const handleNextYear = () => {
    setCurrentDate(addYears(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (day: Date) => {
    setSelectedDate(day);
    setNewEvent({
      ...newEvent,
      start: day,
      end: day
    });
    setShowEventModal(true);
  };

  const handleEventClick = (event: Event, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSelectedEvent(event);
    setShowDetailModal(true);
  };

  const handleEventSave = async (updatedEvent: Event) => {
    try {
      const eventId = updatedEvent._id || updatedEvent.id;
      const eventToUpdate = {
        ...updatedEvent,
        // Garantindo que o _id seja preservado para o MongoDB
        _id: eventId,
        start: new Date(updatedEvent.start),
        end: new Date(updatedEvent.end)
      };

      console.log('Atualizando evento:', eventToUpdate);

      const response = await fetch(`/api/events?id=${encodeURIComponent(eventId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventToUpdate),
      });

      if (response.ok) {
        const savedEvent = await response.json();
        console.log('Evento atualizado:', savedEvent);
        
        // Garantindo que o evento tenha um campo id
        const eventWithId = {
          ...savedEvent,
          id: savedEvent.id || savedEvent._id,
          start: new Date(savedEvent.start),
          end: new Date(savedEvent.end)
        };
        
        // Atualiza o evento na lista local usando comparação mais robusta
        // A função usa _id ou id para garantir que o evento seja encontrado
        setEvents(events.map(e => 
          (e.id === eventWithId.id || 
           e.id === eventWithId._id || 
           e._id === eventWithId._id || 
           e._id === eventWithId.id) ? eventWithId : e
        ));

        // Forçar a atualização da interface buscando eventos novamente
        fetchEvents();
        
        setIsModalOpen(false);
        setSelectedEvent(null);
      } else {
        const error = await response.json();
        console.error('Erro ao atualizar evento:', error);
        alert('Erro ao atualizar evento. Por favor, tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
      alert('Erro ao atualizar evento. Por favor, tente novamente.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewEvent({
      ...newEvent,
      [name]: value
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'start' | 'end') => {
    setNewEvent({
      ...newEvent,
      [field]: new Date(e.target.value)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Não precisamos mais gerar um ID, pois o MongoDB irá gerar um
      const event = {
        ...newEvent,
        start: new Date(newEvent.start || new Date()),
        end: new Date(newEvent.end || new Date())
      } as Event;

      // Envia o evento para o backend
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      if (response.ok) {
        const createdEvent = await response.json();
        console.log('Evento criado:', createdEvent);
        
        // Adiciona o evento à lista e fecha o modal
        // Garantindo que o evento tenha um campo id
        const eventWithId = {
          ...createdEvent,
          id: createdEvent.id || createdEvent._id
        };
        
        setEvents([...events, eventWithId]);
        setShowEventModal(false);
        setNewEvent({
          title: '',
          type: 'Evento',
          start: new Date(),
          end: new Date()
        });
      } else {
        const error = await response.json();
        console.error('Erro ao criar evento:', error);
      }
    } catch (error) {
      console.error('Erro ao criar evento:', error);
    }
  };

  // Filtra eventos para o dia selecionado
  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(new Date(event.start), day));
  };

  const handleDeleteEvent = async (event: Event) => {
    try {
      // Usar _id se disponível, senão usar id
      const eventId = event._id || event.id;
      console.log('Deletando evento com ID:', eventId);
      
      const response = await fetch(`/api/events?id=${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        console.log('Evento excluído com sucesso');
        // Remove o evento da lista local
        setEvents(events.filter(e => e.id !== event.id));
        // Fecha o modal de detalhes
        setSelectedEvent(null);
        // Fecha o modal de confirmação
        setShowDeleteConfirm(false);
        setEventToDelete(null);
      } else {
        const error = await response.json();
        console.error('Erro ao excluir evento:', error);
      }
    } catch (error) {
      console.error('Erro ao excluir evento:', error);
    }
  };

  const confirmDelete = (event: Event, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setEventToDelete(event);
    setShowDeleteConfirm(true);
  };

  // Renderiza os meses em modo de visualização anual
  const renderYearView = () => {
    const months = [];
    const currentYear = currentDate.getFullYear();
    
    for (let month = 0; month < 12; month++) {
      const date = new Date(currentYear, month, 1);
      months.push(
        <div 
          key={month} 
          className="cursor-pointer p-2 border rounded-lg hover:bg-purple-50"
          onClick={() => {
            setCurrentDate(date);
            setViewMode('month');
          }}
        >
          <h3 className="font-bold text-center">{format(date, 'MMMM', { locale: ptBR })}</h3>
          <div className="text-xs text-center">
            {events.filter(e => 
              new Date(e.start).getMonth() === month && 
              new Date(e.start).getFullYear() === currentYear
            ).length} eventos
          </div>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-3 gap-4 mt-4">
        {months}
      </div>
    );
  };

  // Renderiza a visão de agenda
  const renderAgendaView = () => {
    const now = new Date();
    console.log('Data atual para comparação:', now);
    
    // Verifica todos os eventos disponíveis
    console.log('Todos os eventos disponíveis:', events);
    
    // Tenta filtrar eventos futuros
    let futureEvents = events
      .filter(event => {
        // Garante que estamos comparando objetos Date
        const eventEndDate = new Date(event.end);
        console.log(`Evento: ${event.title}, Data fim: ${eventEndDate}, É futuro: ${eventEndDate >= now}`);
        return eventEndDate >= now;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    
    // Se não houver eventos futuros, exibe todos os eventos
    if (futureEvents.length === 0 && events.length > 0) {
      console.log('Nenhum evento futuro encontrado. Mostrando todos os eventos.');
      futureEvents = [...events].sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
    }
    
    console.log('Eventos filtrados para exibição:', futureEvents);

    return (
      <div className="space-y-4">
        {futureEvents.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Nenhum evento encontrado.</p>
        ) : (
          futureEvents.map(event => (
            <div
              key={event.id}
              className={`p-3 rounded-lg border ${getEventColor(event.type)} cursor-pointer`}
              onClick={() => handleEventClick(event)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{event.title}</h3>
                  <p className="text-sm">
                    {format(new Date(event.start), "dd/MM/yyyy' • 'HH:mm", { locale: ptBR })} - 
                    {format(new Date(event.end), "HH:mm", { locale: ptBR })}
                  </p>
                  {event.description && (
                    <p className="text-sm mt-1">{event.description}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditEvent(event);
                    }}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <FiEdit2 size={16} />
                  </button>
                  <button
                    onClick={(e) => confirmDelete(event, e)}
                    className="text-gray-600 hover:text-red-600"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsEditModalOpen(true);
  };

  const handleEditClick = () => {
    setShowDetailModal(false);
    setIsModalOpen(true);
  };

  const handleDeleteClick = () => {
    setShowDetailModal(false);
    setEventToDelete(selectedEvent);
    setShowDeleteConfirm(true);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Logo className="scale-110" />
          <h2 className="text-2xl font-semibold text-gray-800">
            {format(currentDate, 'MMMM', { locale: ptBR })} {format(currentDate, 'yyyy')}
          </h2>
        </div>
        <div className="flex gap-2">
          {viewMode === 'month' && (
            <>
              <button
                className="bg-gray-200 px-3 py-1 rounded-lg"
                onClick={handlePreviousMonth}
              >
                Anterior
              </button>
              <button
                className="bg-purple-600 text-white px-3 py-1 rounded-lg"
                onClick={handleToday}
              >
                Hoje
              </button>
              <button
                className="bg-gray-200 px-3 py-1 rounded-lg"
                onClick={handleNextMonth}
              >
                Próximo
              </button>
            </>
          )}
          
          {viewMode === 'year' && (
            <>
              <button
                className="bg-gray-200 px-3 py-1 rounded-lg"
                onClick={handlePreviousYear}
              >
                Ano Anterior
              </button>
              <button
                className="bg-purple-600 text-white px-3 py-1 rounded-lg"
                onClick={handleToday}
              >
                Hoje
              </button>
              <button
                className="bg-gray-200 px-3 py-1 rounded-lg"
                onClick={handleNextYear}
              >
                Próximo Ano
              </button>
            </>
          )}
          
          <div className="border-l pl-2 flex gap-2">
            <button
              className={`px-3 py-1 rounded-lg ${viewMode === 'month' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
              onClick={() => setViewMode('month')}
            >
              Mês
            </button>
            <button
              className={`px-3 py-1 rounded-lg ${viewMode === 'year' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
              onClick={() => setViewMode('year')}
            >
              Ano
            </button>
            <button
              className={`px-3 py-1 rounded-lg ${viewMode === 'agenda' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
              onClick={() => setViewMode('agenda')}
            >
              Agenda
            </button>
          </div>
          
          <button
            className="bg-purple-600 text-white px-4 py-2 rounded-lg"
            onClick={() => setShowEventModal(true)}
          >
            Adicionar Evento
          </button>
        </div>
      </div>

      {viewMode === 'month' && (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center font-bold">
              {day}
            </div>
          ))}
          {days.map((day) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            
            return (
              <div
                key={day.toISOString()}
                className={`border p-2 min-h-[120px] cursor-pointer ${
                  !isCurrentMonth ? 'bg-gray-50 text-gray-400' :
                  isSameDay(day, new Date()) ? 'bg-purple-50 border-purple-300' : ''
                }`}
                onClick={() => handleDateClick(day)}
              >
                <div className="font-semibold mb-1">{format(day, 'd')}</div>
                <div className="space-y-1">
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => handleEventClick(event, e)}
                      className={`cursor-pointer p-1 mb-1 rounded text-sm ${getEventColor(event.type)} border`}
                    >
                      <div className="font-semibold truncate">{event.title}</div>
                      <div className="text-xs truncate">{format(new Date(event.start), 'HH:mm')}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'year' && renderYearView()}
      {viewMode === 'agenda' && renderAgendaView()}

      {/* Modal para adicionar evento */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Adicionar Novo Evento</h3>
            
            {selectedDate && (
              <div className="mb-4 p-2 bg-gray-50 rounded">
                <div className="font-medium">Eventos em {format(selectedDate, 'dd/MM/yyyy')}</div>
                {getEventsForDay(selectedDate).length > 0 ? (
                  <ul className="mt-2 text-sm">
                    {getEventsForDay(selectedDate).map(event => (
                      <li key={event.id} className="flex justify-between">
                        <span>{event.title}</span>
                        <span className="text-gray-500">
                          {format(new Date(event.start), 'HH:mm')} - {format(new Date(event.end), 'HH:mm')}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500 mt-2">Nenhum evento neste dia</div>
                )}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block mb-1">Nome do Evento *</label>
                <input
                  type="text"
                  name="title"
                  value={newEvent.title}
                  onChange={handleInputChange}
                  className="w-full border rounded-lg p-2"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block mb-1">Data e Hora de Início *</label>
                <input
                  type="datetime-local"
                  value={newEvent.start ? format(new Date(newEvent.start), "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(e) => handleDateChange(e, 'start')}
                  className="w-full border rounded-lg p-2"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block mb-1">Data e Hora de Término *</label>
                <input
                  type="datetime-local"
                  value={newEvent.end ? format(new Date(newEvent.end), "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(e) => handleDateChange(e, 'end')}
                  className="w-full border rounded-lg p-2"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block mb-1">Tipo de Evento</label>
                <select
                  name="type"
                  value={newEvent.type}
                  onChange={handleInputChange}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="Reunião">Reunião</option>
                  <option value="Treinamento">Treinamento</option>
                  <option value="Evento">Evento</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block mb-1">Descrição</label>
                <textarea
                  name="description"
                  value={newEvent.description || ''}
                  onChange={handleInputChange}
                  className="w-full border rounded-lg p-2"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEventModal(false);
                    setSelectedDate(null);
                  }}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg"
                >
                  Criar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedEvent && (
        <>
          <EventDetailModal
            event={selectedEvent}
            isOpen={showDetailModal}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedEvent(null);
            }}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
          />
          <EventModal
            event={selectedEvent}
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedEvent(null);
            }}
            onSave={handleEventSave}
          />
        </>
      )}

      {/* Modal de confirmação de exclusão */}
      {showDeleteConfirm && eventToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Confirmar Exclusão</h3>
            <p className="mb-6">
              Tem certeza que deseja excluir o evento "{eventToDelete.title}"?
              Esta ação não pode ser desfeita.
            </p>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteEvent(eventToDelete)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg"
              >
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {isEditModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Editar Evento</h3>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Título</label>
                <input
                  type="text"
                  value={selectedEvent.title}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo</label>
                <select
                  value={selectedEvent.type}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                >
                  <option value="treinamento">Treinamento</option>
                  <option value="reunião">Reunião</option>
                  <option value="evento">Evento</option>
                </select>
              </div>
              {/* Adicione mais campos conforme necessário */}
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar; 