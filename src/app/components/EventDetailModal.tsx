'use client';

import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FiEdit2, FiTrash2, FiX } from 'react-icons/fi';

interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: string;
  description?: string;
}

interface EventDetailModalProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const getEventColor = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'treinamento':
      return 'bg-blue-100 border-blue-300 text-blue-800';
    case 'reunião':
      return 'bg-purple-100 border-purple-300 text-purple-800';
    case 'evento':
      return 'bg-green-100 border-green-300 text-green-800';
    case 'tarefa':
      return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    default:
      return 'bg-gray-100 border-gray-300 text-gray-800';
  }
};

const EventDetailModal: React.FC<EventDetailModalProps> = ({ event, isOpen, onClose, onEdit, onDelete }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg w-full max-w-2xl shadow-xl">
        <div className={`p-6 rounded-t-lg ${getEventColor(event.type)} border-b`}>
          <div className="flex justify-between items-start">
            <h2 className="text-2xl font-bold">{event.title}</h2>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-black hover:bg-opacity-10 rounded-full transition-colors"
            >
              <FiX size={24} />
            </button>
          </div>
          <div className="mt-2 text-lg">{event.type}</div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Início</h3>
              <p className="text-lg">
                {format(new Date(event.start), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <p className="text-2xl font-semibold">
                {format(new Date(event.start), "HH:mm", { locale: ptBR })}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Término</h3>
              <p className="text-lg">
                {format(new Date(event.end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <p className="text-2xl font-semibold">
                {format(new Date(event.end), "HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>

          {event.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Descrição</h3>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                {event.description}
              </p>
            </div>
          )}
        </div>

        <div className="border-t p-4 bg-gray-50 rounded-b-lg flex justify-end space-x-2">
          <button
            onClick={onDelete}
            className="px-4 py-2 flex items-center gap-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <FiTrash2 />
            Excluir
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 flex items-center gap-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors"
          >
            <FiEdit2 />
            Editar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventDetailModal; 