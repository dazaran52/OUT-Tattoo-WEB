'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Gem, CreditCard, Sparkles, AlertCircle } from 'lucide-react'

export default function TopUpPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Вернуться назад
        </button>

        <div className="relative animate-fade-in-up">
          {/* Animated background glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 rounded-3xl blur opacity-20 dark:opacity-40 animate-pulse"></div>
          
          <div className="relative bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-white/20 dark:border-neutral-800 rounded-3xl p-8 sm:p-12 shadow-2xl text-center overflow-hidden">
            
            {/* Top decorative elements */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>

            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/30 mb-6">
                <Gem className="w-10 h-10 text-white" />
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight mb-4 flex items-center justify-center gap-3">
                Пополнение баланса
                <Sparkles className="w-6 h-6 text-amber-500" />
              </h1>

              <p className="text-lg text-neutral-600 dark:text-neutral-300 mb-8 max-w-xl mx-auto">
                Автоматический шлюз оплаты картами находится в разработке и будет доступен в ближайшем обновлении платформы!
              </p>

              <div className="bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 mb-8 text-left">
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-cyan-500" />
                  Как получить кредиты сейчас?
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                  До запуска автоматической оплаты (Stripe / GoPay), вы можете пополнить баланс кредитов вручную. Свяжитесь с администрацией через Telegram.
                </p>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <div className="text-sm text-neutral-500 dark:text-neutral-500 font-medium">Telegram для связи</div>
                    <div className="font-bold text-neutral-900 dark:text-white text-lg">@out_tattoo_admin</div>
                  </div>
                  <a 
                    href="https://t.me/out_tattoo_admin" 
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-lg transition-colors text-center"
                  >
                    Написать
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-4 rounded-xl text-left">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  <span className="font-bold block mb-1">Реферальная программа</span>
                  Уже сейчас вы можете делиться своим реферальным кодом (найдите его в профиле) с другими топ-мастерами. В будущем за приглашенных участников мы начислим бонусы!
                </p>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
