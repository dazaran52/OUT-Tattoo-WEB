'use client'

import { useEffect } from 'react'

export function ThemeProvider() {
  useEffect(() => {
    // Apply theme on initial load
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') || 'dark'
      const root = document.documentElement
      
      if (savedTheme === 'light') {
        root.classList.remove('dark')
      } else {
        root.classList.add('dark')
      }
    }
  }, [])

  return null
}
