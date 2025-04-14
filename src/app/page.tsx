'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Define a interface Message aqui também ou importa de Chat.tsx
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

// Carregamento dinâmico dos componentes para evitar problemas de SSR
const Calendar = dynamic(() => import('./components/Calendar'), { ssr: false });
const Chat = dynamic(() => import('./components/Chat'), { ssr: false });

export default function Home() {
  const [activeTab, setActiveTab] = useState<'calendar' | 'chat'>('calendar');
  // Estado das mensagens agora vive aqui
  const [chatMessages, setChatMessages] = useState<Message[]>([]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">SecretarIA</h1>
        
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="flex border-b">
            <button
              className={`px-6 py-3 ${
                activeTab === 'calendar'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab('calendar')}
            >
              Calendário
            </button>
            <button
              className={`px-6 py-3 ${
                activeTab === 'chat'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab('chat')}
            >
              Chat
            </button>
          </div>

          <div className="h-[calc(100vh-200px)]">
            {activeTab === 'calendar' ? <Calendar /> : 
              <Chat 
                messages={chatMessages} 
                setMessages={setChatMessages} 
              />
            }
          </div>
        </div>
      </div>
    </main>
  );
} 