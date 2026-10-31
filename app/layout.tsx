import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'COD Compass — Explainable COD Decision Workbench',
  description: 'AI-assisted pre-shipment Cash on Delivery decision engine and unit-economics workbench for D2C brands.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-canvas text-ink antialiased">
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="w-full border-t border-border/80 bg-surface-subtle/50 py-6 text-center text-xs text-text-muted">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>COD Compass &copy; 2026. Built for D2C Haircare Operations & Marketing.</div>
            <div className="flex items-center gap-4 text-text-secondary">
              <span className="font-mono text-[11px]">Empirical Bayesian Shrinkage</span>
              <span>&bull;</span>
              <span className="font-mono text-[11px]">Zod Verified Guardrails</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
