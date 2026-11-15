import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Compass,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Globe2,
  Sparkles,
} from 'lucide-react';
import { AuthUser } from '../types/travel';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  onAuthSuccess: (user: AuthUser, token: string) => void;
  onNotify?: (message: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signup',
  onAuthSuccess,
  onNotify,
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);

  // Password reset state
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync mode with prop
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialMode]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Calculate password strength
  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: '#D68B65' };
    if (score === 2) return { score: 2, label: 'Fair', color: '#E5A93B' };
    if (score === 3) return { score: 3, label: 'Good', color: '#91A995' };
    return { score: 4, label: 'Strong', color: '#243C32' };
  };

  const strength = getPasswordStrength(password);

  // Manual Database Signup / Login
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (mode === 'signup') {
      if (!name.trim() || name.trim().length < 2) {
        setErrorMsg('Please enter your full name (at least 2 characters).');
        return;
      }
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }
      if (password.length < 8) {
        setErrorMsg('Password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match. Please re-enter.');
        return;
      }
      if (!acceptTerms) {
        setErrorMsg('Please accept the Travel Terms & Privacy Policy to continue.');
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setErrorMsg(data.error?.message || 'Failed to create account. Please try again.');
          setLoading(false);
          return;
        }

        setSuccessMsg(`Welcome to AI-Travelmate, ${data.user.name}!`);
        if (onNotify) onNotify(`Welcome to AI-Travelmate, ${data.user.name}!`);
        setTimeout(() => {
          onAuthSuccess(data.user, data.token);
          onClose();
        }, 600);
      } catch (err: any) {
        setErrorMsg('Network error. Unable to reach authentication server.');
      } finally {
        setLoading(false);
      }
    } else if (mode === 'login') {
      if (!email.trim()) {
        setErrorMsg('Please enter your email address.');
        return;
      }
      if (!password) {
        setErrorMsg('Please enter your password.');
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setErrorMsg(data.error?.message || 'Invalid email or password.');
          setLoading(false);
          return;
        }

        setSuccessMsg(`Welcome back, ${data.user.name}!`);
        if (onNotify) onNotify(`Welcome back, ${data.user.name}!`);
        setTimeout(() => {
          onAuthSuccess(data.user, data.token);
          onClose();
        }, 600);
      } catch (err: any) {
        setErrorMsg('Network error. Unable to reach authentication server.');
      } finally {
        setLoading(false);
      }
    } else if (mode === 'forgot') {
      if (resetStep === 'request') {
        if (!email.trim()) {
          setErrorMsg('Please enter your registered email address.');
          return;
        }
        setLoading(true);
        try {
          const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim().toLowerCase() }),
          });
          const data = await res.json();
          setSuccessMsg(data.message || 'Password reset code generated.');
          if (data.resetToken) {
            setResetToken(data.resetToken);
            setResetStep('confirm');
          }
        } catch {
          setErrorMsg('Failed to process password reset.');
        } finally {
          setLoading(false);
        }
      } else {
        if (!resetToken.trim() || newPassword.length < 8) {
          setErrorMsg('Valid reset token and new password (min 8 characters) required.');
          return;
        }
        setLoading(true);
        try {
          const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: resetToken.trim(), newPassword }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            setErrorMsg(data.error?.message || 'Failed to update password.');
            setLoading(false);
            return;
          }
          setSuccessMsg('Password updated successfully! Please sign in with your new credentials.');
          setTimeout(() => {
            setMode('login');
            setPassword('');
          }, 1200);
        } catch {
          setErrorMsg('Failed to reset password.');
        } finally {
          setLoading(false);
        }
      }
    }
  };

  // Google Sign-Up / Sign-In
  const handleGoogleAuth = async (useDemo = false) => {
    setErrorMsg(null);
    setGoogleLoading(true);

    try {
      if (useDemo) {
        // Fast instant demo Google authentication
        const res = await fetch('/api/auth/google/credential', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ demoGoogle: true }),
        });
        const data = await res.json();
        if (data.success && data.user) {
          setSuccessMsg(`Signed in with Google as ${data.user.name}`);
          if (onNotify) onNotify(`Signed in with Google as ${data.user.name}`);
          setTimeout(() => {
            onAuthSuccess(data.user, data.token);
            onClose();
          }, 600);
          return;
        }
      }

      // Check if Google OAuth redirect is available
      const statusRes = await fetch('/api/auth/google/status');
      const status = await statusRes.json();

      if (status.enabled) {
        // Direct browser to full Google OAuth flow
        window.location.href = '/api/auth/google';
      } else {
        // Fallback to instant mock Google account
        const fallbackRes = await fetch('/api/auth/google/credential', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ demoGoogle: true }),
        });
        const data = await fallbackRes.json();
        if (data.success && data.user) {
          setSuccessMsg(`Signed in as ${data.user.name}`);
          if (onNotify) onNotify(`Signed in with Google as ${data.user.name}`);
          setTimeout(() => {
            onAuthSuccess(data.user, data.token);
            onClose();
          }, 600);
        } else {
          setErrorMsg('Google authentication service is currently unavailable.');
        }
      }
    } catch (err: any) {
      setErrorMsg('Failed to initialize Google Sign-In.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-[#243C32]/45 backdrop-blur-sm animate-fadeIn"
    >
      <div
        className="relative w-full max-w-4xl bg-[#FFFFFF] rounded-3xl shadow-2xl overflow-hidden border border-[#E6E2D8] my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-5 right-5 z-20 w-9 h-9 rounded-full bg-[#FFFFFF]/80 hover:bg-[#F7F5EF] text-[#858B84] hover:text-[#343A36] border border-[#E6E2D8] flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
          {/* Left Column: Atmospheric Travel Inspiration (Desktop) */}
          <div className="hidden md:flex md:col-span-5 relative bg-[#243C32] text-[#FFFFFF] p-8 lg:p-10 flex-col justify-between overflow-hidden">
            {/* Background image overlay */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity scale-105"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80')`,
              }}
            />
            {/* Gradient wash */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#243C32]/90 via-[#243C32]/75 to-[#1B2E26]" />

            {/* Content atop image */}
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-[#91A995] text-[#243C32] flex items-center justify-center font-bold">
                  <Compass className="w-4 h-4" />
                </span>
                <span className="font-display text-lg font-semibold tracking-tight text-[#F7F5EF]">
                  AI-TravelMate
                </span>
              </div>

              <div className="pt-4">
                <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide uppercase bg-[#91A995]/20 text-[#91A995] border border-[#91A995]/30 mb-3">
                  Natural Journey
                </span>
                <h2 className="font-display text-2xl lg:text-3xl font-semibold leading-tight text-[#F7F5EF]">
                  Every great journey begins with a single step.
                </h2>
                <p className="mt-2 text-xs text-[#E6E2D8]/80 leading-relaxed">
                  Join travelers crafting mindful itineraries with transparent scoring, offline vaults, and instant group collaboration.
                </p>
              </div>

              <div className="pt-2 space-y-3.5 text-xs text-[#E6E2D8]">
                <div className="flex items-start gap-3">
                  <Globe2 className="w-4 h-4 text-[#91A995] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#FFFFFF] block">Cloud Itinerary Sync</strong>
                    <span>Seamlessly access your planned trips across laptops and phones.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-[#91A995] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#FFFFFF] block">Ludo-Style Room Codes</strong>
                    <span>Invite travel companions in seconds with a 6-character room code.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-[#91A995] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#FFFFFF] block">Encrypted Travel Vault</strong>
                    <span>Store tickets, emergency numbers, and offline schedules securely.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom testimonial */}
            <div className="relative z-10 pt-6 border-t border-[#FFFFFF]/15 text-[11px] text-[#E6E2D8]/70">
              <p className="italic">&ldquo;The most elegant and clutter-free travel planner I have ever used.&rdquo;</p>
              <span className="block mt-1 font-medium text-[#91A995]">— Curated for Mindful Explorers</span>
            </div>
          </div>

          {/* Right Column: Clean Editorial Form */}
          <div className="col-span-1 md:col-span-7 p-6 sm:p-10 flex flex-col justify-between bg-[#F7F5EF]/30">
            <div>
              {/* Header & Mode Tabs */}
              <div className="flex items-center justify-between border-b border-[#E6E2D8] pb-4 mb-6">
                <div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-[#343A36]">
                    {mode === 'signup' && 'Create Your Account'}
                    {mode === 'login' && 'Welcome Back'}
                    {mode === 'forgot' && 'Reset Your Password'}
                  </h3>
                  <p className="text-xs text-[#858B84] mt-0.5">
                    {mode === 'signup' && 'Sign up to sync and personalize your travel journeys.'}
                    {mode === 'login' && 'Enter your credentials to access your trips and vault.'}
                    {mode === 'forgot' && 'We will help you regain access to your travel vault.'}
                  </p>
                </div>

                {mode !== 'forgot' && (
                  <div className="flex items-center gap-1 p-1 bg-[#F7F5EF] rounded-full border border-[#E6E2D8]">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        setErrorMsg(null);
                      }}
                      className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                        mode === 'signup'
                          ? 'bg-[#243C32] text-[#FFFFFF]'
                          : 'text-[#858B84] hover:text-[#343A36]'
                      }`}
                    >
                      Sign Up
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setErrorMsg(null);
                      }}
                      className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                        mode === 'login'
                          ? 'bg-[#243C32] text-[#FFFFFF]'
                          : 'text-[#858B84] hover:text-[#343A36]'
                      }`}
                    >
                      Sign In
                    </button>
                  </div>
                )}
              </div>

              {/* Alert Feedback */}
              {errorMsg && (
                <div className="mb-5 p-3 rounded-2xl bg-[#D68B65]/10 border border-[#D68B65]/30 flex items-start gap-2.5 text-xs text-[#D68B65]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="flex-1 font-medium">{errorMsg}</span>
                  <button type="button" onClick={() => setErrorMsg(null)} className="hover:opacity-75">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {successMsg && (
                <div className="mb-5 p-3 rounded-2xl bg-[#91A995]/15 border border-[#91A995]/40 flex items-start gap-2.5 text-xs text-[#243C32]">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#243C32]" />
                  <span className="flex-1 font-medium">{successMsg}</span>
                </div>
              )}

              {/* 1. Google Authentication Section */}
              {mode !== 'forgot' && (
                <div className="space-y-3 mb-6">
                  <button
                    type="button"
                    onClick={() => handleGoogleAuth(false)}
                    disabled={googleLoading || loading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-full bg-[#FFFFFF] border border-[#D8D2C5] hover:border-[#243C32] hover:bg-[#F7F5EF] text-sm font-medium text-[#343A36] shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#243C32]/20 disabled:opacity-50"
                  >
                    {/* Official Google G Logo */}
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>
                      {googleLoading ? 'Connecting to Google...' : mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}
                    </span>
                  </button>

                  <div className="flex items-center justify-between px-1 text-[11px] text-[#858B84]">
                    <span>Official Google OAuth 2.0</span>
                    <button
                      type="button"
                      onClick={() => handleGoogleAuth(true)}
                      className="text-[#243C32] font-semibold hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-[#D68B65]" />
                      <span>One-click Demo Google Sign-In</span>
                    </button>
                  </div>

                  {/* Hairline Editorial Divider */}
                  <div className="relative py-2 flex items-center justify-center">
                    <div className="w-full border-t border-[#E6E2D8]" />
                    <span className="absolute px-3 bg-[#F7F5EF] text-[11px] uppercase tracking-wider text-[#858B84] font-medium">
                      or continue with email
                    </span>
                  </div>
                </div>
              )}

              {/* 2. Manual Database Form */}
              <form onSubmit={handleManualSubmit} className="space-y-4">
                {/* Full Name (Sign Up only) */}
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#343A36] mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#858B84] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Maya Lin"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#FFFFFF] border border-[#E6E2D8] rounded-xl text-[#343A36] placeholder-[#858B84]/60 focus:outline-none focus:border-[#243C32] focus:ring-1 focus:ring-[#243C32] transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Email Address */}
                {mode !== 'forgot' || resetStep === 'request' ? (
                  <div>
                    <label className="block text-xs font-semibold text-[#343A36] mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#858B84] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="traveler@example.com"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#FFFFFF] border border-[#E6E2D8] rounded-xl text-[#343A36] placeholder-[#858B84]/60 focus:outline-none focus:border-[#243C32] focus:ring-1 focus:ring-[#243C32] transition-colors"
                      />
                    </div>
                  </div>
                ) : null}

                {/* Password (for Login and Signup) */}
                {mode !== 'forgot' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-[#343A36]">
                        Password
                      </label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => {
                            setMode('forgot');
                            setErrorMsg(null);
                          }}
                          className="text-[11px] text-[#243C32] hover:underline"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#858B84] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full pl-10 pr-10 py-2.5 text-xs bg-[#FFFFFF] border border-[#E6E2D8] rounded-xl text-[#343A36] placeholder-[#858B84]/60 focus:outline-none focus:border-[#243C32] focus:ring-1 focus:ring-[#243C32] transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#858B84] hover:text-[#343A36]"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password Strength Indicator for Sign Up */}
                    {mode === 'signup' && password.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-1.5 h-1.5">
                          {[1, 2, 3, 4].map((step) => (
                            <div
                              key={step}
                              className="flex-1 h-full rounded-full transition-all duration-300"
                              style={{
                                backgroundColor:
                                  strength.score >= step ? strength.color : '#E6E2D8',
                              }}
                            />
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#858B84]">Password strength:</span>
                          <span className="font-semibold" style={{ color: strength.color }}>
                            {strength.label}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Confirm Password (Sign Up only) */}
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#343A36] mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#858B84] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        className={`w-full pl-10 pr-10 py-2.5 text-xs bg-[#FFFFFF] border rounded-xl text-[#343A36] placeholder-[#858B84]/60 focus:outline-none transition-colors ${
                          confirmPassword && confirmPassword === password
                            ? 'border-[#91A995] focus:border-[#243C32]'
                            : confirmPassword && confirmPassword !== password
                            ? 'border-[#D68B65] focus:border-[#D68B65]'
                            : 'border-[#E6E2D8] focus:border-[#243C32]'
                        }`}
                      />
                      {confirmPassword && confirmPassword === password && (
                        <CheckCircle2 className="w-4 h-4 text-[#243C32] absolute right-3.5 top-1/2 -translate-y-1/2" />
                      )}
                    </div>
                  </div>
                )}

                {/* Forgot Password Reset Step 2 */}
                {mode === 'forgot' && resetStep === 'confirm' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-[#343A36] mb-1">
                        Reset Token
                      </label>
                      <input
                        type="text"
                        required
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        placeholder="Enter token from email / local log"
                        className="w-full px-3.5 py-2.5 text-xs bg-[#FFFFFF] border border-[#E6E2D8] rounded-xl text-[#343A36] focus:outline-none focus:border-[#243C32]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#343A36] mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full px-3.5 py-2.5 text-xs bg-[#FFFFFF] border border-[#E6E2D8] rounded-xl text-[#343A36] focus:outline-none focus:border-[#243C32]"
                      />
                    </div>
                  </>
                )}

                {/* Terms and Preferences Checkboxes */}
                {mode === 'signup' && (
                  <div className="space-y-2 pt-1 text-xs">
                    <label className="flex items-start gap-2 cursor-pointer select-none text-[#858B84]">
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="mt-0.5 rounded text-[#243C32] focus:ring-[#243C32] accent-[#243C32]"
                      />
                      <span>
                        I agree to AI-Travelmate&rsquo;s{' '}
                        <span className="text-[#343A36] font-medium underline">Terms of Service</span> and{' '}
                        <span className="text-[#343A36] font-medium underline">Privacy Policy</span>.
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none text-[#858B84]">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded text-[#243C32] focus:ring-[#243C32] accent-[#243C32]"
                      />
                      <span>Keep me signed in on this device</span>
                    </label>
                  </div>
                )}

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full mt-2 py-3 px-5 rounded-full bg-[#243C32] hover:bg-[#1B2E26] text-[#FFFFFF] text-sm font-semibold tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <span>
                        {mode === 'signup' && 'Create Traveler Account'}
                        {mode === 'login' && 'Sign In to TravelMate'}
                        {mode === 'forgot' &&
                          (resetStep === 'request' ? 'Request Password Reset' : 'Confirm New Password')}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Bottom Switcher */}
            <div className="pt-6 border-t border-[#E6E2D8] mt-6 text-center text-xs text-[#858B84]">
              {mode === 'signup' && (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMsg(null);
                    }}
                    className="font-semibold text-[#243C32] hover:underline"
                  >
                    Sign In instead
                  </button>
                </p>
              )}

              {mode === 'login' && (
                <p>
                  New to AI-Travelmate?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setErrorMsg(null);
                    }}
                    className="font-semibold text-[#243C32] hover:underline"
                  >
                    Create an account
                  </button>
                </p>
              )}

              {mode === 'forgot' && (
                <p>
                  Remember your credentials?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMsg(null);
                    }}
                    className="font-semibold text-[#243C32] hover:underline"
                  >
                    Back to Sign In
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;

