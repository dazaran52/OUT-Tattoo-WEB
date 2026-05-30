'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Gem, Sparkles, AlertCircle, CreditCard, Wallet, HeartHandshake, ExternalLink } from 'lucide-react'

export default function TopUpPage() {
  const router = useRouter()

  const topUpMethods = [
    {
      id: 'revolut',
      name: 'Revolut Pro',
      description: 'Мгновенный перевод без комиссий для пользователей Revolut или с любой европейской карты.',
      icon: <CreditCard className="w-8 h-8 text-black dark:text-white" />,
      color: 'from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-900/10',
      border: 'border-blue-200 dark:border-blue-800',
      actionText: 'Оплатить через Revolut',
      link: 'https://revolut.me/YOUR_TAG' // TODO: Replace with actual Revolut link
    },
    {
      id: 'crypto',
      name: 'CryptoBot (Telegram)',
      description: 'Оплата в USDT, TON, BTC или другой криптовалюте прямо через Telegram бота.',
      icon: <Wallet className="w-8 h-8 text-blue-500" />,
      color: 'from-sky-100 to-sky-50 dark:from-sky-900/40 dark:to-sky-900/10',
      border: 'border-sky-200 dark:border-sky-800',
      actionText: 'Оплатить криптой',
      link: 'https://t.me/CryptoBot?start=YOUR_INVOICE' // TODO: Replace with actual CryptoBot link
    },
    {
      id: 'donatello',
      name: 'Donatello',
      description: 'Удобная оплата с украинских или международных карт (Visa/Mastercard) через донат-платформу.',
      icon: <HeartHandshake className="w-8 h-8 text-rose-500" />,
      color: 'from-rose-100 to-rose-50 dark:from-rose-900/40 dark:to-rose-900/10',
      border: 'border-rose-200 dark:border-rose-800',
      actionText: 'Поддержать на Donatello',
      link: 'https://donatello.to/YOUR_PAGE' // TODO: Replace with actual Donatello link
    }
  ]

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Вернуться назад
        </button>

        <div className="relative animate-fade-in-up">
          {/* Animated background glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 rounded-3xl blur opacity-20 dark:opacity-30 animate-pulse"></div>
          
          <div className="relative bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-white/20 dark:border-neutral-800 rounded-3xl p-6 sm:p-12 shadow-2xl overflow-hidden">
            
            {/* Top decorative elements */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>

            <div className="relative z-10 text-center mb-10">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/30 mb-6">
                <Gem className="w-10 h-10 text-white" />
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight mb-4 flex items-center justify-center gap-3">
                Пополнение баланса
                <Sparkles className="w-6 h-6 text-amber-500" />
              </h1>

              <p className="text-lg text-neutral-600 dark:text-neutral-300 max-w-xl mx-auto">
                Выберите удобный способ оплаты. После перевода отправьте скриншот администратору для зачисления кредитов.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {topUpMethods.map((method) => (
                <div 
                  key={method.id} 
                  className={`bg-gradient-to-br ${method.color} border ${method.border} rounded-2xl p-6 flex flex-col items-center text-center transition-transform hover:-translate-y-1 duration-300`}
                >
                  <div className="mb-4 bg-white/50 dark:bg-neutral-900/50 p-4 rounded-2xl shadow-sm backdrop-blur-sm">
                    {method.icon}
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">{method.name}</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6 flex-grow">
                    {method.description}
                  </p>
                  <a 
                    href={method.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    {method.actionText}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 text-left">
              <div>
                <h4 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-1">
                  <AlertCircle className="w-5 h-5 text-cyan-500" />
                  Что делать после оплаты?
                </h4>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Обязательно напишите в поддержку в Telegram и прикрепите скриншот транзакции и email вашего аккаунта.
                </p>
              </div>
              <a 
                href="https://t.me/out_tattoo_admin" 
                target="_blank"
                rel="noreferrer"
                className="whitespace-nowrap px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-xl shadow-lg shadow-cyan-500/20 transition-all hover:scale-105"
              >
                Написать в Telegram
              </a>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
