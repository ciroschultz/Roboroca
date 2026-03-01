'use client';

import React from 'react';
import {
  Camera, Brain, BarChart3, Map, Shield, Globe, Zap,
  ChevronRight, Upload, Ruler, FileText, Video, Moon,
  ArrowRight,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export default function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  const { t } = useI18n();

  const FEATURES = [
    { icon: Camera, title: t('landing.features.aerial'), description: t('landing.features.aerialDesc') },
    { icon: Brain, title: t('landing.features.ai'), description: t('landing.features.aiDesc') },
    { icon: Map, title: t('landing.features.gis'), description: t('landing.features.gisDesc') },
    { icon: Video, title: t('landing.features.video'), description: t('landing.features.videoDesc') },
    { icon: BarChart3, title: t('landing.features.dashboard'), description: t('landing.features.dashboardDesc') },
    { icon: FileText, title: t('landing.features.geojson'), description: t('landing.features.geojsonDesc') },
    { icon: Globe, title: t('landing.features.i18n'), description: t('landing.features.i18nDesc') },
    { icon: Moon, title: t('landing.features.darkMode'), description: t('landing.features.darkModeDesc') },
  ];

  const STATS = [
    { value: '65+', label: t('landing.stats.endpoints') },
    { value: '8', label: t('landing.stats.models') },
    { value: '3', label: t('landing.stats.languages') },
    { value: '228', label: t('landing.stats.tests') },
  ];

  const STEPS = [
    { num: '1', title: t('landing.steps.upload'), description: t('landing.steps.uploadDesc'), icon: Upload },
    { num: '2', title: t('landing.steps.perimeter'), description: t('landing.steps.perimeterDesc'), icon: Ruler },
    { num: '3', title: t('landing.steps.analyze'), description: t('landing.steps.analyzeDesc'), icon: Brain },
    { num: '4', title: t('landing.steps.report'), description: t('landing.steps.reportDesc'), icon: FileText },
  ];

  const TECH = [
    'FastAPI', 'Next.js 14', 'PyTorch', 'PostgreSQL', 'Docker', 'Leaflet', 'TailwindCSS', 'YOLOv8',
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-y-auto">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo-icon.png" alt="Roboroça" className="w-9 h-9 object-contain" />
            <span className="text-xl font-bold">
              <span className="text-white">Robo</span>
              <span className="text-[#6AAF3D]">roça</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onLogin}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              {t('auth.login')}
            </button>
            <button
              onClick={onGetStarted}
              className="px-4 py-2 text-sm bg-[#6AAF3D] hover:bg-[#5a9a33] text-white rounded-lg transition-colors"
            >
              {t('auth.register')}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-32 pb-24 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-[#6AAF3D]/10 to-transparent pointer-events-none" />
        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-6">
            <img
              src="/logo-icon.png"
              alt="Roboroça"
              className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-[0_0_24px_rgba(106,175,61,0.3)]"
            />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-2">
            <span className="text-white">Robo</span>
            <span className="bg-gradient-to-r from-[#6AAF3D] to-emerald-400 bg-clip-text text-transparent">roça</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-2xl mx-auto">
            {t('landing.hero.subtitle')}
          </p>
          <p className="text-gray-400 mb-10 max-w-xl mx-auto">
            {t('landing.hero.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onGetStarted}
              className="flex items-center justify-center gap-2 px-8 py-3.5 bg-[#6AAF3D] hover:bg-[#5a9a33] text-white font-semibold rounded-xl transition-all text-lg shadow-lg shadow-[#6AAF3D]/20"
            >
              <Zap size={20} /> {t('landing.hero.cta')} <ChevronRight size={18} />
            </button>
            <button
              onClick={onLogin}
              className="flex items-center justify-center gap-2 px-8 py-3.5 border border-gray-700 hover:border-[#6AAF3D]/50 text-gray-300 hover:text-white font-semibold rounded-xl transition-all text-lg"
            >
              {t('auth.login')} <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* What is it */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">{t('landing.whatIs.title')}</h2>
          <p className="text-gray-400 text-lg leading-relaxed mb-4">
            {t('landing.whatIs.p1')}
          </p>
          <p className="text-gray-400 text-lg leading-relaxed">
            {t('landing.whatIs.p2')}
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center p-6 bg-gray-900/50 rounded-xl border border-gray-800">
              <div className="text-4xl font-bold text-[#6AAF3D]">{stat.value}</div>
              <div className="text-sm text-gray-400 mt-2">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">{t('landing.features.title')}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <div key={feat.title} className="p-5 bg-gray-900/50 rounded-xl border border-gray-800 hover:border-[#6AAF3D]/40 transition-all">
                  <Icon size={28} className="text-[#6AAF3D] mb-3" />
                  <h3 className="text-base font-semibold mb-2">{feat.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{feat.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">{t('landing.steps.title')}</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={step.num} className="text-center relative">
                  {idx < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-7 left-[60%] w-[80%] h-px bg-gradient-to-r from-[#6AAF3D]/40 to-transparent" />
                  )}
                  <div className="w-14 h-14 rounded-full bg-[#6AAF3D]/10 border-2 border-[#6AAF3D] flex items-center justify-center mx-auto mb-4">
                    <Icon size={24} className="text-[#6AAF3D]" />
                  </div>
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-gray-400 text-sm">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Technologies */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">{t('landing.tech.title')}</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {TECH.map((tech) => (
              <span
                key={tech}
                className="px-4 py-2 bg-gray-900/50 rounded-lg border border-gray-800 text-sm text-gray-300 font-mono"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20 text-center">
        <div className="max-w-2xl mx-auto p-8 bg-gradient-to-br from-[#6AAF3D]/10 to-emerald-900/10 rounded-2xl border border-[#6AAF3D]/20">
          <h2 className="text-2xl font-bold mb-3">{t('landing.cta.title')}</h2>
          <p className="text-gray-400 mb-6">{t('landing.cta.description')}</p>
          <button
            onClick={onGetStarted}
            className="px-8 py-3 bg-[#6AAF3D] hover:bg-[#5a9a33] text-white font-semibold rounded-xl transition-all shadow-lg"
          >
            {t('landing.cta.button')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-gray-800 text-center text-sm text-gray-500">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src="/logo-icon.png" alt="Roboroça" className="w-5 h-5 object-contain opacity-50" />
          <span>
            <span className="text-gray-400">Robo</span>
            <span className="text-[#6AAF3D]/60">roça</span>
          </span>
        </div>
        <p>&copy; {new Date().getFullYear()} — {t('landing.footer.text')}</p>
      </footer>
    </div>
  );
}
