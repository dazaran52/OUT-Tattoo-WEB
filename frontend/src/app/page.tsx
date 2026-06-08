'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { LeadForm } from '@/components/LeadForm'
import { ArrowRight, Sparkles, ShieldCheck, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30 relative overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute top-[40%] -right-[20%] w-[60%] h-[60%] rounded-full bg-purple-600/10 blur-[150px]" />
        <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-blue-600/15 blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-lg">
            O
          </div>
          <span className="font-bold text-xl tracking-tight">Tattoo HUB</span>
        </div>
        <Link 
          href="/login" 
          className="text-sm font-medium text-neutral-300 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10"
        >
          Вход для мастеров
        </Link>
      </nav>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="pt-20 pb-32 px-6 max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              <span>Более 500 мастеров уже с нами</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
              Найди <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">идеального мастера</span> для своей татуировки.
            </h1>
            <p className="text-lg md:text-xl text-neutral-400 mb-10 max-w-xl leading-relaxed">
              Не нужно писать десяткам студий. Просто опиши свою идею один раз, и лучшие мастера твоего города сами предложат тебе свои услуги, эскизы и цены.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => document.getElementById('lead-form')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-white text-black px-8 py-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 hover:scale-105 transition-transform"
              >
                Оставить заявку
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>

          {/* Form Widget */}
          <motion.div
            id="lead-form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="relative"
          >
            {/* Glow behind form */}
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/30 to-purple-500/30 blur-[80px] -z-10 rounded-[3rem]" />
            <LeadForm />
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="py-24 border-t border-white/5 bg-black/50 backdrop-blur-3xl">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Как это работает?</h2>
              <p className="text-neutral-400 max-w-2xl mx-auto">Всего 3 простых шага, чтобы воплотить мечту в реальность.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6">
                  <Zap className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">1. Опиши идею</h3>
                <p className="text-neutral-400">Заполни короткую форму. Расскажи, что хочешь набить, прикрепи примеры и укажи город.</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors"
              >
                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-6">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">2. Получай отклики</h3>
                <p className="text-neutral-400">Проверенные мастера твоего города увидят заявку и свяжутся с тобой, если готовы взяться за работу.</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors"
              >
                <div className="w-14 h-14 rounded-2xl bg-green-500/20 text-green-400 flex items-center justify-center mb-6">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">3. Выбирай лучшего</h3>
                <p className="text-neutral-400">Сравнивай портфолио, цены и выбирай мастера, который идеально понимает твою идею.</p>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-white/10 py-12 text-center text-neutral-500 text-sm relative z-10">
        <p>© 2026 OUT Tattoo Hub. All rights reserved.</p>
      </footer>
    </div>
  )
}
