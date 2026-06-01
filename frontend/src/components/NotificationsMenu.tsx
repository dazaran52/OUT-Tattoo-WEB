import { useState, useEffect, useRef } from 'react'
import { Bell, Check, Info, DollarSign, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

export function NotificationsMenu() {
  const [session, setSession] = useState<any>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
  }, [])

  useEffect(() => {
    if (!session?.user?.id) return

    fetchNotifications()

    // Setup realtime subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session?.user?.id}`
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev])
          setUnreadCount(prev => prev + 1)
        }
      )
      .subscribe()

    // Click outside to close
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [session?.user?.id])

  const fetchNotifications = async () => {
    if (!session?.access_token) return
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
        setUnreadCount(data.filter((n: Notification) => !n.is_read).length)
      }
    } catch (e) {
      console.error('Failed to fetch notifications', e)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (e) {
      console.error(e)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (e) {
      console.error(e)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'payment': return <DollarSign className="w-5 h-5 text-green-500" />
      case 'system': return <Settings className="w-5 h-5 text-blue-500" />
      default: return <Info className="w-5 h-5 text-neutral-500" />
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 relative rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-neutral-900"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <h3 className="font-bold text-neutral-900 dark:text-white">Уведомления</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 transition-colors flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Прочитать все
              </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-sm">
                Нет уведомлений
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  onClick={() => !n.is_read && markAsRead(n.id)}
                  className={`p-4 border-b border-neutral-100 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors flex gap-3 cursor-pointer ${!n.is_read ? 'bg-cyan-50/50 dark:bg-cyan-900/10' : ''}`}
                >
                  <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!n.is_read ? 'bg-white dark:bg-neutral-800 shadow-sm' : 'bg-neutral-100 dark:bg-neutral-800/50'}`}>
                    {getIcon(n.type)}
                  </div>
                  <div>
                    <h4 className={`text-sm ${!n.is_read ? 'font-bold text-neutral-900 dark:text-white' : 'font-medium text-neutral-700 dark:text-neutral-300'}`}>
                      {n.title}
                    </h4>
                    <p className={`text-sm mt-0.5 ${!n.is_read ? 'text-neutral-700 dark:text-neutral-300' : 'text-neutral-500 dark:text-neutral-400'}`}>
                      {n.message}
                    </p>
                    <span className="text-xs text-neutral-400 mt-2 block">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full bg-cyan-500 mt-1.5 ml-auto shrink-0"></div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
