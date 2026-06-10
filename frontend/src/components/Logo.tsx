import React from 'react'

interface LogoProps {
  className?: string
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-[0.2em] ${className}`}>
      <span className="font-black tracking-tight leading-none" style={{ fontSize: '1em' }}>
        Tattoo
      </span>
      <div className="bg-neutral-900 dark:bg-neutral-100 rounded-[0.25em] px-[0.3em] py-[0.1em] flex items-center justify-center shadow-sm">
        <span className="text-white dark:text-neutral-950 font-bold leading-none tracking-widest" style={{ fontSize: '0.55em' }}>
          HUB
        </span>
      </div>
    </div>
  )
}
