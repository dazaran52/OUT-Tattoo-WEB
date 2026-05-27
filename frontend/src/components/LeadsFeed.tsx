'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface Lead {
  id: string
  title: string
  description: string
  contacts: string
  price_credits: int
  is_unlocked: boolean
  created_at?: str
}

interface LeadsFeedProps {
  onUnlockSuccess: (newCredits: number) => void
}

export function LeadsFeed({ onUnlockSuccess }: LeadsFeedProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unlockingId, setUnlockingId] = useState<string | null>(null)

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
    return <div className="text-neutral-400">Načítání leadů... / Loading leads...</div>
  }

  if (leads.length === 0) {
    return (
      <div className="text-center p-8 bg-neutral-900 rounded-xl border border-neutral-800">
        <p className="text-neutral-400">Zatím nejsou k dispozici žádné poptávky.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {leads.map((lead) => (
          <div key={lead.id} className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-white">{lead.title}</h3>
                <span className="bg-neutral-800 text-neutral-300 text-xs px-2 py-1 rounded font-mono">
                  {lead.price_credits} Kč
                </span>
              </div>
              <p className="text-neutral-400 text-sm mb-6">{lead.description}</p>
              
              <div className="bg-neutral-950 p-3 rounded border border-neutral-800">
                <p className="text-xs text-neutral-500 mb-1">Kontakty:</p>
                <p className={`font-mono text-sm ${lead.is_unlocked ? 'text-green-400' : 'text-neutral-600 blur-sm select-none'}`}>
                  {lead.contacts}
                </p>
              </div>
            </div>
            
            <div className="p-4 border-t border-neutral-800 bg-neutral-950/50">
              {lead.is_unlocked ? (
                <button 
                  disabled
                  className="w-full py-2 px-4 bg-green-900/30 text-green-400 border border-green-900/50 rounded-lg text-sm font-medium"
                >
                  Odemčeno
                </button>
              ) : (
                <button 
                  onClick={() => handleUnlock(lead.id)}
                  disabled={unlockingId === lead.id}
                  className="w-full py-2 px-4 bg-white text-black hover:bg-neutral-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {unlockingId === lead.id ? 'Zpracování...' : `Odemknout za ${lead.price_credits} kreditů`}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
