'use client';

import React from 'react';
import { Leaf, Camera, Brain, BarChart3, Map, Shield, Globe, Zap, ChevronRight } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

const FEATURES = [
  {
    icon: Camera,
    title: 'Imagens Aéreas',
    description: 'Upload de drone, satélite e vídeo. Captura automática por coordenadas GPS.',
  },
  {
    icon: Brain,
    title: 'IA Avançada',
    description: '8 modelos ML: detecção de vegetação, contagem de árvores, pragas, biomassa e NDVI.',
  },
  {
    icon: Map,
    title: 'Ferramentas GIS',
    description: 'Zonas de cultivo, perímetro ROI, anotações e exportação GeoJSON.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios Completos',
    description: 'Dashboard comparativo, timeline evolutiva, exportação PDF e CSV.',
  },
  {
    icon: Globe,
    title: 'Multilíngue',
    description: 'Disponível em Português, English e Español.',
  },
  {
    icon: Shield,
    title: 'Seguro',
    description: 'Autenticação JWT, rate limiting, validação de uploads e logs estruturados.',
  },
];

const STATS = [
  { value: '65+', label: 'Endpoints API' },
  { value: '8', label: 'Modelos ML' },
  { value: '15', label: 'Fases Completas' },
  { value: '187', label: 'Testes Automatizados' },
];

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-y-auto">
      {/* Hero */}
      <section className="relative px-6 pt-20 pb-24 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-[#6AAF3D]/10 to-transparent pointer-events-none" />
        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Leaf size={48} className="text-[#6AAF3D]" />
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-[#6AAF3D] to-emerald-400 bg-clip-text text-transparent">
              Roboroça
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-2xl mx-auto">
            Análise inteligente de imagens aéreas para agricultura
          </p>
          <p className="text-gray-400 mb-10 max-w-xl mx-auto">
            Identifique vegetação, conte árvores, detecte pragas e monitore a saúde da sua lavoura com inteligência artificial.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onGetStarted}
              className="flex items-center justify-center gap-2 px-8 py-3.5 bg-[#6AAF3D] hover:bg-[#5a9a33] text-white font-semibold rounded-xl transition-all text-lg shadow-lg shadow-[#6AAF3D]/20"
            >
              <Zap size={20} /> Começar Agora <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center p-4 bg-gray-900/50 rounded-xl border border-gray-800">
              <div className="text-3xl font-bold text-[#6AAF3D]">{stat.value}</div>
              <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Funcionalidades</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <div key={feat.title} className="p-6 bg-gray-900/50 rounded-xl border border-gray-800 hover:border-[#6AAF3D]/40 transition-all">
                  <Icon size={28} className="text-[#6AAF3D] mb-3" />
                  <h3 className="text-lg font-semibold mb-2">{feat.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{feat.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20 text-center">
        <div className="max-w-2xl mx-auto p-8 bg-gradient-to-br from-[#6AAF3D]/10 to-emerald-900/10 rounded-2xl border border-[#6AAF3D]/20">
          <h2 className="text-2xl font-bold mb-3">Pronto para começar?</h2>
          <p className="text-gray-400 mb-6">Crie sua conta gratuitamente e comece a analisar suas imagens aéreas.</p>
          <button
            onClick={onGetStarted}
            className="px-8 py-3 bg-[#6AAF3D] hover:bg-[#5a9a33] text-white font-semibold rounded-xl transition-all shadow-lg"
          >
            Criar Conta Gratuita
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-gray-800 text-center text-sm text-gray-500">
        <p>Roboroça &copy; {new Date().getFullYear()} — Análise inteligente para agricultura sustentável</p>
      </footer>
    </div>
  );
}
