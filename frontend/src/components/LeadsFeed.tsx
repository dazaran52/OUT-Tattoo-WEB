'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { SkeletonCard } from '@/components/SkeletonCard'
import { RefreshCw, Search } from 'lucide-react'
import { getTranslation, Language } from '@/lib/i18n'

export interface Lead {
  id: string
  title: string
  description: string
  contacts: string
  price_credits: number
  is_unlocked: boolean
  created_at?: string
}

interface LeadsFeedProps {
  onUnlockSuccess: (newCredits: number) => void
}

export function LeadsFeed({ onUnlockSuccess }: LeadsFeedProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unlockingId, setUnlockingId] = useState<string | null>(null)
  const [filterText, setFilterText] = useState('')
  const [language, setLanguage] = useState<string>('cs')
  
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language as Language, key)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('language') || 'cs'
      setLanguage(savedLang)
    }
  }, [])

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch leads')
      }

      const data = await response.json()
      setLeads(data)
    } catch (err: any) {
      setError(err.message || 'Error fetching leads')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnlock = async (leadId: string) => {
    try {
      setUnlockingId(leadId)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/${leadId}/unlock`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to unlock lead')
      }

      // Update the specific lead in the list
      setLeads(currentLeads => 
        currentLeads.map(lead => 
          lead.id === leadId 
            ? { ...lead, contacts: data.contacts, is_unlocked: true } 
            : lead
        )
      )

      // Notify parent to update credits balance
      if (data.current_credits !== undefined) {
        onUnlockSuccess(data.current_credits)
      }

    } catch (err: any) {
      setError(err.message || 'Error unlocking lead')
    } finally {
      setUnlockingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (leads.length === 0) {
    return (
      <div className="text-center p-12 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
        <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full mx-auto mb-4 flex items-center justify-center">
          <Search className="w-8 h-8 text-neutral-500 dark:text-neutral-400" />
        </div>
        <p className="text-neutral-700 dark:text-neutral-300 text-lg mb-2">{t('noLeads')}</p>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm">{t('noLeadsDescription')}</p>
      </div>
    )
  }

  const filteredLeads = filterText 
    ? leads.filter(l => l.title.toLowerCase().includes(filterText.toLowerCase()) || 
                       l.description.toLowerCase().includes(filterText.toLowerCase()))
    : leads

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            <input
              type="text"
              placeholder={t('filterLeads')}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full sm:w-64 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-9 pr-4 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
            />
          </div>
        </div>
        <button
          onClick={fetchLeads}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:text-white hover:border-neutral-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg">
          {error}
          <button onClick={fetchLeads} className="ml-4 text-sm underline">{t('tryAgain')}</button>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLeads.map((lead) => (
          <div key={lead.id} className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{lead.title}</h3>
                <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs px-2 py-1 rounded font-mono">
                  {lead.price_credits} Kč
                </span>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-6">{lead.description}</p>
              
              <div className="bg-neutral-900 dark:bg-neutral-50 dark:bg-neutral-950 p-3 rounded border border-neutral-200 dark:border-neutral-800">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('contacts')}:</p>
                <p className={`font-mono text-sm ${lead.is_unlocked ? 'text-green-400' : 'text-neutral-600 blur-sm select-none'}`}>
                  {lead.contacts}
                </p>
              </div>
            </div>
            
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-900 dark:bg-neutral-50 dark:bg-neutral-950/50">
              {lead.is_unlocked ? (
                <button 
                  disabled
                  className="w-full py-2 px-4 bg-green-900/30 text-green-400 border border-green-900/50 rounded-lg text-sm font-medium"
                >
                  {t('unlocked')}
                </button>
              ) : (
                <button 
                  onClick={() => handleUnlock(lead.id)}
                  disabled={unlockingId === lead.id}
                  className="w-full py-2 px-4 bg-white text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {unlockingId === lead.id ? t('processing') : `${t('unlock')} - ${lead.price_credits} ${t('credit_plural')}`}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
