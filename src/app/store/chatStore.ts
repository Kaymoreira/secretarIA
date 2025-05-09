import { create } from 'zustand';

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

const useChatStore = create<ChatStore>((set) => ({
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
}));

export default useChatStore; 