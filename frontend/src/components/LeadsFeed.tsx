'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { SkeletonCard } from '@/components/SkeletonCard'
import { RefreshCw, Search, Loader2, Plus, Edit2, Trash2, XCircle, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react'
import { getTranslation, Language } from '@/lib/i18n'
import toast from 'react-hot-toast'

export interface Lead {
  id: string
  title: string
  description: string
  contacts: string
  price_credits: number
  is_unlocked: boolean
  image_urls?: string[]
  created_at?: string
}

interface LeadsFeedProps {
  onUnlockSuccess: (newCredits: number) => void
  isAdmin?: boolean
}

export function LeadsFeed({ onUnlockSuccess, isAdmin = false }: LeadsFeedProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unlockingId, setUnlockingId] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [filterText, setFilterText] = useState('')
  const [language, setLanguage] = useState<string>('cs')
  
  // Modal & Admin State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [formData, setFormData] = useState({ title: '', description: '', contacts: '', price_credits: 50, image_urls: [] as string[] })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [currentImageIndexes, setCurrentImageIndexes] = useState<Record<string, number>>({})

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language as Language, key)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('language') || 'cs'
      setLanguage(savedLang)
    }
  }, [])

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    try {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setIsLoading(false)
        document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        window.location.href = '/login'
        return
      }

      // If admin, we fetch from admin endpoint to see ALL leads, even locked ones with contacts shown.
      // Wait, normal users fetch from `/api/leads` and contacts are masked if not unlocked.
      // Admins need to see everything.
      const endpoint = isAdmin 
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/leads`
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads`

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch leads')
      }

      const data = await response.json()
      setLeads(data)
    } catch (err: any) {
      setError(err.message || 'Error fetching leads')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnlock = async (leadId: string) => {
    try {
      setUnlockingId(leadId)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/${leadId}/unlock`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to unlock lead')
      }

      setLeads(currentLeads => 
        currentLeads.map(lead => 
          lead.id === leadId 
            ? { ...lead, contacts: data.contacts, is_unlocked: true } 
            : lead
        )
      )

      if (data.current_credits !== undefined) {
        onUnlockSuccess(data.current_credits)
      }

    } catch (err: any) {
      toast.error(err.message || 'Error unlocking lead')
    } finally {
      setUnlockingId(null)
    }
  }

  // --- ADMIN METHODS ---
  const openLeadModal = (lead?: Lead) => {
    if (lead) {
      setEditingLead(lead)
      setFormData({
        title: lead.title,
        description: lead.description,
        contacts: lead.contacts,
        price_credits: lead.price_credits,
        image_urls: lead.image_urls || []
      })
    } else {
      setEditingLead(null)
      setFormData({ title: '', description: '', contacts: '', price_credits: 50, image_urls: [] })
    }
    setIsModalOpen(true)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    try {
      setUploadingImages(true)
      const files = Array.from(e.target.files)
      const uploadedUrls: string[] = []

      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        const { data, error } = await supabase.storage
          .from('lead_images')
          .upload(filePath, file)

        if (error) throw error

        const { data: publicUrlData } = supabase.storage
          .from('lead_images')
          .getPublicUrl(filePath)
          
        uploadedUrls.push(publicUrlData.publicUrl)
      }

      setFormData(prev => ({
        ...prev,
        image_urls: [...prev.image_urls, ...uploadedUrls]
      }))
    } catch (err: any) {
      toast.error(`Image upload failed: ${err.message}. Make sure 'lead_images' bucket exists and is public.`)
    } finally {
      setUploadingImages(false)
    }
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
      } else {
        setLeads([savedLead, ...leads])
      }
      
      setIsModalOpen(false)
      toast.success(isEditing ? 'Lead updated!' : 'Lead created!')
    } catch (err: any) {
      toast.error(err.message)
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
      toast.success('Lead deleted')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleNextImage = (leadId: string, totalImages: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentImageIndexes(prev => ({
      ...prev,
      [leadId]: ((prev[leadId] || 0) + 1) % totalImages
    }))
  }

  const handlePrevImage = (leadId: string, totalImages: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentImageIndexes(prev => ({
      ...prev,
      [leadId]: ((prev[leadId] || 0) - 1 + totalImages) % totalImages
    }))
  }

  const removeImage = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      image_urls: prev.image_urls.filter((_, i) => i !== indexToRemove)
    }))
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  const filteredLeads = filterText 
    ? leads.filter(l => l.title.toLowerCase().includes(filterText.toLowerCase()) || 
                       l.description.toLowerCase().includes(filterText.toLowerCase()))
    : leads

  return (
    <div className="space-y-6">
      {/* Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white hover:text-gray-300"
            onClick={() => setLightboxImage(null)}
          >
            <XCircle className="w-8 h-8" />
          </button>
          <img 
            src={lightboxImage} 
            alt="Fullscreen lead" 
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            <input
              type="text"
              placeholder={t('filterLeads')}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full sm:w-64 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-9 pr-4 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
            />
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={() => openLeadModal()}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              {t('createLead')}
            </button>
          )}
          <button
            onClick={fetchLeads}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:text-white hover:border-neutral-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </button>
        </div>
      </div>

      {leads.length === 0 && !error && (
        <div className="text-center p-12 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Search className="w-8 h-8 text-neutral-500 dark:text-neutral-400" />
          </div>
          <p className="text-neutral-700 dark:text-neutral-300 text-lg mb-2">{t('noLeads')}</p>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">{t('noLeadsDescription')}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg">
          {error}
          <button onClick={fetchLeads} className="ml-4 text-sm underline">{t('tryAgain')}</button>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLeads.map((lead, index) => {
          const hasImages = lead.image_urls && lead.image_urls.length > 0
          const currentImageIdx = currentImageIndexes[lead.id] || 0

          return (
            <div 
              key={lead.id} 
              className="group relative bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:border-neutral-300 dark:hover:border-neutral-600 hover:-translate-y-1 animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {isAdmin && (
                <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => openLeadModal(lead)}
                    className="p-2 bg-white/90 dark:bg-neutral-900/90 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-neutral-600 hover:text-blue-600 rounded-lg shadow-sm backdrop-blur-sm transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => deleteLead(lead.id)}
                    disabled={actionLoadingId === lead.id}
                    className="p-2 bg-white/90 dark:bg-neutral-900/90 hover:bg-red-50 dark:hover:bg-red-900/30 text-neutral-600 hover:text-red-600 rounded-lg shadow-sm backdrop-blur-sm transition-colors disabled:opacity-50"
                  >
                    {actionLoadingId === lead.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              )}

              {/* Image Carousel */}
              {hasImages && lead.image_urls && (
                <div className="relative w-full h-48 bg-neutral-100 dark:bg-neutral-950 group/carousel">
                  <img 
                    src={lead.image_urls[currentImageIdx]} 
                    alt={`Lead ${lead.title} photo`} 
                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setLightboxImage(lead.image_urls![currentImageIdx])}
                  />
                  {lead.image_urls.length > 1 && (
                    <>
                      <button 
                        onClick={(e) => handlePrevImage(lead.id, lead.image_urls!.length, e)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover/carousel:opacity-100 hover:bg-black/70 transition-all"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => handleNextImage(lead.id, lead.image_urls!.length, e)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover/carousel:opacity-100 hover:bg-black/70 transition-all"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {lead.image_urls.map((_, i) => (
                          <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentImageIdx ? 'bg-white' : 'bg-white/50'}`} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              
              <div className="p-6 flex-1 relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white leading-tight pr-12">{lead.title}</h3>
                  <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-sm whitespace-nowrap border border-neutral-200 dark:border-neutral-700 flex items-center gap-1">
                    💎 {lead.price_credits} {t('credits')}
                  </span>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-6 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">{lead.description}</p>
                
                <div className="bg-neutral-50 dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200/50 dark:border-neutral-800/50 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-neutral-300 to-neutral-400 dark:from-neutral-700 dark:to-neutral-600"></div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 ml-2 font-medium">{t('contacts')}:</p>
                  <p className={`font-mono text-sm ml-2 ${lead.is_unlocked || isAdmin ? 'text-green-600 dark:text-green-400 font-bold' : 'text-neutral-400 dark:text-neutral-600 blur-sm select-none'}`}>
                    {lead.is_unlocked || isAdmin ? lead.contacts : 'HIDDEN_CONTACT_DATA'}
                  </p>
                </div>
              </div>
              
              <div className="p-5 border-t border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/50 backdrop-blur-sm">
                {lead.is_unlocked || isAdmin ? (
                  <button 
                    disabled
                    className="w-full py-3 px-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50 rounded-xl text-sm font-bold transition-all shadow-inner flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {isAdmin ? "ADMIN VIEW" : t('unlocked')}
                  </button>
                ) : (
                  <button 
                    onClick={() => handleUnlock(lead.id)}
                    disabled={unlockingId === lead.id}
                    className="w-full py-3 px-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 group-hover:scale-[1.02]"
                  >
                    {unlockingId === lead.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        🔓 {t('unlock')} — 💎 {lead.price_credits}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* LEAD MODAL (ADMIN ONLY) */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 bg-neutral-900/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center sticky top-0 bg-white dark:bg-neutral-900 z-10">
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

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Photos
                </label>
                
                {/* Image Previews */}
                {formData.image_urls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {formData.image_urls.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                        <img src={url} className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="relative border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg p-6 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-center cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploadingImages}
                  />
                  {uploadingImages ? (
                    <div className="flex flex-col items-center justify-center text-neutral-500">
                      <Loader2 className="w-8 h-8 animate-spin mb-2" />
                      <span className="text-sm">Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-neutral-500">
                      <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                      <span className="text-sm font-medium">Click or drag images here</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-neutral-900 py-4 border-t border-neutral-200 dark:border-neutral-800 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white font-medium transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || uploadingImages}
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
