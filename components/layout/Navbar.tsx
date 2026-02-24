'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { logOut } from '@/lib/firebase/auth';
import { motion } from 'framer-motion';
import { LogOut, LayoutDashboard, Settings, Mic } from 'lucide-react';
import { toast } from 'sonner';

export default function Navbar() {
    const { user } = useAuth();
    const pathname = usePathname();

    const handleLogout = async () => {
        await logOut();
        toast.success('Signed out');
        window.location.href = '/sign-in';
    };

    const isActive = (path: string) => pathname.startsWith(path);

    return (
        <motion.nav
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
                position: 'sticky', top: 0, zIndex: 50,
                borderBottom: '1px solid var(--border)',
                background: 'rgba(8,15,11,0.85)',
                backdropFilter: 'blur(20px)',
            }}
        >
            <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
                {/* Logo */}
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'linear-gradient(135deg, #22c55e, #10b981)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 16px rgba(34,197,94,0.3)',
                    }}>
                        <Mic size={18} color="#fff" strokeWidth={2.5} />
                    </div>
                    <span style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 20, color: 'var(--text)' }}>
                        Roomate
                    </span>
                </Link>

                {/* Nav Links (authenticated) */}
                {user && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <NavLink href="/dashboard" active={isActive('/dashboard')} icon={<LayoutDashboard size={15} />}>
                            Dashboard
                        </NavLink>
                        <NavLink href="/settings" active={isActive('/settings')} icon={<Settings size={15} />}>
                            Settings
                        </NavLink>
                        <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 8px' }} />
                        <button onClick={handleLogout} className="btn-ghost" style={{ padding: '8px 16px', fontSize: 14 }}>
                            <LogOut size={14} />
                            Sign Out
                        </button>
                    </div>
                )}

                {/* Public nav */}
                {!user && (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Link href="/sign-in" className="btn-ghost" style={{ padding: '8px 20px', fontSize: 14 }}>Sign In</Link>
                        <Link href="/sign-up" className="btn-primary" style={{ padding: '8px 20px', fontSize: 14 }}>Get Started</Link>
                    </div>
                )}
            </div>
        </motion.nav>
    );
}

function NavLink({ href, active, icon, children }: {
    href: string; active: boolean; icon: React.ReactNode; children: React.ReactNode;
}) {
    return (
        <Link href={href} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8,
            fontSize: 14, fontWeight: 500,
            color: active ? 'var(--accent)' : 'var(--text-muted)',
            background: active ? 'var(--accent-glow)' : 'transparent',
            textDecoration: 'none',
            transition: 'all 180ms ease',
        }}>
            {icon}
            {children}
        </Link>
    );
}
