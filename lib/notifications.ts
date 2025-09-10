export interface Notification {
  id: string;
  type: 'conta' | 'prazo' | 'sistema' | 'divida'; // Adicionado 'divida' como um tipo possível
  message: string;
  dueDate?: string; // Opcional para contas a vencer
  read: boolean; // Alterado de is_read para read
  created_at?: string; // Adicionado para notificações persistidas no DB
}

/**
 * Função para buscar notificações do backend.
 * @returns Uma Promise que resolve com um array de notificações.
 */
export async function fetchNotifications(): Promise<Notification[]> {
  try {
    const token = localStorage.getItem('token'); // Obter o token JWT do localStorage
    if (!token) {
      throw new Error('Token de autenticação não encontrado.');
    }

    const response = await fetch('/api/notifications', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Falha ao buscar notificações do backend.');
    }

    const data: Notification[] = await response.json();
    return data.map(notif => ({
      ...notif,
      read: notif.read || false, // Garantir que read é boolean
    }));
  } catch (error) {
    console.error("Erro em fetchNotifications:", error);
    throw error; // Re-lançar o erro para ser tratado no componente
  }
}

/**
 * Função para marcar notificações como lidas no backend.
 * Você substituiria esta implementação por uma chamada à sua API para atualizar o status no servidor.
 * @param ids Array de IDs das notificações a serem marcadas como lidas.
 */
export async function markNotificationsAsRead(ids: string[]): Promise<void> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Token de autenticação não encontrado.');
    }

    const response = await fetch('/api/notifications/mark-as-read', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notificationIds: ids }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Falha ao marcar notificações como lidas no backend.');
    }
    console.log(`Notificações marcadas como lidas: ${ids.join(', ')}`);
  } catch (error) {
    console.error("Erro em markNotificationsAsRead:", error);
    throw error; // Re-lançar o erro para ser tratado no componente
  }
}
