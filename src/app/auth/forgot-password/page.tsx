"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent successfully');
      setStatus('A recovery link has been sent to your email.');
    } catch (error: any) {
      toast.error(error.message);
      setStatus('There was an error sending the recovery email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 min-h-screen w-full bg-[#0c0d1f] flex flex-col items-center justify-center relative">
      <div className="w-full max-w-[95vw] mx-auto p-10 bg-[#0c0d1f] rounded-2xl shadow-[0_8px_40px_rgba(14,165,233,0.15)] border border-[rgba(14,165,233,0.15)]
        sm:p-2
        md:max-w-md md:p-10
      ">
        <h2 className="text-2xl font-bold mb-4 text-center text-white">Recover Password</h2>
        <p className="mb-8 text-white/60 text-center">
          Enter your email and we will send you a link to reset your password.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-base font-medium text-white/70 mb-2">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-5 py-4 text-lg rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] text-white/90 focus:outline-none focus:border-[#0ea5e9] transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            className="w-full py-4 px-6 mt-2 bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] text-white rounded-lg shadow-[0_4px_15px_rgba(14,165,233,0.3)] hover:translate-y-[-2px] hover:shadow-[0_8px_25px_rgba(14,165,233,0.4)] transition-all duration-300 text-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin w-5 h-5 mr-2 inline" />
                Sending...
              </>
            ) : (
              "Send recovery link"
            )}
          </button>
        </form>
        {status && (
          <div className="mt-6 text-center text-base text-[#0ea5e9]">
            {status}
          </div>
        )}
        <div className="mt-8 text-center">
          <Link href="/auth" className="text-white/60 hover:text-[#0ea5e9] transition-colors">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
