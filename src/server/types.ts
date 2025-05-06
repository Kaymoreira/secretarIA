export interface IEvent {
  _id?: string;
  id?: string; // Para compatibilidade com o frontend
  title: string;
  start: Date;
  end: Date;
  type: 'Reunião' | 'Evento' | 'Treinamento';
  description?: string;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICredential {
  _id?: string;
  id: string;
  title: string;
  login: string;
  password: string;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
} 