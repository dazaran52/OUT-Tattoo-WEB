'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { api, Profile } from '@/lib/api'
import { User, Mail, Coins, Calendar, Phone, FileText, Save, X, Edit2, Unlock, CreditCard } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const profileData = await api.getProfile()
      setProfile(profileData)
      
      // Initialize form values
      setDisplayName(profileData.display_name || '')
      setPhone(profileData.phone || '')
      setBio(profileData.bio || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      
      const updated = await api.updateProfile({
        display_name: displayName,
        phone: phone,
        bio: bio
      })
      
      setProfile(updated)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setDisplayName(profile.display_name || '')
      setPhone(profile.phone || '')
      setBio(profile.bio || '')
    }
    setIsEditing(false)
    setError(null)
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
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-white mb-8">Profil</h1>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column - Avatar and main info */}
          <div className="md:col-span-1">
            <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6">
              {/* Avatar placeholder */}
              <div className="w-24 h-24 bg-gradient-to-br from-neutral-700 to-neutral-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <User className="w-12 h-12 text-neutral-400" />
              </div>
              
              <h2 className="text-lg font-semibold text-white text-center mb-1">
                {profile.display_name || 'Uživatel'}
              </h2>
              <p className="text-neutral-400 text-sm text-center mb-4">{profile.email}</p>
              
              <div className="flex items-center justify-center gap-2 text-amber-400 mb-4">
                <Coins className="w-5 h-5" />
                <span className="font-bold text-lg">{profile.credits}</span>
                <span className="text-sm text-neutral-400">kreditů</span>
              </div>

              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Upravit profil
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 mt-6">
              <h3 className="text-sm font-medium text-neutral-400 uppercase mb-4">Statistiky</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center">
                    <Unlock className="w-5 h-5 text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{profile.unlocked_leads_count || 0}</p>
                    <p className="text-neutral-400 text-sm">Odemčených poptávek</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{profile.total_spent || 0}</p>
                    <p className="text-neutral-400 text-sm">Utopených kreditů</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">
                      {new Date(profile.created_at).toLocaleDateString('cs-CZ')}
                    </p>
                    <p className="text-neutral-400 text-sm">Členem od</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column - Form */}
          <div className="md:col-span-2">
            <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Informace o profilu</h3>

              <div className="space-y-4">
                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    Zobrazované jméno
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Vaše jméno"
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                      />
                    </div>
                  ) : (
                    <p className="text-white py-2.5">{profile.display_name || '-'}</p>
                  )}
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full bg-neutral-800/50 border border-neutral-700 rounded-lg pl-10 pr-4 py-2.5 text-neutral-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    Telefon
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+420 123 456 789"
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                      />
                    </div>
                  ) : (
                    <p className="text-white py-2.5">{profile.phone || '-'}</p>
                  )}
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    O mně
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 w-5 h-5 text-neutral-500" />
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Krátký popis o sobě..."
                        rows={4}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 resize-none"
                      />
                    </div>
                  ) : (
                    <p className="text-white py-2.5 whitespace-pre-wrap">{profile.bio || '-'}</p>
                  )}
                </div>

                {/* User ID (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    ID uživatele
                  </label>
                  <p className="text-neutral-500 text-sm font-mono py-2.5">{profile.id}</p>
                </div>
              </div>

              {/* Action buttons */}
              {isEditing && (
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-50 text-neutral-950 rounded-lg font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Ukládání...' : 'Uložit změny'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Zrušit
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
