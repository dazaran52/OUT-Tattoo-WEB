'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { LeadForm } from '@/components/LeadForm'
import { Logo } from '@/components/Logo'
import { ArrowRight, Paintbrush, Sparkles, X, UserCircle2 } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [activeSide, setActiveSide] = useState<'none' | 'client'>('none')
  const [hoveredSide, setHoveredSide] = useState<'none' | 'master' | 'client'>('none')
  const [showTooltip, setShowTooltip] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowTooltip(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="dark min-h-screen bg-[#050505] text-white flex flex-col md:flex-row relative overflow-hidden">
      
      {/* Tooltip Onboarding */}
      <AnimatePresence>
        {showTooltip && activeSide === 'none' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white text-black px-6 py-4 rounded-2xl font-bold shadow-2xl flex flex-col items-center gap-2 pointer-events-none"
          >
            <span>Кто вы? Выберите свою сторону, чтобы начать.</span>
            <div className="w-4 h-4 bg-white rotate-45 absolute -bottom-2" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Left Logo */}
      <div className="absolute top-6 left-6 z-50 pointer-events-auto">
        <Logo />
      </div>

      {/* Master Side (Left / Top) */}
      <motion.div 
        className="relative flex-1 cursor-pointer overflow-hidden border-b md:border-b-0 md:border-r border-white/10 flex flex-col items-center justify-center p-8 group"
        onHoverStart={() => setHoveredSide('master')}
        onHoverEnd={() => setHoveredSide('none')}
        onClick={() => router.push('/login')}
        animate={{
          flex: hoveredSide === 'master' ? 1.2 : hoveredSide === 'client' ? 0.8 : 1
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 30 }}
      >
        <div className="absolute inset-0 bg-[#0a0a0a] z-0" />
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] z-0 opacity-50" />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-2xl shadow-black">
            <Paintbrush className="w-10 h-10 text-neutral-400 group-hover:text-white transition-colors" />
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-neutral-300 group-hover:text-white transition-colors">Я тату-мастер</h2>
          <p className="text-neutral-500 max-w-sm group-hover:text-neutral-400 transition-colors">
            Получай горячие заявки от клиентов без затрат на рекламу.
          </p>
          <div className="mt-8 flex items-center gap-2 text-indigo-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0 duration-300">
            Войти в кабинет <ArrowRight className="w-5 h-5" />
          </div>
        </div>
      </motion.div>

      {/* Client Side (Right / Bottom) */}
      <motion.div 
        className="relative flex-1 cursor-pointer overflow-hidden flex flex-col items-center justify-center p-8 group"
        onHoverStart={() => setHoveredSide('client')}
        onHoverEnd={() => setHoveredSide('none')}
        onClick={() => setActiveSide('client')}
        animate={{
          flex: hoveredSide === 'client' ? 1.2 : hoveredSide === 'master' ? 0.8 : 1
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 30 }}
      >
        <div className="absolute inset-0 bg-neutral-950 z-0" />
        {/* Vibrant gradients */}
        <div className="absolute inset-0 opacity-40 group-hover:opacity-80 transition-opacity duration-700 pointer-events-none">
          <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-600/30 blur-[100px]" />
          <div className="absolute bottom-[20%] right-[20%] w-[50%] h-[50%] rounded-full bg-purple-600/30 blur-[100px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-indigo-950 border border-indigo-900 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-2xl shadow-indigo-900/50">
            <UserCircle2 className="w-10 h-10 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-white">Хочу татуировку!</h2>
          <p className="text-indigo-200/60 max-w-sm group-hover:text-indigo-200/90 transition-colors">
            Опиши идею один раз, и лучшие мастера города предложат свои эскизы.
          </p>
          <div className="mt-8 flex items-center gap-2 text-pink-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0 duration-300">
            Оставить заявку <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 z-10 text-center pointer-events-none">
        <p className="text-neutral-600/50 text-xs">© 2026 Tattoo HUB. All rights reserved.</p>
      </div>

      {/* Client Modal Overlay */}
      <AnimatePresence>
        {activeSide === 'client' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl my-auto"
            >
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSide('none');
                }}
                className="absolute -top-12 right-0 text-white/50 hover:text-white flex items-center gap-2 transition-colors"
              >
                Закрыть <X className="w-6 h-6" />
              </button>
              
              <div className="relative bg-[#0a0a0a] rounded-3xl border border-white/10 shadow-2xl overflow-hidden p-1">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 blur-[80px] -z-10 pointer-events-none" />
                <LeadForm />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
