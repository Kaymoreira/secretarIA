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

interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: string;
  description?: string;
}

type ViewMode = 'month' | 'year' | 'agenda';

export default function Calendar() {
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
    type: 'Meeting',
    start: new Date(),
    end: new Date()
  });

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
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/events');
      if (response.ok) {
        const data = await response.json();
        // Convertendo as strings de data para objetos Date
        const parsedEvents = data.map((event: any) => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end)
        }));
        setEvents(parsedEvents);
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

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
  };

  const closeEventDetail = () => {
    setSelectedEvent(null);
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
      // Gera um ID único para o evento
      const event = {
        ...newEvent,
        id: Date.now().toString()
      } as Event;

      // Envia o evento para o backend
      const response = await fetch('http://localhost:3001/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      if (response.ok) {
        // Adiciona o evento à lista e fecha o modal
        setEvents([...events, event]);
        setShowEventModal(false);
        setNewEvent({
          title: '',
          type: 'Meeting',
          start: new Date(),
          end: new Date()
        });
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
      const response = await fetch(`http://localhost:3001/api/events/${event.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove o evento da lista local
        setEvents(events.filter(e => e.id !== event.id));
        // Fecha o modal de detalhes
        setSelectedEvent(null);
        // Fecha o modal de confirmação
        setShowDeleteConfirm(false);
        setEventToDelete(null);
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
    // Agrupa eventos por data
    const eventsByDate = events.reduce((acc: {[key: string]: Event[]}, event) => {
      const dateKey = format(new Date(event.start), 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(event);
      return acc;
    }, {});

    // Ordena as datas
    const sortedDates = Object.keys(eventsByDate).sort();

    return (
      <div className="mt-4 space-y-4">
        {sortedDates.map(dateKey => (
          <div key={dateKey} className="border rounded-lg p-3">
            <h3 className="font-bold text-lg mb-2">
              {format(new Date(dateKey), 'EEEE, d MMMM yyyy', { locale: ptBR })}
            </h3>
            <div className="space-y-2">
              {eventsByDate[dateKey].map(event => (
                <div 
                  key={event.id} 
                  className={`p-2 rounded-lg ${
                    event.type === 'Meeting' ? 'bg-purple-100' : 
                    event.type === 'Training' ? 'bg-blue-100' : 'bg-green-100'
                  } relative`}
                  onClick={() => handleEventClick(event)}
                >
                  <div className="font-semibold">{event.title}</div>
                  <div className="text-sm">
                    {format(new Date(event.start), 'HH:mm')} - {format(new Date(event.end), 'HH:mm')}
                  </div>
                  <button 
                    className="absolute right-2 top-2 text-red-500 hover:text-red-700" 
                    onClick={(e) => confirmDelete(event, e)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">
          {viewMode === 'month' 
            ? format(currentDate, 'MMMM yyyy', { locale: ptBR })
            : viewMode === 'year' 
              ? format(currentDate, 'yyyy', { locale: ptBR })
              : 'Agenda'
          }
        </h2>
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
                className={`border p-2 min-h-[100px] cursor-pointer ${
                  !isCurrentMonth ? 'bg-gray-50 text-gray-400' :
                  isSameDay(day, new Date()) ? 'bg-purple-50 border-purple-300' : ''
                }`}
                onClick={() => handleDateClick(day)}
              >
                <div className="font-semibold">{format(day, 'd')}</div>
                <div className="overflow-y-auto max-h-[80px]">
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`p-1 mb-1 rounded text-sm text-white ${
                        event.type === 'Meeting' ? 'bg-purple-600' : 
                        event.type === 'Training' ? 'bg-blue-500' : 'bg-green-500'
                      } relative group`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                    >
                      <span>{event.title}</span>
                      <button 
                        className="hidden group-hover:block absolute right-1 top-1/2 -translate-y-1/2 text-white hover:text-red-200 text-xs" 
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(event, e);
                        }}
                      >
                        ✕
                      </button>
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
                  <option value="Meeting">Reunião</option>
                  <option value="Training">Treinamento</option>
                  <option value="Event">Evento</option>
                  <option value="Task">Tarefa</option>
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

      {/* Modal de detalhes do evento */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{selectedEvent.title}</h3>
              <button 
                onClick={closeEventDetail}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <span className="font-medium w-24">Data:</span>
                <span>{format(new Date(selectedEvent.start), 'dd/MM/yyyy')}</span>
              </div>
              
              <div className="flex items-center">
                <span className="font-medium w-24">Horário:</span>
                <span>
                  {format(new Date(selectedEvent.start), 'HH:mm')} - 
                  {format(new Date(selectedEvent.end), 'HH:mm')}
                </span>
              </div>
              
              <div className="flex items-center">
                <span className="font-medium w-24">Tipo:</span>
                <span>{selectedEvent.type}</span>
              </div>
              
              {selectedEvent.description && (
                <div>
                  <p className="font-medium mb-1">Descrição:</p>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded">
                    {selectedEvent.description}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-between gap-2 mt-6">
              <button
                onClick={() => confirmDelete(selectedEvent)}
                className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50"
              >
                Deletar Evento
              </button>
              <button
                onClick={closeEventDetail}
                className="px-4 py-2 border rounded-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
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
    </div>
  );
} 