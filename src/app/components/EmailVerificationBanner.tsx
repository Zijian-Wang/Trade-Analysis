import { useState } from 'react';
import { AlertCircle, Mail, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export function EmailVerificationBanner() {
    const { user, resendVerificationEmail } = useAuth();
    const [sending, setSending] = useState(false);

    if (!user || user.emailVerified) {
        return null;
    }

    const handleResend = async () => {
        setSending(true);
        try {
            await resendVerificationEmail();
            toast.success('Verification email sent! Please check your inbox.');
        } catch (err: any) {
            toast.error(err.message || 'Failed to send verification email');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 border-b border-amber-200 px-4 py-3">
            <div className="max-w-[1260px] mx-auto flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                            Please verify your email address
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                            We've sent a verification link to <strong>{user.email}</strong>
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleResend}
                    disabled={sending}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 dark:bg-amber-500 hover:bg-amber-700 dark:hover:bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {sending ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending...
                        </>
                    ) : (
                        <>
                            <Mail className="w-4 h-4" />
                            Resend Email
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
