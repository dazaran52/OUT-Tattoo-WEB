'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { supabase, Profile } from '@/lib/supabase'
import { CheckCircle, XCircle, Clock, Loader2, Plus, Edit2, Trash2 } from 'lucide-react'
import { getTranslation, Language } from '@/lib/i18n'

interface AdminUserResponse {
  id: string
  email: string
  display_name: string | null
  phone: string | null
  bio: string | null
  status: string
  credits: number
  created_at: string
}

interface AdminLeadResponse {
  id: string
  title: string
  description: string
  contacts: string
  price_credits: number
  created_at: string
}

export default function AdminPage() {
  const router = useRouter()
  const [language, setLanguage] = useState<string>('cs')
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [users, setUsers] = useState<AdminUserResponse[]>([])
  const [leads, setLeads] = useState<AdminLeadResponse[]>([])
  
  const [activeTab, setActiveTab] = useState<'users' | 'leads'>('users')
  
  const [isLoading, setIsLoading] = useState(true)
  const [isLeadsLoading, setIsLeadsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  
  // Lead Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<AdminLeadResponse | null>(null)
  const [formData, setFormData] = useState({ title: '', description: '', contacts: '', price_credits: 50 })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language as Language, key)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('language') || 'cs'
      setLanguage(savedLang)
    }
  }, [])

  useEffect(() => {
    checkAdminAndFetchData()
  }, [])

  useEffect(() => {
    if (activeTab === 'leads' && leads.length === 0) {
      fetchLeads()
    }
  }, [activeTab])

  const checkAdminAndFetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        window.location.href = '/login'
        return
      }

      // 1. Fetch own profile to verify admin
      const profileRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/profile`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!profileRes.ok) throw new Error('Failed to fetch profile')
      const profileData = await profileRes.json()
      setProfile(profileData)

      if (!profileData.is_admin) {
        router.push('/dashboard')
        return
      }

      // 2. Fetch users for admin panel
      const usersRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/users`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!usersRes.ok) throw new Error('Failed to fetch users')
      const usersData = await usersRes.json()
      setUsers(usersData)

    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLeads = async () => {
    try {
      setIsLeadsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/leads`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) throw new Error('Failed to fetch leads')
      const data = await res.json()
      setLeads(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLeadsLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    window.location.href = '/login'
  }

  const updateUserStatus = async (userId: string, newStatus: string) => {
    try {
      setActionLoadingId(userId)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/users/${userId}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus })
        }
      )

      if (!res.ok) throw new Error(`Failed to update status to ${newStatus}`)

      setUsers(currentUsers => 
        currentUsers.map(user => 
          user.id === userId ? { ...user, status: newStatus } : user
        )
      )

    } catch (err: any) {
      alert(err.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const openLeadModal = (lead?: AdminLeadResponse) => {
    if (lead) {
      setEditingLead(lead)
      setFormData({
        title: lead.title,
        description: lead.description,
        contacts: lead.contacts,
        price_credits: lead.price_credits
      })
    } else {
      setEditingLead(null)
      setFormData({ title: '', description: '', contacts: '', price_credits: 50 })
    }
    setIsModalOpen(true)
  }

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const isEditing = !!editingLead
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/leads${isEditing ? `/${editingLead.id}` : ''}`
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (!res.ok) throw new Error('Failed to save lead')
      const savedLead = await res.json()

      if (isEditing) {
        setLeads(leads.map(l => l.id === savedLead.id ? savedLead : l))
        alert(t('leadUpdated'))
      } else {
        setLeads([savedLead, ...leads])
        alert(t('leadCreated'))
      }
      
      setIsModalOpen(false)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteLead = async (leadId: string) => {
    if (!confirm(t('confirmDeleteLead'))) return
    
    try {
      setActionLoadingId(leadId)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/leads/${leadId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      })

      if (!res.ok) throw new Error('Failed to delete lead')

      setLeads(leads.filter(l => l.id !== leadId))
      alert(t('leadDeleted'))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 h-16 animate-pulse" />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="h-8 w-64 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mb-8" />
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 h-96 animate-pulse" />
        </main>
      </div>
    )
  }

  if (!profile || !profile.is_admin) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200">
      <Header profile={profile} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Admin Panel</h2>
            <p className="mt-1 text-neutral-500 dark:text-neutral-400">Manage users and leads</p>
          </div>
          <div className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 px-4 py-2 rounded-lg font-medium text-sm border border-purple-200 dark:border-purple-800/50">
            Admin Access
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl">
            {error}
          </div>
        )}

        {/* TABS */}
        <div className="flex gap-4 mb-6 border-b border-neutral-200 dark:border-neutral-800 pb-px">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'users' 
                ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white' 
                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'
            }`}
          >
            {t('usersManagement')}
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'leads' 
                ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white' 
                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'
            }`}
          >
            {t('leadsManagement')}
          </button>
        </div>

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm animate-fade-in-up">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                  <tr>
                    <th className="px-6 py-4 font-medium">{t('user')}</th>
                    <th className="px-6 py-4 font-medium">{t('created')}</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-neutral-900 dark:text-white">{user.email}</div>
                        <div className="text-neutral-500 dark:text-neutral-400 text-xs mt-1">
                          {user.display_name ? `${user.display_name}` : 'No Name'} 
                          {user.phone && ` • ${user.phone}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-neutral-600 dark:text-neutral-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {user.status === 'pending' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <Clock className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                        {user.status === 'approved' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                            <CheckCircle className="w-3.5 h-3.5" /> Approved
                          </span>
                        )}
                        {user.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                            <XCircle className="w-3.5 h-3.5" /> Rejected
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {actionLoadingId === user.id ? (
                          <div className="flex justify-end">
                            <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            {user.status !== 'approved' && (
                              <button
                                onClick={() => updateUserStatus(user.id, 'approved')}
                                className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-lg text-xs font-medium hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                              >
                                Approve
                              </button>
                            )}
                            {user.status !== 'rejected' && (
                              <button
                                onClick={() => updateUserStatus(user.id, 'rejected')}
                                className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-neutral-500 dark:text-neutral-400">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LEADS TAB */}
        {activeTab === 'leads' && (
          <div className="animate-fade-in-up">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => openLeadModal()}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                {t('createLead')}
              </button>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                    <tr>
                      <th className="px-6 py-4 font-medium">{t('title')}</th>
                      <th className="px-6 py-4 font-medium">{t('contacts')}</th>
                      <th className="px-6 py-4 font-medium">{t('price')}</th>
                      <th className="px-6 py-4 font-medium text-right">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {isLeadsLoading ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-neutral-400" />
                        </td>
                      </tr>
                    ) : leads.map(lead => (
                      <tr key={lead.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-neutral-900 dark:text-white">{lead.title}</div>
                          <div className="text-neutral-500 dark:text-neutral-400 text-xs mt-1 line-clamp-1 max-w-xs">
                            {lead.description}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
                            {lead.contacts}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-amber-600 dark:text-amber-400">💎 {lead.price_credits}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {actionLoadingId === lead.id ? (
                            <div className="flex justify-end">
                              <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => openLeadModal(lead)}
                                className="p-1.5 text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                title={t('editLead')}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteLead(lead.id)}
                                className="p-1.5 text-neutral-500 hover:text-red-600 dark:hover:text-red-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                title={t('deleteLead')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!isLeadsLoading && leads.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-neutral-500 dark:text-neutral-400">
                          {t('noLeadsAdmin')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* LEAD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in-up">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                {editingLead ? t('editLead') : t('createLead')}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleLeadSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t('title')}
                </label>
                <input
                  required
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-2.5 text-neutral-900 dark:text-white focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent outline-none transition-all"
                  placeholder="e.g. Tattoo sleeve on right arm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t('description')}
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-2.5 text-neutral-900 dark:text-white focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent outline-none transition-all"
                  placeholder="Client requirements, location, style..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t('contacts')} <span className="text-neutral-400 text-xs">(Hidden until unlocked)</span>
                </label>
                <input
                  required
                  type="text"
                  value={formData.contacts}
                  onChange={e => setFormData({...formData, contacts: e.target.value})}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-2.5 text-neutral-900 dark:text-white focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent outline-none transition-all font-mono"
                  placeholder="e.g. +420 123 456 789 or @instagram"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t('priceCredits')}
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  value={formData.price_credits}
                  onChange={e => setFormData({...formData, price_credits: parseInt(e.target.value) || 0})}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-2.5 text-neutral-900 dark:text-white focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent outline-none transition-all"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white font-medium transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-bold shadow-md hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
