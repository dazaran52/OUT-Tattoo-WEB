'use client'

import { useEffect } from 'react'

export function ThemeProvider() {
  useEffect(() => {
    // Apply theme on initial load
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') || 'dark'
      const root = document.documentElement
      
      console.log('ThemeProvider: Applying theme', savedTheme)
      console.log('Current classes:', root.className)
      
      if (savedTheme === 'light') {
        root.classList.remove('dark')
      } else {
        root.classList.add('dark')
      }
      
      console.log('After applying theme, classes:', root.className)
    }
  }, [])

  return null
}
