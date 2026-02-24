import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/hooks/useAuth';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Roomate — AI Interview Prep',
  description: 'Voice-first AI interview preparation platform powered by Gemini and Firebase.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {/* Aurora background — always visible */}
          <div className="aurora-bg" aria-hidden="true">
            <div className="aurora-blob aurora-blob-1" />
            <div className="aurora-blob aurora-blob-2" />
            <div className="aurora-blob aurora-blob-3" />
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            {children}
          </div>

          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'rgba(16, 32, 24, 0.95)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                color: '#e8f5e9',
                backdropFilter: 'blur(20px)',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
