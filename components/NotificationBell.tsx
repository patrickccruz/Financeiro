import { Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchNotifications, markNotificationsAsRead, Notification } from "@/lib/notifications";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getNotifications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedNotifications = await fetchNotifications();
      setNotifications(fetchedNotifications);
    } catch (err) {
      console.error("Erro ao buscar notificações:", err);
      setError("Falha ao carregar notificações.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getNotifications();
  }, []);

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length > 0) {
      try {
        await markNotificationsAsRead(unreadIds);
        // Atualiza o estado local para refletir as notificações lidas
        setNotifications(notifications.map((n) => ({ ...n, read: true })));
      } catch (err) {
        console.error("Erro ao marcar notificações como lidas:", err);
        // Opcional: mostrar uma mensagem de erro para o usuário
      }
    }
    setShowDropdown(false); // Fecha o dropdown após marcar como lidas
  };

  const unreadNotifications = notifications.filter((notification) => !notification.read);
  const notificationCount = unreadNotifications.length;

  return (
    <div className="relative">
      <Bell
        className="h-6 w-6 text-gray-700 dark:text-gray-300 cursor-pointer"
        onClick={() => setShowDropdown(!showDropdown)}
      />
      {notificationCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
          {notificationCount}
        </span>
      )}

      {showDropdown && ( // Dropdown para exibir as notificações
        <div className="absolute right-0 mt-2 w-72 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1">
            {isLoading ? (
              <p className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300">Carregando notificações...</p>
            ) : error ? (
              <p className="block px-4 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : (
              <>
                <div className="flex items-center justify-between px-4 py-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Notificações</p>
                  {unreadNotifications.length > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
                {unreadNotifications.length === 0 ? (
                  <p className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300">Nenhuma notificação nova.</p>
                ) : (
                  unreadNotifications.map((notification) => (
                    <a
                      key={notification.id}
                      href="#"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <p className="font-medium">{notification.message}</p>
                    </a>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
