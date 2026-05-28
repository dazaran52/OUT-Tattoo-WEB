'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { api, Profile } from '@/lib/api'
import { 
  Settings, Bell, Globe, Lock, Moon, Sun, Trash2, AlertTriangle,
  ChevronRight, Eye, EyeOff, Check
} from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Settings state (persisted in localStorage)
  const [language, setLanguage] = useState('cs')
  const [theme, setTheme] = useState('dark')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [newLeadAlerts, setNewLeadAlerts] = useState(true)
  const [lowCreditAlerts, setLowCreditAlerts] = useState(true)
  
  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  
  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  useEffect(() => {
    fetchProfile()
    loadSettings()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const profileData = await api.getProfile()
      setProfile(profileData)
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadSettings = () => {
    if (typeof window !== 'undefined') {
      setLanguage(localStorage.getItem('language') || 'cs')
      setTheme(localStorage.getItem('theme') || 'dark')
      setEmailNotifications(localStorage.getItem('emailNotifications') !== 'false')
      setNewLeadAlerts(localStorage.getItem('newLeadAlerts') !== 'false')
      setLowCreditAlerts(localStorage.getItem('lowCreditAlerts') !== 'false')
    }
  }

  const saveSetting = (key: string, value: string | boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value.toString())
    }
  }

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang)
    saveSetting('language', lang)
  }

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    saveSetting('theme', newTheme)
    // Note: actual theme switching would require a theme provider
  }

  const handlePasswordChange = async () => {
    setPasswordError(null)
    setPasswordSuccess(false)

    if (newPassword.length < 6) {
      setPasswordError('Heslo musí mít alespoň 6 znaků')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Hesla se neshodují')
      return
    }

    try {
      setIsChangingPassword(true)
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
      
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Nepodařilo se změnit heslo')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-neutral-400">Načítání...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-red-400">Nepodařilo se načíst profil</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <Header profile={profile} onLogout={handleLogout} />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-white mb-8">Nastavení</h1>

        {/* General Settings */}
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 mb-6">
          <div className="p-6 border-b border-neutral-800">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-neutral-400" />
              Obecná nastavení
            </h2>
          </div>

          {/* Language */}
          <div className="p-6 border-b border-neutral-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-neutral-400" />
                <div>
                  <p className="text-white font-medium">Jazyk</p>
                  <p className="text-neutral-400 text-sm">Vyberte preferovaný jazyk aplikace</p>
                </div>
              </div>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-neutral-600"
              >
                <option value="cs">Čeština</option>
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          {/* Theme */}
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Moon className="w-5 h-5 text-neutral-400" />
                ) : (
                  <Sun className="w-5 h-5 text-neutral-400" />
                )}
                <div>
                  <p className="text-white font-medium">Vzhled</p>
                  <p className="text-neutral-400 text-sm">Světlý nebo tmavý režim</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'bg-neutral-50 text-neutral-950'
                      : 'bg-neutral-800 text-white hover:bg-neutral-700'
                  }`}
                >
                  <Moon className="w-4 h-4 inline mr-2" />
                  Tmavý
                </button>
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    theme === 'light'
                      ? 'bg-neutral-50 text-neutral-950'
                      : 'bg-neutral-800 text-white hover:bg-neutral-700'
                  }`}
                >
                  <Sun className="w-4 h-4 inline mr-2" />
                  Světlý
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 mb-6">
          <div className="p-6 border-b border-neutral-800">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-neutral-400" />
              Notifikace
            </h2>
          </div>

          {/* Email notifications master toggle */}
          <div className="p-6 border-b border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Emailové notifikace</p>
                <p className="text-neutral-400 text-sm">Povolit emailové upozornění</p>
              </div>
              <button
                onClick={() => {
                  const newValue = !emailNotifications
                  setEmailNotifications(newValue)
                  saveSetting('emailNotifications', newValue)
                }}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  emailNotifications ? 'bg-amber-500' : 'bg-neutral-700'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    emailNotifications ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* New leads */}
          <div className="p-6 border-b border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Nové poptávky</p>
                <p className="text-neutral-400 text-sm">Upozornit na nové dostupné poptávky</p>
              </div>
              <button
                onClick={() => {
                  const newValue = !newLeadAlerts
                  setNewLeadAlerts(newValue)
                  saveSetting('newLeadAlerts', newValue)
                }}
                disabled={!emailNotifications}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  newLeadAlerts && emailNotifications ? 'bg-amber-500' : 'bg-neutral-700'
                } ${!emailNotifications ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    newLeadAlerts && emailNotifications ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Low credits */}
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Nízký zůstatek kreditů</p>
                <p className="text-neutral-400 text-sm">Upozornit při nízkém počtu kreditů</p>
              </div>
              <button
                onClick={() => {
                  const newValue = !lowCreditAlerts
                  setLowCreditAlerts(newValue)
                  saveSetting('lowCreditAlerts', newValue)
                }}
                disabled={!emailNotifications}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  lowCreditAlerts && emailNotifications ? 'bg-amber-500' : 'bg-neutral-700'
                } ${!emailNotifications ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    lowCreditAlerts && emailNotifications ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Password Change */}
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 mb-6">
          <div className="p-6 border-b border-neutral-800">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-neutral-400" />
              Změna hesla
            </h2>
          </div>

          <div className="p-6">
            {passwordSuccess && (
              <div className="bg-green-900/50 border border-green-500 text-green-200 p-4 rounded-lg mb-4 flex items-center gap-2">
                <Check className="w-5 h-5" />
                Heslo bylo úspěšně změněno
              </div>
            )}

            {passwordError && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-4">
                {passwordError}
              </div>
            )}

            {!showPasswordForm ? (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="flex items-center gap-2 text-neutral-300 hover:text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
                Změnit heslo
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    Nové heslo
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimálně 6 znaků"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pr-12 pl-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                    />
                    <button
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    Potvrzení hesla
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Zadejte heslo znovu"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pr-12 pl-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                    />
                    <button
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handlePasswordChange}
                    disabled={isChangingPassword || !newPassword || !confirmPassword}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-50 text-neutral-950 rounded-lg font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50"
                  >
                    {isChangingPassword ? 'Ukládání...' : 'Změnit heslo'}
                  </button>
                  <button
                    onClick={() => {
                      setShowPasswordForm(false)
                      setNewPassword('')
                      setConfirmPassword('')
                      setPasswordError(null)
                    }}
                    className="px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 transition-colors"
                  >
                    Zrušit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-neutral-900 rounded-xl border border-red-900/50">
          <div className="p-6 border-b border-red-900/30">
            <h2 className="text-lg font-semibold text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Nebezpečná zóna
            </h2>
          </div>

          <div className="p-6">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                Smazat účet
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-neutral-300">
                  Tato akce je nevratná. Pro potvrzení napište <strong>SMazat</strong>:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="SMazat"
                  className="w-full bg-neutral-800 border border-red-900/50 rounded-lg px-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
                />
                <div className="flex gap-3">
                  <button
                    disabled={deleteConfirmText !== 'SMazat'}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Smazat účet
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteConfirmText('')
                    }}
                    className="px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 transition-colors"
                  >
                    Zrušit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
