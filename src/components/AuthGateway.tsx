import React, { useState } from 'react';
import { 
  GraduationCap, 
  Lock, 
  User as UserIcon, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  BookOpen, 
  Award,
  Users
} from 'lucide-react';
import { User } from '../types';
import { generateSalt, hashPassword, verifyPassword } from '../utils/crypto';
import { 
  loadAllUsers, 
  saveUser, 
  setCurrentUser, 
  findUserByUsername,
  migrateGuestDataToUser 
} from '../utils/storage';

interface AuthGatewayProps {
  onAuthenticated: (user: User, migrationNotice?: string) => void;
}

export const AuthGateway: React.FC<AuthGatewayProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const existingUsers = loadAllUsers();

  const handleQuickSwitch = (u: User) => {
    setUsername(u.username);
    setPassword('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError('Please choose a username.');
      return;
    }
    if (cleanUsername.length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      setError('Username may only contain letters, numbers, underscores, or hyphens.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    setIsProcessing(true);

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          setError('Passwords do not match. Please verify.');
          setIsProcessing(false);
          return;
        }

        const existing = findUserByUsername(cleanUsername);
        if (existing) {
          setError(`Username "${cleanUsername}" is already taken. Please choose another unique handle or log in.`);
          setIsProcessing(false);
          return;
        }

        // Generate cryptographic salt & hash password
        const salt = generateSalt(16);
        const passwordHash = await hashPassword(password, salt);

        const newUser: User = {
          id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          username: cleanUsername,
          password_hash: passwordHash,
          salt: salt,
          created_at: new Date().toISOString(),
        };

        // Save user to storage
        saveUser(newUser);
        setCurrentUser(newUser);

        // Crucial UX Step: Migrate any existing guest question banks / test attempts to this new account!
        const migration = migrateGuestDataToUser(newUser.id, newUser.username);
        let notice: string | undefined = undefined;
        if (migration.banksMigrated > 0 || migration.attemptsMigrated > 0) {
          notice = `Welcome! Successfully migrated ${migration.banksMigrated} custom question bank(s) and ${migration.attemptsMigrated} past test attempt(s) to your account.`;
        }

        onAuthenticated(newUser, notice);
      } else {
        // Mode === 'login'
        const user = findUserByUsername(cleanUsername);
        if (!user) {
          setError(`No account found with username "${cleanUsername}". Check your spelling or click "Create Account".`);
          setIsProcessing(false);
          return;
        }

        const isValid = await verifyPassword(password, user.password_hash, user.salt);
        if (!isValid) {
          setError('Incorrect password. Please re-enter your password.');
          setIsProcessing(false);
          return;
        }

        setCurrentUser(user);

        // Check if there is any unassigned guest data to migrate
        const migration = migrateGuestDataToUser(user.id, user.username);
        let notice: string | undefined = undefined;
        if (migration.banksMigrated > 0 || migration.attemptsMigrated > 0) {
          notice = `Synchronized ${migration.banksMigrated} question bank(s) and ${migration.attemptsMigrated} test attempt(s) to your session.`;
        }

        onAuthenticated(user, notice);
      }
    } catch (err: any) {
      setError(`Authentication error: ${err.message || 'Unable to process'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* Background visual ambiance */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* App Branding Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-xl shadow-blue-500/20 mb-1 ring-4 ring-blue-500/20">
            <GraduationCap className="w-8 h-8" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            UGC-NET Paper I
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto">
            Mock Test Examination Engine & Question Bank Portal
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/70 border border-slate-800 rounded-xl mb-6 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2.5 rounded-lg transition ${
                mode === 'login'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Candidate Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`py-2.5 rounded-lg transition ${
                mode === 'signup'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Unique Candidate Username</span>
                <span className="text-[10px] text-slate-500 font-normal">Anonymous Handle</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  placeholder="e.g. jrf_aspirant_2026"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Password</span>
                <span className="text-[10px] text-slate-500 font-normal">Encrypted</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field (Sign up only) */}
            {mode === 'signup' && (
              <div className="animate-fade-in">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>
            )}

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
            >
              {isProcessing ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === 'signup' ? (
                <>
                  <span>Create Anonymous Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Sign In as Candidate</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Privacy Guarantee Box (Strict Constraint: No Email / No Phone) */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-2">
            <div className="flex items-start gap-2.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="text-slate-200">100% Anonymous & Private:</strong> No email, phone number, or personal details are collected. Your test attempts, analytics, and question banks are cryptographically tied solely to your unique username.
              </div>
            </div>

            {mode === 'signup' && (
              <div className="flex items-start gap-2.5 text-[11px] text-blue-400/90 pt-1">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-blue-300">Seamless Migration:</strong> Any question banks or mock tests previously taken on this browser will be automatically migrated to your new account.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Existing Users on this device (Quick switch assistance) */}
        {existingUsers.length > 0 && mode === 'login' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>Candidates Registered on this Browser:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {existingUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickSwitch(u)}
                  className={`px-2.5 py-1 rounded-lg border text-xs transition ${
                    username === u.username
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 font-semibold'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {u.username}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Highlights footer */}
        <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-4">
          <span className="flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" /> 50 Questions
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" /> 60 Minutes
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-slate-400" /> NTA Pattern
          </span>
        </div>
      </div>
    </div>
  );
};
