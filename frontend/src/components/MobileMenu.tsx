'use client'

import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'

interface MobileMenuProps {
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-xl transition-colors"
    >
      <Menu size={24} />
    </button>
  )
}

export function MobileMenuOverlay({ isOpen, onClose, children }: MobileMenuProps & { onClose: () => void }) {
  // Prevenir scroll do body quando o menu está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  return (
    <>
      {/* Overlay de fundo */}
      <div
        className={`
          fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden
          transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* Menu deslizante */}
      <div
        className={`
          fixed top-0 left-0 h-full w-[280px] z-50 lg:hidden
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Botão de fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors z-10"
        >
          <X size={20} />
        </button>

        {children}
      </div>
    </>
  )
}

export default function MobileMenu({ isOpen, onToggle, children }: MobileMenuProps) {
  return (
    <>
      <MobileMenuButton onClick={onToggle} />
      <MobileMenuOverlay isOpen={isOpen} onClose={onToggle}>
        {children}
      </MobileMenuOverlay>
    </>
  )
}
