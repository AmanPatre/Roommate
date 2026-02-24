'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { resetPassword } from '@/lib/firebase/auth';
import { toast } from 'sonner';
import { Mic, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

const schema = z.object({ email: z.string().email('Invalid email') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

    const onSubmit = async (data: FormData) => {
        setLoading(true);
        try {
            await resetPassword(data.email);
            setSent(true);
            toast.success('Reset email sent!');
        } catch (e: any) {
            toast.error(e.message || 'Failed to send reset email.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <motion.div
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="glass-card"
                style={{ width: '100%', maxWidth: 420, padding: 40 }}
            >
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 14,
                        background: 'linear-gradient(135deg, #22c55e, #10b981)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(34,197,94,0.3)',
                    }}>
                        <Mic size={24} color="#fff" strokeWidth={2.5} />
                    </div>
                    <h2 style={{ color: 'var(--text)', marginBottom: 4 }}>Reset Password</h2>
                    <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>We&apos;ll email you a reset link</p>
                </div>

                {sent ? (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center' }}>
                        <CheckCircle size={48} color="var(--accent)" style={{ margin: '0 auto 16px' }} />
                        <h3 style={{ color: 'var(--text)', marginBottom: 8 }}>Check your inbox</h3>
                        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
                            A password reset link has been sent to your email address.
                        </p>
                        <Link href="/sign-in" className="btn-primary" style={{ display: 'inline-flex' }}>
                            Back to Sign In
                        </Link>
                    </motion.div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>Email</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                <input {...register('email')} type="email" placeholder="you@example.com" className="input-field" style={{ paddingLeft: 40 }} />
                            </div>
                            {errors.email && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{errors.email.message}</p>}
                        </div>
                        <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%' }}>
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                )}

                <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <Link href="/sign-in" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--text-muted)', textDecoration: 'none' }}>
                        <ArrowLeft size={14} /> Back to Sign In
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
