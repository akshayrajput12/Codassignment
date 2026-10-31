'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Sparkles, RefreshCw, Layers, MessageSquare, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '/overview', label: 'Overview', icon: Layers },
    { href: '/orders', label: 'Orders Inbox', icon: Compass },
    { href: '/conversations', label: 'WhatsApp Simulator', icon: MessageSquare },
    { href: '/policy', label: 'Policy Workbench', icon: ShieldCheck },
    { href: '/evidence', label: 'Data & Replay', icon: FileText },
  ];

  const handleResetDemo = async () => {
    if (!confirm('Reset demo state to initial seed data?')) return;
    setResetting(true);
    try {
      window.location.reload();
    } finally {
      setResetting(false);
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        scrolled
          ? 'bg-canvas/95 backdrop-blur-md shadow-sm border-b border-border py-2.5'
          : 'bg-canvas border-b border-border/60 py-3.5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Wordmark */}
        <Link href="/overview" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-control bg-accent flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
            <Compass className="w-5 h-5 transition-transform duration-300 group-hover:rotate-45" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 font-bold tracking-tight text-ink text-base">
              <span>COD</span>
              <span className="text-text-muted">/</span>
              <span className="text-accent">COMPASS</span>
            </div>
            <span className="text-[10px] text-text-muted tracking-wider uppercase font-medium">D2C Decision Workbench</span>
          </div>
        </Link>

        {/* Navigation Items */}
        <nav className="hidden md:flex items-center gap-1 bg-surface-subtle/80 p-1 rounded-control border border-border">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-control text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-surface text-ink shadow-sm font-semibold'
                    : 'text-text-secondary hover:text-ink hover:bg-surface/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-accent' : 'text-text-muted'}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Status Controls */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-positive-soft border border-positive/20 text-positive text-[11px] font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Offline Ready</span>
          </div>

          <button
            onClick={handleResetDemo}
            disabled={resetting}
            title="Reset demo data"
            className="p-1.5 text-text-muted hover:text-ink hover:bg-surface-subtle rounded-control transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
