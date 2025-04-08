'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Rola para o final das mensagens sempre que uma nova mensagem é adicionada
  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    // Cria a mensagem do usuário
    const userMessage: Message = {
      id: Date.now().toString(),
      content: newMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    // Adiciona a mensagem do usuário à lista
    setMessages((prev) => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);

    try {
      // Envia a mensagem para o backend
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: newMessage }),
      });

      const data = await response.json();
      
      // Cria a mensagem da IA
      const aiMessage: Message = {
        id: Date.now().toString(),
        content: data.response,
        sender: 'ai',
        timestamp: new Date(),
      };

      // Adiciona a mensagem da IA à lista
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      
      // Mensagem de erro caso algo dê errado
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para formatar as datas
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  // Função para lidar com a tecla Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 my-8">
            <p>Envie uma mensagem para começar a conversa.</p>
            <p className="text-sm mt-2">
              Você pode perguntar sobre sua agenda, compromissos e tarefas.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 relative ${
                  message.sender === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100'
                }`}
              >
                <div className="text-sm">
                  {message.content}
                </div>
                <div
                  className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-purple-200' : 'text-gray-500'
                  }`}
                >
                  {formatDate(message.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      <div className="border-t p-4">
        <div className="flex space-x-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none"
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading}
            className={`bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
} 