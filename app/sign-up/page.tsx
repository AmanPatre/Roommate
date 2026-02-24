'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signUp, googleSignIn } from '@/lib/firebase/auth';
import { toast } from 'sonner';
import { Mic, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

const schema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });
type FormData = z.infer<typeof schema>;

export default function SignUpPage() {
    const router = useRouter();
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data: FormData) => {
        setLoading(true);
        try {
            await signUp(data.email, data.password, data.name);
            toast.success('Account created! Welcome to Roomate 🎉');
            router.push('/dashboard');
        } catch (e: any) {
            toast.error(e.message || 'Sign-up failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        setGoogleLoading(true);
        try {
            await googleSignIn();
            toast.success('Welcome to Roomate!');
            router.push('/dashboard');
        } catch (e: any) {
            toast.error(e.message || 'Google sign-in failed.');
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <motion.div
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="glass-card"
                style={{ width: '100%', maxWidth: 460, padding: 40 }}
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
                    <h2 style={{ color: 'var(--text)', marginBottom: 4 }}>Create your account</h2>
                    <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Start your interview prep journey</p>
                </div>

                <button onClick={handleGoogle} disabled={googleLoading} className="btn-ghost"
                    style={{ width: '100%', marginBottom: 20, justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {googleLoading ? 'Connecting...' : 'Continue with Google'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div className="divider" style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>or</span>
                    <div className="divider" style={{ flex: 1 }} />
                </div>

                <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[
                        { name: 'name', label: 'Full Name', type: 'text', placeholder: 'Jane Smith', icon: <User size={15} /> },
                        { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', icon: <Mail size={15} /> },
                    ].map(({ name, label, type, placeholder, icon }) => (
                        <div key={name}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}>{icon}</span>
                                <input {...register(name as any)} type={type} placeholder={placeholder} className="input-field" style={{ paddingLeft: 40 }} />
                            </div>
                            {errors[name as keyof FormData] && (
                                <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{errors[name as keyof FormData]?.message as string}</p>
                            )}
                        </div>
                    ))}

                    {(['password', 'confirm'] as const).map((name) => (
                        <div key={name}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>
                                {name === 'password' ? 'Password' : 'Confirm Password'}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                <input
                                    {...register(name)}
                                    type={showPw ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    className="input-field"
                                    style={{ paddingLeft: 40, paddingRight: 44 }}
                                />
                                {name === 'password' && (
                                    <button type="button" onClick={() => setShowPw(!showPw)}
                                        style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                )}
                            </div>
                            {errors[name] && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{errors[name]?.message}</p>}
                        </div>
                    ))}

                    <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: 4 }}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-muted)' }}>
                    Already have an account?{' '}
                    <Link href="/sign-in" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
                </p>
            </motion.div>
        </div>
    );
}
