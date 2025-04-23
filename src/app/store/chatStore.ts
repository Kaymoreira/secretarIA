import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatStore {
  messages: Message[];
  addMessage: (text: string, isUser: boolean) => void;
  clearMessages: () => void;
}

const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      messages: [],
      addMessage: (text: string, isUser: boolean) => 
        set((state) => ({
          messages: [
            ...state.messages,
            {
              id: Date.now().toString(),
              text,
              isUser,
              timestamp: new Date(),
            },
          ],
        })),
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'chat-storage',
    }
  )
);

export default useChatStore; 