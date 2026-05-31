import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Check, X, Loader2, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

interface PaymentRequest {
  id: string
  user_id: string
  amount_credits: number
  currency: string
  provider: string
  status: string
  screenshot_url: string | null
  admin_message: string | null
  created_at: string
  users?: { email: string }
}

export function AdminPayments() {
  const [requests, setRequests] = useState<PaymentRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  
  useEffect(() => {
    fetchRequests()
  }, [])
  
  const fetchRequests = async () => {
    try {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/payment_requests`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch requests')
      
      const data = await res.json()
      setRequests(data)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleApprove = async (id: string) => {
    if (!confirm('Одобрить платеж и начислить кредиты?')) return
    
    try {
      setActionId(id)
      const { data: { session } } = await supabase.auth.getSession()
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/payment_requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      if (!res.ok) throw new Error('Failed to approve')
      
      toast.success('Платеж одобрен')
      fetchRequests()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setActionId(null)
    }
  }
  
  const handleReject = async (id: string) => {
    const reason = prompt('Причина отклонения:')
    if (reason === null) return
    
    try {
      setActionId(id)
      const { data: { session } } = await supabase.auth.getSession()
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/payment_requests/${id}/reject`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: reason })
      })
      if (!res.ok) throw new Error('Failed to reject')
      
      toast.success('Платеж отклонен')
      fetchRequests()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setActionId(null)
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center text-neutral-500">Загрузка заявок...</div>
  }

  return (
    <div className="space-y-4">
      {requests.length === 0 ? (
        <div className="p-8 text-center text-neutral-500 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
          Нет активных заявок.
        </div>
      ) : (
        requests.map(req => (
          <div key={req.id} className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-neutral-500">
                  {new Date(req.created_at).toLocaleString()}
                </span>
                <span className={`px-2 py-1 text-xs font-bold rounded-md ${
                  req.status === 'screenshot_uploaded' ? 'bg-amber-100 text-amber-800' :
                  req.status === 'approved' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {req.status}
                </span>
              </div>
              <p className="font-bold text-lg">{req.users?.email || req.user_id}</p>
              <p className="text-neutral-600 dark:text-neutral-400">Сумма: {req.amount_credits} кредитов ({req.currency}) via {req.provider}</p>
              
              {req.admin_message && (
                <p className="mt-2 text-sm text-red-600">Причина: {req.admin_message}</p>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {req.screenshot_url && (
                <a 
                  href={req.screenshot_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-24 h-24 rounded-lg bg-neutral-100 border border-neutral-200 overflow-hidden relative group"
                >
                  <img src={req.screenshot_url} alt="Receipt" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <ExternalLink className="text-white w-6 h-6" />
                  </div>
                </a>
              )}
              
              {req.status === 'screenshot_uploaded' && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleApprove(req.id)}
                    disabled={actionId === req.id}
                    className="flex items-center justify-center gap-1 w-32 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                  >
                    {actionId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Одобрить
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    disabled={actionId === req.id}
                    className="flex items-center justify-center gap-1 w-32 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium"
                  >
                    <X className="w-4 h-4" />
                    Отклонить
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
