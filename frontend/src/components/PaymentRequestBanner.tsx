import { useState } from 'react'
import { AlertCircle, Upload, X, CheckCircle, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface PaymentRequest {
  id: string
  amount_credits: number
  status: string
  admin_message?: string
}

export function PaymentRequestBanner({ req, onUpdate, session }: { req: PaymentRequest, onUpdate: () => void, session: any }) {
  const [isUploading, setIsUploading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  
  if (req.status === 'approved') {
    return (
      <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-xl flex items-start justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          <div>
            <h4 className="font-bold text-green-900 dark:text-green-400">Ваш платеж одобрен!</h4>
            <p className="text-sm text-green-800 dark:text-green-300">Баланс успешно пополнен на {req.amount_credits} кредитов.</p>
          </div>
        </div>
        <button onClick={onUpdate} className="text-green-600 hover:bg-green-100 p-1 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  if (req.status === 'rejected') {
    return (
      <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-start justify-between">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <h4 className="font-bold text-red-900 dark:text-red-400">Платеж отклонен администратором</h4>
            <p className="text-sm text-red-800 dark:text-red-300">Причина: {req.admin_message || 'Не указана'}</p>
          </div>
        </div>
        <button onClick={onUpdate} className="text-red-600 hover:bg-red-100 p-1 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  if (req.status === 'screenshot_uploaded') {
    return (
      <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse" />
          <div>
            <h4 className="font-bold text-blue-900 dark:text-blue-400">Платеж на проверке</h4>
            <p className="text-sm text-blue-800 dark:text-blue-300">Вы успешно загрузили скриншот. Администратор проверит его в ближайшее время.</p>
          </div>
        </div>
      </div>
    )
  }

  // pending status
  return (
    <>
      <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <div>
            <h4 className="font-bold text-amber-900 dark:text-amber-400">Незавершенный платеж Revolut</h4>
            <p className="text-sm text-amber-800 dark:text-amber-300">Ожидается оплата на {req.amount_credits} кредитов.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={async () => {
              if (confirm('Точно отменить заявку?')) {
                await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/payments/requests/${req.id}/cancel`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${session.access_token}` }
                })
                onUpdate()
              }
            }}
            className="px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
          >
            Отменить
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="px-3 py-1.5 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors shadow-sm"
          >
            Я оплатил (Прикрепить чек)
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-sm w-full p-6 shadow-xl text-center">
            <h3 className="text-xl font-bold mb-4">Прикрепить чек Revolut</h3>
            <p className="text-sm text-neutral-500 mb-6">Загрузите скриншот перевода, чтобы мы могли зачислить вам кредиты.</p>
            
            <div className="mb-6">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                  <p className="text-sm text-neutral-500"><span className="font-semibold">Нажмите для загрузки</span></p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    
                    try {
                      setIsUploading(true)
                      const fileExt = file.name.split('.').pop()
                      const fileName = `${Math.random()}.${fileExt}`
                      const filePath = `${session.user.id}/${fileName}`
                      
                      const { error: uploadError } = await supabase.storage
                        .from('payment_receipts')
                        .upload(filePath, file)
                        
                      if (uploadError) throw uploadError
                      
                      const { data } = supabase.storage.from('payment_receipts').getPublicUrl(filePath)
                      
                      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/payments/requests/${req.id}/screenshot`, {
                        method: 'POST',
                        headers: { 
                          'Authorization': `Bearer ${session.access_token}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ screenshot_url: data.publicUrl })
                      })
                      
                      if (!res.ok) throw new Error('Ошибка сервера')
                      
                      toast.success('Чек загружен! Ожидайте проверки.')
                      setShowModal(false)
                      onUpdate()
                    } catch (err: any) {
                      toast.error(err.message || 'Ошибка загрузки файла')
                    } finally {
                      setIsUploading(false)
                    }
                  }}
                  disabled={isUploading}
                />
              </label>
            </div>
            
            <button
              onClick={() => setShowModal(false)}
              disabled={isUploading}
              className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-xl font-medium"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </>
  )
}
