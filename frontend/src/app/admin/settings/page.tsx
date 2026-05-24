'use client';

import { useState } from 'react';
import { Eye, EyeOff, Lock, CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';

export default function AdminSettingsPage() {
    const { user } = useAuthStore();
    const { toast } = useToast();

    const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const [show, setShow] = useState({ current: false, new: false, confirm: false });
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const toggleShow = (field: 'current' | 'new' | 'confirm') =>
        setShow(s => ({ ...s, [field]: !s[field] }));

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.current_password) e.current_password = 'Current password is required.';
        if (!form.new_password) e.new_password = 'New password is required.';
        else if (form.new_password.length < 8) e.new_password = 'Password must be at least 8 characters.';
        if (!form.confirm_password) e.confirm_password = 'Please confirm your new password.';
        else if (form.new_password !== form.confirm_password) e.confirm_password = 'Passwords do not match.';
        if (form.current_password && form.new_password && form.current_password === form.new_password)
            e.new_password = 'New password must differ from current password.';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsLoading(true);
        try {
            await authApi.changePassword({
                current_password: form.current_password,
                new_password: form.new_password,
            });
            setSuccess(true);
            setForm({ current_password: '', new_password: '', confirm_password: '' });
            setErrors({});
            toast({ title: '✅ Password Updated', description: 'Your password has been changed successfully.' });
        } catch (err: any) {
            const detail = err.message || 'Failed to update password.';
            toast({ title: 'Error', description: detail, variant: 'destructive' });
            // Highlight the field if it was a wrong current password error
            if (detail.toLowerCase().includes('incorrect')) {
                setErrors({ current_password: 'Current password is incorrect.' });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const strength = (pwd: string) => {
        if (!pwd) return { score: 0, label: '', color: '' };
        let score = 0;
        if (pwd.length >= 8) score++;
        if (pwd.length >= 12) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;
        if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
        if (score <= 3) return { score, label: 'Fair', color: 'bg-amber-500' };
        if (score === 4) return { score, label: 'Strong', color: 'bg-blue-500' };
        return { score, label: 'Very Strong', color: 'bg-green-500' };
    };

    const pwd = strength(form.new_password);

    const roleLabel = () => {
        const role = (user?.role || '').toString().toLowerCase();
        if (role === 'admin' || role === 'super_admin') return 'Administrator';
        if (user?.user_type === 'seller') return 'Seller';
        return 'User';
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Account Settings</h1>
                <p className="text-slate-500 mt-1">Manage your security and account preferences.</p>
            </div>

            {/* Account info card */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold border border-white/20">
                        {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                        <p className="font-semibold text-lg">{user?.full_name || 'Account'}</p>
                        <p className="text-slate-300 text-sm">{user?.email}</p>
                        <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 border border-white/20">
                            <ShieldCheck className="h-3 w-3" />
                            {roleLabel()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Change Password Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center">
                        <KeyRound className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-slate-900">Change Password</h2>
                        <p className="text-xs text-slate-500">Enter your current password to set a new one.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {success && (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200 text-green-800">
                            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
                            <p className="text-sm font-medium">Password updated successfully! Use your new password next time you log in.</p>
                        </div>
                    )}

                    {/* Current Password */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Current Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            <input
                                id="current_password"
                                type={show.current ? 'text' : 'password'}
                                value={form.current_password}
                                onChange={e => { setForm(f => ({ ...f, current_password: e.target.value })); setErrors(er => ({ ...er, current_password: '' })); setSuccess(false); }}
                                placeholder="Enter your current password"
                                className={`w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-colors ${errors.current_password ? 'border-red-400 focus:ring-red-200 bg-red-50' : 'border-slate-300 focus:ring-slate-200 focus:border-slate-400'}`}
                            />
                            <button type="button" onClick={() => toggleShow('current')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                {show.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {errors.current_password && <p className="text-xs text-red-600">{errors.current_password}</p>}
                    </div>

                    {/* New Password */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">New Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            <input
                                id="new_password"
                                type={show.new ? 'text' : 'password'}
                                value={form.new_password}
                                onChange={e => { setForm(f => ({ ...f, new_password: e.target.value })); setErrors(er => ({ ...er, new_password: '' })); setSuccess(false); }}
                                placeholder="Min. 8 characters"
                                className={`w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-colors ${errors.new_password ? 'border-red-400 focus:ring-red-200 bg-red-50' : 'border-slate-300 focus:ring-slate-200 focus:border-slate-400'}`}
                            />
                            <button type="button" onClick={() => toggleShow('new')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                {show.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {/* Password strength bar */}
                        {form.new_password && (
                            <div className="space-y-1">
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= pwd.score ? pwd.color : 'bg-slate-200'}`} />
                                    ))}
                                </div>
                                <p className={`text-xs font-medium ${pwd.score <= 1 ? 'text-red-600' : pwd.score <= 3 ? 'text-amber-600' : 'text-green-600'}`}>
                                    {pwd.label}
                                </p>
                            </div>
                        )}
                        {errors.new_password && <p className="text-xs text-red-600">{errors.new_password}</p>}
                    </div>

                    {/* Confirm New Password */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Confirm New Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            <input
                                id="confirm_password"
                                type={show.confirm ? 'text' : 'password'}
                                value={form.confirm_password}
                                onChange={e => { setForm(f => ({ ...f, confirm_password: e.target.value })); setErrors(er => ({ ...er, confirm_password: '' })); setSuccess(false); }}
                                placeholder="Re-enter your new password"
                                className={`w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-colors ${errors.confirm_password ? 'border-red-400 focus:ring-red-200 bg-red-50' : form.confirm_password && form.confirm_password === form.new_password ? 'border-green-400 focus:ring-green-200 bg-green-50' : 'border-slate-300 focus:ring-slate-200 focus:border-slate-400'}`}
                            />
                            <button type="button" onClick={() => toggleShow('confirm')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                {show.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {form.confirm_password && form.confirm_password === form.new_password && !errors.confirm_password && (
                            <p className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Passwords match
                            </p>
                        )}
                        {errors.confirm_password && <p className="text-xs text-red-600">{errors.confirm_password}</p>}
                    </div>

                    {/* Tips */}
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                        <p className="text-xs font-medium text-slate-700 mb-2">Password tips:</p>
                        <ul className="space-y-1 text-xs text-slate-500">
                            <li className={`flex items-center gap-1.5 ${form.new_password.length >= 8 ? 'text-green-600' : ''}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${form.new_password.length >= 8 ? 'bg-green-500' : 'bg-slate-300'}`} />
                                At least 8 characters
                            </li>
                            <li className={`flex items-center gap-1.5 ${/[A-Z]/.test(form.new_password) ? 'text-green-600' : ''}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${/[A-Z]/.test(form.new_password) ? 'bg-green-500' : 'bg-slate-300'}`} />
                                At least one uppercase letter
                            </li>
                            <li className={`flex items-center gap-1.5 ${/[0-9]/.test(form.new_password) ? 'text-green-600' : ''}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${/[0-9]/.test(form.new_password) ? 'bg-green-500' : 'bg-slate-300'}`} />
                                At least one number
                            </li>
                            <li className={`flex items-center gap-1.5 ${/[^A-Za-z0-9]/.test(form.new_password) ? 'text-green-600' : ''}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${/[^A-Za-z0-9]/.test(form.new_password) ? 'bg-green-500' : 'bg-slate-300'}`} />
                                At least one special character (recommended)
                            </li>
                        </ul>
                    </div>

                    <button
                        type="submit"
                        id="change-password-submit"
                        disabled={isLoading}
                        className="w-full py-2.5 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                Updating password...
                            </>
                        ) : (
                            <>
                                <KeyRound className="h-4 w-4" />
                                Update Password
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
