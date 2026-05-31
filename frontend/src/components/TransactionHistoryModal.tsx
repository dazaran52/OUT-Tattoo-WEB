'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, ArrowDownToLine, Gem, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getTranslation, Language } from '@/lib/i18n'

interface Transaction {
  id: string
  amount: number
  currency: string
  credits_added: number
  provider: string
  status: string
  created_at: string
  type?: 'transaction' | 'request'
  admin_message?: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function TransactionHistoryModal({ isOpen, onClose }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [language, setLanguage] = useState<string>('cs')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('language') || 'cs'
      setLanguage(savedLang)
    }
  }, [])

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language as Language, key)

  useEffect(() => {
    if (!isOpen) return

    const fetchTransactions = async () => {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20)
        
      const { data: prData, error: prError } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      const combined: Transaction[] = []
      if (txData) {
        combined.push(...txData.map((t: any) => ({ ...t, type: 'transaction' })))
      }
      if (prData) {
        combined.push(...prData.map((p: any) => ({
          id: p.id,
          amount: p.amount_credits / 10,
          currency: p.currency,
          credits_added: p.amount_credits,
          provider: p.provider,
          status: p.status,
          created_at: p.created_at,
          type: 'request',
          admin_message: p.admin_message
        })))
      }
      
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setTransactions(combined)
      setIsLoading(false)
    }

    fetchTransactions()
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in-up">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[80vh]">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors bg-neutral-100 dark:bg-neutral-800 p-2 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-2xl flex items-center justify-center">
            <Gem className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
              История баланса
            </h3>
            <p className="text-sm text-neutral-500">Последние зачисления кредитов</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-neutral-100 dark:border-neutral-800">
              <Gem className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>У вас еще не было зачислений кредитов.</p>
            </div>
          ) : (
            transactions.map((tx) => (
              <div 
                key={tx.id} 
                className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center">
                    <ArrowDownToLine className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                      +{tx.credits_added} {t('credit_plural')}
                      <span className={`text-xs font-normal px-2 py-0.5 rounded-md ${tx.type === 'request' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'}`}>
                        {tx.provider === 'donatello' ? 'Donatello' : tx.provider === 'cryptobot' ? 'Crypto' : tx.provider === 'revolut' ? 'Revolut' : 'Админ'}
                        {tx.type === 'request' ? ' (Заявка)' : ''}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-500 flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(tx.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-neutral-900 dark:text-white font-medium">
                    {tx.amount} {tx.currency.toUpperCase()}
                  </div>
                  <div className={`text-xs mt-1 ${
                    tx.status === 'completed' || tx.status === 'approved' ? 'text-green-600 dark:text-green-400' : 
                    (tx.status === 'pending' || tx.status === 'screenshot_uploaded') ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {tx.status === 'completed' || tx.status === 'approved' ? 'Зачислено' : 
                     tx.status === 'screenshot_uploaded' ? 'На проверке' : 
                     tx.status === 'pending' ? 'Ожидает оплаты' : 
                     tx.status === 'cancelled' ? 'Отменено' : 'Отклонено'}
                  </div>
                  {tx.admin_message && (
                    <div className="text-[10px] text-red-500 mt-0.5">{tx.admin_message}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
