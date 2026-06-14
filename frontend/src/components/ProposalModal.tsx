import { useState } from 'react'
import { X, Send, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { Lead } from './LeadsFeed'

interface ProposalModalProps {
  isOpen: boolean
  onClose: () => void
  lead: Lead | null
  onSuccess: (contacts: string, currentCredits: number) => void
  onUnlockSuccess: (newCredits: number) => void
  language: string
}

export function ProposalModal({ isOpen, onClose, lead, onSuccess, onUnlockSuccess, language }: ProposalModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    price_offer: '',
    proposed_dates: ''
  })

  if (!isOpen || !lead) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.price_offer || !formData.proposed_dates) {
      toast.error('Пожалуйста, заполните все поля')
      return
    }

    setLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const token = localStorage.getItem('token')

      // Step 1: Unlock the lead
      const unlockRes = await fetch(`${apiUrl}/api/leads/${lead.id}/unlock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const unlockData = await unlockRes.json()
      
      if (!unlockRes.ok) {
        throw new Error(unlockData.detail || 'Failed to unlock lead')
      }

      // Play success sounds (handled by parent or here, parent is better but we can just use the prop)
      if (unlockData.current_credits !== undefined) {
        onUnlockSuccess(unlockData.current_credits)
      }

      // Step 2: Submit Proposal
      const proposalRes = await fetch(`${apiUrl}/api/leads/${lead.id}/proposals`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          price_offer: parseInt(formData.price_offer),
          proposed_dates: formData.proposed_dates
        })
      })

      if (!proposalRes.ok) {
        // Even if proposal fails, the lead was unlocked, so we still succeed the unlock flow
        console.error('Failed to submit proposal', await proposalRes.text())
        toast.error('Лид открыт, но оффер не отправлен.')
      } else {
        toast.success('Оффер отправлен! Контакты открыты.')
      }

      onSuccess(unlockData.contacts, unlockData.current_credits)
    } catch (err: any) {
      if (err.message === 'INSUFFICIENT_CREDITS') {
        onClose()
        // Parent will handle LowBalanceModal via throwing or custom event, 
        // to simplify, we just throw it up:
        throw err
      }
      toast.error(err.message || 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-neutral-200 dark:border-white/10"
        >
          <div className="flex justify-between items-center p-4 lg:p-6 border-b border-neutral-100 dark:border-white/5">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Сделать предложение</h2>
            <button onClick={onClose} className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-full transition-colors bg-neutral-100 dark:bg-neutral-800">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-4 lg:p-6 space-y-5">
            <div className="bg-violet-500/10 text-violet-600 dark:text-violet-400 p-4 rounded-2xl text-sm flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>Отправьте ваш оффер клиенту. После этого вы мгновенно получите его контакты.</p>
            </div>

            {lead.client_priority === 'cheap' && lead.lowest_bid && (
              <div className="bg-green-500/10 text-green-600 dark:text-green-400 p-4 rounded-2xl text-sm flex justify-between items-center font-bold">
                <span>🔥 Текущая лучшая цена:</span>
                <span className="text-lg">{lead.lowest_bid} CZK</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Ваша примерная цена (CZK)</label>
              <input
                type="number"
                required
                className="w-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-transparent focus:border-violet-500 rounded-2xl px-5 py-3 outline-none transition-all"
                placeholder="Например: 3500"
                value={formData.price_offer}
                onChange={(e) => setFormData({...formData, price_offer: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Свободные даты</label>
              <textarea
                required
                className="w-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-transparent focus:border-violet-500 rounded-2xl px-5 py-3 outline-none transition-all resize-none"
                placeholder="Например: Могу принять на этой неделе в четверг или пятницу..."
                rows={3}
                value={formData.proposed_dates}
                onChange={(e) => setFormData({...formData, proposed_dates: e.target.value})}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-500 hover:bg-violet-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Отправить и открыть контакты</span>
                  <Send className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
