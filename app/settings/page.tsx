'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/hooks/useAuth';
import Navbar from '@/components/layout/Navbar';
import { logOut } from '@/lib/firebase/auth';
import { toast } from 'sonner';
import { LogOut, User, Shield, Mic, Bell } from 'lucide-react';

export default function SettingsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) router.push('/sign-in');
    }, [user, loading, router]);

    const handleLogout = async () => {
        await logOut();
        toast.success('Signed out successfully');
        router.push('/sign-in');
    };

    if (loading || !user) return null;

    return (
        <div>
            <Navbar />
            <div className="page-container" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 680 }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <p className="section-label">Account Settings</p>
                    <h2 style={{ color: 'var(--text)', marginBottom: 32 }}>Settings</h2>

                    {/* Profile Card */}
                    <div className="glass-card" style={{ padding: 28, marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: '50%',
                                background: 'linear-gradient(135deg, #22c55e, #10b981)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 22, fontFamily: 'Outfit', fontWeight: 700, color: '#fff',
                            }}>
                                {user.displayName?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div>
                                <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>
                                    {user.displayName || 'User'}
                                </div>
                                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{user.email}</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {[
                                { label: 'Auth Provider', value: user.providerData?.[0]?.providerId === 'google.com' ? 'Google' : 'Email/Password' },
                                { label: 'Account ID', value: user.uid.slice(0, 12) + '…' },
                                { label: 'Email Verified', value: user.emailVerified ? '✅ Yes' : '❌ No' },
                                { label: 'Member Since', value: user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : '–' },
                            ].map(({ label, value }) => (
                                <div key={label} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
                                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{value}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Interview Preferences */}
                    <div className="glass-card" style={{ padding: 28, marginBottom: 20 }}>
                        <h3 style={{ color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Mic size={17} color="var(--accent)" /> Interview Preferences
                        </h3>
                        <p style={{ fontSize: 14, marginBottom: 12 }}>Preferences are set per session in the Setup Wizard.</p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {['HR', 'Technical', 'Coding', 'Behavioral', 'Custom'].map((type) => (
                                <span key={type} className="badge badge-muted">{type}</span>
                            ))}
                        </div>
                    </div>

                    {/* Privacy */}
                    <div className="glass-card" style={{ padding: 28, marginBottom: 20 }}>
                        <h3 style={{ color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Shield size={17} color="var(--accent)" /> Privacy & Data
                        </h3>
                        <p style={{ fontSize: 14, marginBottom: 0 }}>
                            Your sessions, transcripts, and debriefs are stored securely in Firebase Firestore and Cloud Storage, tied to your account only. No data is shared with third parties.
                        </p>
                    </div>

                    {/* Sign Out */}
                    <button onClick={handleLogout} className="btn-danger" style={{ width: '100%', padding: '14px', fontSize: 15 }}>
                        <LogOut size={16} /> Sign Out
                    </button>
                </motion.div>
            </div>
        </div>
    );
}
