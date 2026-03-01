'use client';

import React, { useState, useEffect } from 'react';
import { Leaf, Upload, BarChart3, FileText, ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const STEPS = [
  {
    icon: Leaf,
    title: 'Bem-vindo ao Roboroça!',
    description: 'Plataforma inteligente de análise de imagens aéreas para agricultura. Identifique vegetação, conte árvores, detecte pragas e muito mais.',
    color: '#6AAF3D',
  },
  {
    icon: Upload,
    title: 'Crie um Projeto e Envie Imagens',
    description: 'Comece criando um projeto para sua área. Envie imagens de drone, satélite ou vídeos aéreos. Capture imagens direto por coordenadas GPS.',
    color: '#3B82F6',
  },
  {
    icon: BarChart3,
    title: 'Análise com Inteligência Artificial',
    description: 'Nossa IA analisa vegetação, saúde das plantas, conta árvores, detecta pragas e estima biomassa automaticamente. Defina perímetros e zonas de cultivo para análise focada.',
    color: '#F59E0B',
  },
  {
    icon: FileText,
    title: 'Relatórios e Comparações',
    description: 'Gere relatórios em PDF, compare projetos ao longo do tempo, exporte dados em GeoJSON e acompanhe a evolução da sua lavoura pelo dashboard.',
    color: '#8B5CF6',
  },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  const handleComplete = () => {
    localStorage.setItem('roboroca_onboarding_done', 'true');
    setVisible(false);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleComplete}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X size={20} />
        </button>

        {/* Colored top bar */}
        <div className="h-1.5 w-full" style={{ background: current.color }} />

        {/* Content */}
        <div className="p-8 text-center">
          {/* Icon */}
          <div
            className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6"
            style={{ backgroundColor: `${current.color}20` }}
          >
            <Icon size={40} style={{ color: current.color }} />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-3">{current.title}</h2>

          {/* Description */}
          <p className="text-gray-300 text-base leading-relaxed mb-8">{current.description}</p>

          {/* Step indicators */}
          <div className="flex justify-center gap-2 mb-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === step ? 32 : 12,
                  backgroundColor: i === step ? current.color : '#4B5563',
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="flex items-center gap-1 px-4 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-0 transition-all"
            >
              <ChevronLeft size={16} /> Anterior
            </button>

            {isLast ? (
              <button
                onClick={handleComplete}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium transition-all hover:brightness-110"
                style={{ backgroundColor: current.color }}
              >
                <Sparkles size={18} /> Começar!
              </button>
            ) : (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-1 px-6 py-2.5 rounded-lg text-white font-medium transition-all hover:brightness-110"
                style={{ backgroundColor: current.color }}
              >
                Próximo <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Check if onboarding should be shown */
export function shouldShowOnboarding(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('roboroca_onboarding_done') !== 'true';
}
