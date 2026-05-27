// Centralized API client for OUT Tattoo Leads
import { createClient } from '@supabase/supabase-js'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Authorization': `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json'
  }
}

export const api = {
  // Profile
  async getProfile() {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/profile`, { headers })
    if (!res.ok) throw new Error('Failed to fetch profile')
    return res.json()
  },

  async createProfile(email: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/profile`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email })
    })
    if (!res.ok) throw new Error('Failed to create profile')
    return res.json()
  },

  // Leads
  async getLeads() {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/leads`, { headers })
    if (!res.ok) throw new Error('Failed to fetch leads')
    return res.json()
  },

  async unlockLead(leadId: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/leads/${leadId}/unlock`, {
      method: 'POST',
      headers
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Failed to unlock lead')
    }
    return res.json()
  }
}

export { supabase }
