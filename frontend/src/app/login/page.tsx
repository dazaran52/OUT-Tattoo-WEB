'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Loader2, ArrowRight, Link as LinkIcon, Tag, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [error, setError] = useState('')

  const [countries, setCountries] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedCity, setSelectedCity] = useState('')

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locations/countries`)
      .then(res => res.json())
      .then(data => setCountries(data))
      .catch(err => console.error(err))
  }, [])

  useEffect(() => {
    if (selectedCountry) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locations/countries/${selectedCountry}/cities`)
        .then(res => res.json())
        .then(data => {
            setCities(data)
            if (data.length > 0) setSelectedCity(data[0].id)
        })
        .catch(err => console.error(err))
    } else {
      setCities([])
      setSelectedCity('')
    }
  }, [selectedCountry])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    


    try {
      if (isSignUp) {
        // Sign up

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              portfolio_url: portfolioUrl,
              referred_by: referralCode,
              country_ids: selectedCountry ? [selectedCountry] : [],
              city_ids: selectedCity ? [selectedCity] : [],
            }
          }
        })


        if (signUpError) throw signUpError

        if (data.user) {
          window.location.href = '/dashboard'
        }
      } else {
        // Sign in

        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })


        if (signInError) throw signInError

        if (data.session) {

          // Manually set cookie for middleware detection
          const token = data.session.access_token
          const maxAge = 60 * 60 * 24 * 7 // 7 days
          document.cookie = `sb-access-token=${token};path=/;max-age=${maxAge};SameSite=Lax${window.location.protocol === 'https:' ? ';Secure' : ''}`

          window.location.href = '/dashboard'
        } else {
          throw new Error('No session returned')
        }
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-500">
      
      {/* Animated Background Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-2xl opacity-20 dark:opacity-10 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-2xl opacity-20 dark:opacity-10 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-emerald-500 rounded-full mix-blend-multiply filter blur-2xl opacity-20 dark:opacity-10 animate-blob animation-delay-4000"></div>

      <div className="max-w-md w-full space-y-8 relative z-10 animate-fade-in-up">
        {/* Header/Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-6 transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              Tattoo
            </h2>
            <div className="w-[5.5rem] h-14 bg-gradient-to-tr from-neutral-900 to-neutral-700 dark:from-white dark:to-neutral-300 rounded-2xl flex items-center justify-center shadow-xl">
              <span className="text-white dark:text-neutral-950 font-black text-2xl tracking-widest">HUB</span>
            </div>
          </div>
          <p className="text-neutral-500 dark:text-neutral-400 text-lg">
            Эксклюзивная платформа для топ-мастеров
          </p>
        </div>

        {/* Glassmorphism Form Container */}
        <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/20 dark:border-neutral-800/50 shadow-2xl rounded-3xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-600 dark:text-red-400 flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Email
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-neutral-900 dark:group-focus-within:text-white transition-colors" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent transition-all backdrop-blur-sm"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Пароль
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-neutral-900 dark:group-focus-within:text-white transition-colors" />
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent transition-all backdrop-blur-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              
              {isSignUp && (
                <>
                  <div className="animate-fade-in-up">
                    <label htmlFor="portfolioUrl" className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                      Ссылка на портфолио (Instagram / Сайт)
                    </label>
                    <div className="relative group">
                      <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-neutral-900 dark:group-focus-within:text-white transition-colors" />
                      <input
                        id="portfolioUrl"
                        type="url"
                        required={isSignUp}
                        value={portfolioUrl}
                        onChange={(e) => setPortfolioUrl(e.target.value)}
                        className="block w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent transition-all backdrop-blur-sm"
                        placeholder="https://instagram.com/..."
                      />
                    </div>
                  </div>

                  <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <label htmlFor="referralCode" className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                      Реферальный код (если есть)
                    </label>
                    <div className="relative group">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-neutral-900 dark:group-focus-within:text-white transition-colors" />
                      <input
                        id="referralCode"
                        type="text"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value)}
                        className="block w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent transition-all backdrop-blur-sm"
                        placeholder="OUT-12345"
                      />
                    </div>
                  </div>

                  <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                      Ваша страна
                    </label>
                    <div className="relative group">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-neutral-900 dark:group-focus-within:text-white transition-colors" />
                      <select
                        required={isSignUp}
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                        className="block w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent transition-all backdrop-blur-sm appearance-none"
                      >
                        <option value="" disabled>Выберите страну...</option>
                        {countries.map(c => (
                          <option key={c.id} value={c.id}>{c.name_ru}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {cities.length > 0 && (
                    <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                      <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                        Ваш город
                      </label>
                      <div className="relative group">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-neutral-900 dark:group-focus-within:text-white transition-colors" />
                        <select
                          required={isSignUp}
                          value={selectedCity}
                          onChange={(e) => setSelectedCity(e.target.value)}
                          className="block w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent transition-all backdrop-blur-sm appearance-none"
                        >
                          <option value="" disabled>Выберите город...</option>
                          {cities.map(c => (
                            <option key={c.id} value={c.id}>{c.name_ru}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Создать аккаунт' : 'Войти в систему'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-neutral-200/50 dark:border-neutral-800/50 pt-6">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              {isSignUp 
                ? 'Уже есть аккаунт? Войти' 
                : 'Нет аккаунта? Подать заявку'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs font-medium text-neutral-400 dark:text-neutral-500 mb-4">
          Входя в систему, вы соглашаетесь с эксклюзивными условиями платформы
        </p>

        <div className="flex flex-wrap justify-center gap-4 text-xs font-medium text-neutral-500 dark:text-neutral-500">
          <a href="/terms" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Условия использования</a>
          <span>&middot;</span>
          <a href="/privacy" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Политика конфиденциальности</a>
          <span>&middot;</span>
          <a href="/refunds" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Политика возвратов</a>
        </div>
      </div>
    </div>
  )
}
