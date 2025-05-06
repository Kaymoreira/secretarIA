'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Event {
  id: string;
  _id?: string;  // Campo opcional para o ID do MongoDB
  title: string;
  start: Date;
  end: Date;
  type: string;
  description?: string;
}

interface EventModalProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedEvent: Event) => void;
}

const EventModal: React.FC<EventModalProps> = ({ event, isOpen, onClose, onSave }) => {
  const [editedEvent, setEditedEvent] = useState<Event>(event);

  useEffect(() => {
    setEditedEvent(event);
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const eventId = editedEvent.id || editedEvent._id || '';
      
      // Log dos dados que serão enviados
      console.log('Dados a serem enviados para atualização:', {
        id: eventId,
        title: editedEvent.title,
        start: new Date(editedEvent.start),
        end: new Date(editedEvent.end),
        type: editedEvent.type,
        description: editedEvent.description
      });
      
      const response = await fetch(`/api/events?id=${encodeURIComponent(eventId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editedEvent,
          _id: eventId,
          start: new Date(editedEvent.start),
          end: new Date(editedEvent.end)
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao atualizar evento');
      }

      const updatedEvent = await response.json();
      console.log('Resposta do servidor após atualização:', updatedEvent);
      
      // Garantir que os dados estejam em formato Date
      const processedEvent = {
        ...updatedEvent,
        id: updatedEvent.id || updatedEvent._id,
        start: new Date(updatedEvent.start),
        end: new Date(updatedEvent.end)
      };
      
      // Notificar o componente pai
      onSave(processedEvent);
      onClose();
      
      // Forçar atualização do calendário
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('atualizarEventosCalendario'));
      }
      
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      alert('Erro ao salvar as alterações. Por favor, tente novamente.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Editar Evento</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Título</label>
            <input
              type="text"
              value={editedEvent.title}
              onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo</label>
            <select
              value={editedEvent.type}
              onChange={(e) => setEditedEvent({ ...editedEvent, type: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              required
            >
              <option value="Treinamento">Treinamento</option>
              <option value="Reunião">Reunião</option>
              <option value="Evento">Evento</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Data e Hora de Início</label>
            <input
              type="datetime-local"
              value={format(new Date(editedEvent.start), "yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => setEditedEvent({ ...editedEvent, start: new Date(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Data e Hora de Término</label>
            <input
              type="datetime-local"
              value={format(new Date(editedEvent.end), "yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => setEditedEvent({ ...editedEvent, end: new Date(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Descrição</label>
            <textarea
              value={editedEvent.description || ''}
              onChange={(e) => setEditedEvent({ ...editedEvent, description: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              onClick={onClose}
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
  );
};

export default EventModal; 