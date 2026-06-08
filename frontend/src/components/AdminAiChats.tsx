'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { MessageCircle, User, Bot, Loader2, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface AiConversation {
  id: string
  client_email: string
  client_name: string | null
  original_subject: string
  state: string
  collected_data: {
    history: { role: string; text: string; timestamp: string }[]
    style?: string
    location?: string
    size?: string
    budget?: string
    images?: string[]
  }
  created_at: string
}

export function AdminAiChats() {
  const [session, setSession] = useState<any>(null)
  const [conversations, setConversations] = useState<AiConversation[]>([])
  const [selectedConv, setSelectedConv] = useState<AiConversation | null>(null)
  const [isLoadingChats, setIsLoadingChats] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  }, [])

  useEffect(() => {
    if (!session) return

    const fetchConversations = async () => {
      setIsLoadingChats(true)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/conversations`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setConversations(data)
        }
      } catch (err) {
        console.error('Failed to fetch AI conversations', err)
      } finally {
        setIsLoadingChats(false)
      }
    }

    fetchConversations()
  }, [session])

  useEffect(() => {
    if (selectedConv) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [selectedConv])

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm flex h-[600px] animate-fade-in-up">
      {/* Sidebar */}
      <div className="w-1/3 border-r border-neutral-200 dark:border-neutral-800 flex flex-col bg-neutral-50 dark:bg-neutral-900/50">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2 font-bold text-neutral-900 dark:text-white">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-500" />
            ИИ Парсер
          </div>
          <span className="text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 px-2 py-1 rounded-full">{conversations.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoadingChats ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center p-8 text-neutral-500 text-sm">
              Нет диалогов
            </div>
          ) : (
            conversations.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedConv(c)}
                className={`w-full text-left p-4 border-b border-neutral-100 dark:border-neutral-800/50 hover:bg-white dark:hover:bg-neutral-800 transition-colors ${selectedConv?.id === c.id ? 'bg-white dark:bg-neutral-800 border-l-4 border-l-purple-500' : ''}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="font-medium truncate text-neutral-700 dark:text-neutral-300">
                    {c.client_name || c.client_email}
                  </div>
                </div>
                <div className="text-xs text-neutral-500 truncate mb-1">{c.original_subject}</div>
                <div className="flex gap-2 text-[10px]">
                  <span className={`px-2 py-0.5 rounded-full ${c.state === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'}`}>
                    {c.state}
                  </span>
                  <span className="text-neutral-400">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="w-2/3 flex flex-col bg-neutral-50 dark:bg-neutral-950">
        {!selectedConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-400">
            <Bot className="w-16 h-16 mb-4 opacity-20" />
            <p>Выберите диалог слева</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shadow-sm z-10 bg-white dark:bg-neutral-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-neutral-500" />
                </div>
                <div>
                  <div className="font-bold text-neutral-900 dark:text-white leading-tight">
                    {selectedConv.client_email}
                  </div>
                  <div className="text-xs text-neutral-500 flex items-center gap-2 mt-0.5">
                    Статус: <span className={selectedConv.state === 'completed' ? 'text-green-500' : 'text-amber-500'}>{selectedConv.state}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Context Header */}
            <div className="bg-purple-50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/20 p-3 flex flex-wrap gap-4 text-xs">
              <div className="font-semibold text-purple-700 dark:text-purple-400 w-full mb-1">Собранные данные:</div>
              <div><span className="text-neutral-500">Стиль:</span> <span className="font-medium dark:text-white">{selectedConv.collected_data.style || '-'}</span></div>
              <div><span className="text-neutral-500">Место:</span> <span className="font-medium dark:text-white">{selectedConv.collected_data.location || '-'}</span></div>
              <div><span className="text-neutral-500">Размер:</span> <span className="font-medium dark:text-white">{selectedConv.collected_data.size || '-'}</span></div>
              <div><span className="text-neutral-500">Бюджет:</span> <span className="font-medium dark:text-white">{selectedConv.collected_data.budget || '-'}</span></div>
              {selectedConv.collected_data.images && selectedConv.collected_data.images.length > 0 && (
                <div><span className="text-neutral-500">Фото:</span> <span className="font-medium dark:text-white">{selectedConv.collected_data.images.length}</span></div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedConv.collected_data.history && selectedConv.collected_data.history.length > 0 ? (
                selectedConv.collected_data.history.map((msg, i) => {
                  const isBot = msg.role === 'model'
                  return (
                    <div key={i} className={`flex ${isBot ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex flex-col ${isBot ? 'items-end' : 'items-start'} max-w-[80%]`}>
                        <div 
                          className={`relative min-w-[70px] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                            isBot 
                              ? 'bg-purple-500 text-white rounded-br-sm' 
                              : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white rounded-bl-sm'
                          }`}
                        >
                          <div className="break-words mb-1 whitespace-pre-wrap">
                            {msg.text}
                          </div>
                          <div className={`text-[10px] leading-none flex items-center justify-end gap-0.5 whitespace-nowrap ${isBot ? 'text-purple-100' : 'text-neutral-400'}`}>
                            <span>{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                            {isBot && (
                              <span className="opacity-80 tracking-tighter text-[11px] ml-1">
                                <Bot className="w-3 h-3 inline" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center text-neutral-400 text-sm mt-4">Нет сообщений в истории</div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
