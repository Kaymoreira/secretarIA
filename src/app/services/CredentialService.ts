import { ICredential } from '@/server/types';

export class CredentialService {
  private static BASE_URL = '/api/credentials';

  static async getAll(): Promise<ICredential[]> {
    try {
      const response = await fetch(this.BASE_URL, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Falha ao buscar credenciais');
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Falha ao buscar credenciais');
      }
      return data.credentials;
    } catch (error) {
      console.error('Erro ao buscar credenciais:', error);
      throw error;
    }
  }

  static async create(credential: Omit<ICredential, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<ICredential> {
    try {
      const response = await fetch(this.BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credential),
      });

      if (!response.ok) {
        throw new Error('Falha ao criar credencial');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Falha ao criar credencial');
      }

      return data.credential;
    } catch (error) {
      console.error('Erro ao criar credencial:', error);
      throw error;
    }
  }

  static async update(id: string, credential: Partial<ICredential>): Promise<ICredential> {
    try {
      const response = await fetch(`${this.BASE_URL}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credential),
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar credencial');
      }

      return response.json();
    } catch (error) {
      console.error('Erro ao atualizar credencial:', error);
      throw error;
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.BASE_URL}/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Falha ao deletar credencial');
      }
    } catch (error) {
      console.error('Erro ao deletar credencial:', error);
      throw error;
    }
  }

  static async getById(id: string): Promise<ICredential> {
    try {
      const response = await fetch(`${this.BASE_URL}/${id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Falha ao buscar credencial');
      }
      return response.json();
    } catch (error) {
      console.error('Erro ao buscar credencial:', error);
      throw error;
    }
  }
} 