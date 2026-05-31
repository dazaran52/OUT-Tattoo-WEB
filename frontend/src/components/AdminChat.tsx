'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, SupportMessage } from '@/lib/supabase'
import { MessageCircle, Send, Loader2, User } from 'lucide-react'

export function AdminChat() {
  const [session, setSession] = useState<any>(null)
  const [usersWithChats, setUsersWithChats] = useState<{ id: string, email: string, last_msg: string }[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoadingChats, setIsLoadingChats] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  }, [])

  useEffect(() => {
    if (!session) return

    // Fetch list of users who have support messages
    const fetchChatUsers = async () => {
      setIsLoadingChats(true)
      
      // Get unique users who sent or received messages
      // We can query support_messages and group by user_id, but supabase js doesn't support GROUP BY directly easily.
      // So we query all messages ordered by time descending, and extract unique users.
      // Or we just query users, then query messages. 
      // Let's do a simple join or two queries.
      
      const { data: messagesData, error: msgError } = await supabase
        .from('support_messages')
        .select('user_id, created_at, message, users!user_id(email)')
        .order('created_at', { ascending: false })

      if (!msgError && messagesData) {
        const uniqueUsers = new Map()
        for (const msg of messagesData) {
          if (!uniqueUsers.has(msg.user_id)) {
            uniqueUsers.set(msg.user_id, {
              id: msg.user_id,
              email: (msg as any).users?.email || 'Unknown',
              last_msg: new Date(msg.created_at).toLocaleString()
            })
          }
        }
        setUsersWithChats(Array.from(uniqueUsers.values()))
      }
      setIsLoadingChats(false)
    }

    fetchChatUsers()

    const channel = supabase
      .channel('public:support_messages_admin')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages' },
        (payload) => {
          const newMsg = payload.new as SupportMessage
          // If viewing this chat, append it
          setMessages(prev => {
            // Check if we are viewing the chat for this user_id
            if (prev.length > 0 && prev[0].user_id === newMsg.user_id) {
               return [...prev, newMsg]
            }
            return prev
          })
          scrollToBottom()
          // Refresh chat list to update last message time
          fetchChatUsers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session])

  useEffect(() => {
    if (!selectedUserId) return

    const fetchMessages = async () => {
      setIsLoadingMessages(true)
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', selectedUserId)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setMessages(data as SupportMessage[])
        scrollToBottom()
      }
      setIsLoadingMessages(false)
    }

    fetchMessages()
  }, [selectedUserId])

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !session || !selectedUserId) return

    setIsSending(true)
    const { error } = await supabase
      .from('support_messages')
      .insert({
        user_id: selectedUserId,
        sender_id: session.user.id,
        message: newMessage.trim(),
      })

    if (!error) {
      setNewMessage('')
    }
    setIsSending(false)
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm flex h-[600px] animate-fade-in-up">
      {/* Sidebar: Users List */}
      <div className="w-1/3 border-r border-neutral-200 dark:border-neutral-800 flex flex-col bg-neutral-50 dark:bg-neutral-900/50">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
          <MessageCircle className="w-5 h-5 text-cyan-500" />
          Активные чаты
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoadingChats ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
            </div>
          ) : usersWithChats.length === 0 ? (
            <div className="text-center p-8 text-neutral-500 text-sm">
              Нет активных чатов
            </div>
          ) : (
            usersWithChats.map(u => (
              <button
                key={u.id}
                onClick={() => setSelectedUserId(u.id)}
                className={`w-full text-left p-4 border-b border-neutral-100 dark:border-neutral-800/50 hover:bg-white dark:hover:bg-neutral-800 transition-colors ${selectedUserId === u.id ? 'bg-white dark:bg-neutral-800 border-l-4 border-l-cyan-500' : ''}`}
              >
                <div className="font-medium text-neutral-900 dark:text-white truncate">{u.email}</div>
                <div className="text-xs text-neutral-500 mt-1">{u.last_msg}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="w-2/3 flex flex-col bg-white dark:bg-neutral-950">
        {!selectedUserId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-400">
            <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
            <p>Выберите чат слева</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 font-medium text-neutral-900 dark:text-white flex items-center gap-2 shadow-sm z-10">
              <User className="w-5 h-5 text-neutral-400" />
              {usersWithChats.find(u => u.id === selectedUserId)?.email}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoadingMessages ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                </div>
              ) : (
                messages.map(msg => {
                  const isAdmin = msg.sender_id === session?.user?.id
                  return (
                    <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div 
                        className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                          isAdmin 
                            ? 'bg-cyan-500 text-white rounded-br-sm' 
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-bl-sm'
                        }`}
                      >
                        {msg.message}
                        <div className={`text-[10px] mt-1 text-right ${isAdmin ? 'text-cyan-100' : 'text-neutral-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Введите сообщение пользователю..."
                className="flex-1 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-4 py-2 text-sm text-neutral-900 dark:text-white outline-none transition-all"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center"
              >
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
