import mongoose from 'mongoose';

interface IMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface IChat {
  userId: string;
  messages: IMessage[];
  createdAt?: Date;
  updatedAt?: Date;
}

const messageSchema = new mongoose.Schema<IMessage>({
  text: { type: String, required: true },
  isUser: { type: Boolean, required: true },
  timestamp: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema<IChat>({
  userId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  messages: [messageSchema]
}, {
  timestamps: true
});

chatSchema.index({ userId: 1 });

export const Chat = (mongoose.models.Chat || mongoose.model<IChat>('Chat', chatSchema)) as mongoose.Model<IChat>; 