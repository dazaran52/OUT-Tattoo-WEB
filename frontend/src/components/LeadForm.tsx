'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, ChevronRight, ChevronLeft, Check, AlertCircle } from 'lucide-react'

export function LeadForm() {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    description: '',
    style: '',
    location: '',
    size: '',
    budget: '',
    city: '',
    name: '',
    contact: '', // email or phone
    images: [] as File[]
  })

  const nextStep = () => setStep(s => Math.min(s + 1, 4))
  const prevStep = () => setStep(s => Math.max(s - 1, 1))

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData({ ...formData, images: [...formData.images, ...Array.from(e.target.files)] })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const payload = {
        description: formData.description,
        style: formData.style || null,
        location: formData.location || null,
        size: formData.size || null,
        budget: formData.budget || null,
        city: formData.city || null,
        name: formData.name || null,
        contact: formData.contact,
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/client`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        throw new Error('Ошибка при отправке заявки')
      }
      
      setIsSuccess(true)
    } catch (error) {
      console.error(error)
      alert('Произошла ошибка при отправке. Пожалуйста, попробуйте еще раз.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl p-8 md:p-12 text-center shadow-2xl"
      >
        <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10" />
        </div>
        <h3 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4">Заявка отправлена!</h3>
        <p className="text-neutral-600 dark:text-neutral-300 text-lg max-w-md mx-auto mb-8">
          Лучшие мастера твоего города скоро увидят твою идею и свяжутся с тобой, чтобы обсудить детали и предложить свои эскизы.
        </p>
        <button 
          onClick={() => { setStep(1); setIsSuccess(false); setFormData({description: '', style: '', location: '', size: '', budget: '', city: '', name: '', contact: '', images: []}) }}
          className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-8 py-4 rounded-xl font-bold transition-transform hover:scale-105"
        >
          Новая заявка
        </button>
      </motion.div>
    )
  }

  return (
    <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden relative">
      
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-neutral-200 dark:bg-neutral-800">
        <motion.div 
          className="h-full bg-indigo-500"
          initial={{ width: '25%' }}
          animate={{ width: `${(step / 4) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="p-8 md:p-12">
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {step === 1 && "Опиши свою идею"}
            {step === 2 && "Детали татуировки"}
            {step === 3 && "Бюджет и референсы"}
            {step === 4 && "Твои контакты"}
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400 mt-2">Шаг {step} из 4</p>
        </div>

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Что будем бить?</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Например: Хочу черно-белого дракона, обвивающего меч..."
                    className="w-full bg-white/50 dark:bg-black/20 border border-neutral-300 dark:border-neutral-700 rounded-xl p-4 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Стиль (опционально)</label>
                  <select 
                    value={formData.style}
                    onChange={e => setFormData({...formData, style: e.target.value})}
                    className="w-full bg-white/50 dark:bg-black/20 border border-neutral-300 dark:border-neutral-700 rounded-xl p-4 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                  >
                    <option value="">Не знаю / Жду предложений</option>
                    <option value="realism">Реализм</option>
                    <option value="traditional">Олдскул (Traditional)</option>
                    <option value="minimalism">Минимализм / Лайнворк</option>
                    <option value="japanese">Япония (Irezumi)</option>
                    <option value="blackwork">Блэкворк</option>
                  </select>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Место нанесения</label>
                  <input 
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                    placeholder="Например: Предплечье, спина, бедро..."
                    className="w-full bg-white/50 dark:bg-black/20 border border-neutral-300 dark:border-neutral-700 rounded-xl p-4 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Примерный размер</label>
                  <input 
                    type="text"
                    value={formData.size}
                    onChange={e => setFormData({...formData, size: e.target.value})}
                    placeholder="Например: 15х10 см, или просто 'большая'"
                    className="w-full bg-white/50 dark:bg-black/20 border border-neutral-300 dark:border-neutral-700 rounded-xl p-4 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Ваш бюджет (опционально)</label>
                  <input 
                    type="text"
                    value={formData.budget}
                    onChange={e => setFormData({...formData, budget: e.target.value})}
                    placeholder="Например: До 5000 Kč"
                    className="w-full bg-white/50 dark:bg-black/20 border border-neutral-300 dark:border-neutral-700 rounded-xl p-4 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Примеры и референсы</label>
                  <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-8 text-center bg-white/20 dark:bg-black/10 hover:bg-white/30 dark:hover:bg-black/20 transition-colors relative cursor-pointer">
                    <input 
                      type="file" 
                      multiple 
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept="image/*"
                    />
                    <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-3" />
                    <p className="text-neutral-600 dark:text-neutral-400">Нажмите или перетащите фото сюда</p>
                    {formData.images.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2 justify-center">
                        {formData.images.map((img, i) => (
                          <span key={i} className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-1 rounded-md">
                            {img.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Ваш Город</label>
                  <input 
                    type="text"
                    value={formData.city}
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    placeholder="Например: Прага"
                    className="w-full bg-white/50 dark:bg-black/20 border border-neutral-300 dark:border-neutral-700 rounded-xl p-4 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Как к вам обращаться?</label>
                    <input 
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="Имя"
                      className="w-full bg-white/50 dark:bg-black/20 border border-neutral-300 dark:border-neutral-700 rounded-xl p-4 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Email или Телефон</label>
                    <input 
                      type="text"
                      value={formData.contact}
                      onChange={e => setFormData({...formData, contact: e.target.value})}
                      placeholder="+420... или email@..."
                      className="w-full bg-white/50 dark:bg-black/20 border border-neutral-300 dark:border-neutral-700 rounded-xl p-4 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>
                <div className="flex items-start gap-3 mt-4 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Твои контакты будут скрыты и станут доступны только доверенным мастерам, которые захотят взять твою идею в работу.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-10">
            {step > 1 ? (
              <button 
                type="button" 
                onClick={prevStep}
                className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                Назад
              </button>
            ) : (
              <div></div>
            )}
            
            {step < 4 ? (
              <button 
                type="button" 
                onClick={nextStep}
                className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-transform hover:scale-105 shadow-lg shadow-neutral-900/20 dark:shadow-white/10"
              >
                Далее
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-transform hover:scale-105 shadow-lg shadow-indigo-500/30 disabled:opacity-70 disabled:hover:scale-100"
              >
                {isSubmitting ? 'Отправляем...' : 'Оставить заявку'}
                {!isSubmitting && <Check className="w-5 h-5" />}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
