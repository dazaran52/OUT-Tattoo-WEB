'use client'

import { useState, useEffect } from 'react'
import { LogOut, Coins } from 'lucide-react'
import { supabase, Profile } from '@/lib/supabase'

interface HeaderProps {
  profile: Profile
  onLogout: () => void
}

export function Header({ profile, onLogout }: HeaderProps) {
  return (
    <header className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-neutral-100 to-neutral-400 rounded-lg flex items-center justify-center">
              <span className="text-neutral-950 font-bold text-sm">OUT</span>
            </div>
            <h1 className="text-lg font-semibold text-neutral-50 tracking-tight">
              OUT Tattoo Leads
            </h1>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-6">
            {/* Email */}
            <span className="hidden sm:block text-sm text-neutral-400">
              {profile.email}
            </span>

            {/* Credits Counter */}
            <div className="flex items-center gap-2 bg-neutral-800/50 px-4 py-2 rounded-lg border border-neutral-700">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-neutral-50">{profile.credits}</span>
              <span className="text-sm text-neutral-400">Кредитов</span>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-400 hover:text-neutral-50 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
