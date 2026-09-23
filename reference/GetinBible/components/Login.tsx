import React, { useState } from 'react';
import SpeechInputButton from './SpeechInputButton';
import { checkUserPassword } from '../services/userService';

interface LoginProps {
  onLogin: (name: string, password?: string) => Promise<void>;
  onSetupPassword?: (password: string, email?: string) => Promise<void>;
}

type UserType = 'participant' | 'admin' | null;
type StudentStep = 'name' | 'password' | 'setup' | null;

const Login: React.FC<LoginProps> = ({ onLogin, onSetupPassword }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userType, setUserType] = useState<UserType>(null);
  const [studentStep, setStudentStep] = useState<StudentStep>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  const handleSpeechTranscript = (transcript: string) => {
    setName(prev => prev ? `${prev} ${transcript}` : transcript);
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password.trim()) return;
    setError('');
    setLoading(true);
    try {
      // Client-side check first
      if (password !== 'CKLBCKOHO') {
        setError('密碼不正確');
        return;
      }
      await onLogin(name.trim(), password);
    } catch (err: any) {
      setError(err.message || '登入失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    setLoading(true);
    try {
      const result = await checkUserPassword(name.trim());
      if (!result.exists) {
        // New user - offer password setup
        setIsNewUser(true);
        setStudentStep('setup');
      } else if (result.hasPassword) {
        // Existing user with password
        setStudentStep('password');
      } else {
        // Existing user without password - login directly
        await onLogin(name.trim());
      }
    } catch (err: any) {
      setError(err.message || '登入失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setError('');
    setLoading(true);
    try {
      await onLogin(name.trim(), password);
    } catch (err: any) {
      setError(err.message || '密碼不正確');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setError('');
    setLoading(true);
    try {
      // First create the user by logging in
      await onLogin(name.trim());
      // Then set the password
      if (onSetupPassword) {
        await onSetupPassword(password, email || undefined);
      }
    } catch (err: any) {
      setError(err.message || '設定失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipPassword = async () => {
    setLoading(true);
    try {
      await onLogin(name.trim());
    } catch (err: any) {
      setError(err.message || '登入失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSelection = () => {
    setUserType(null);
    setStudentStep(null);
    setName('');
    setPassword('');
    setEmail('');
    setError('');
    setIsNewUser(false);
  };

  const handleBackToName = () => {
    setStudentStep(null);
    setPassword('');
    setEmail('');
    setError('');
  };

  // User type selection screen
  if (!userType) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{
          backgroundImage: 'url(/BibleInChurch.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50"></div>

        <div className="relative z-10 text-center max-w-2xl w-full">
          {/* Logo/Icon */}
          <div className="bg-amber-100 w-24 h-24 rounded-2xl flex items-center justify-center text-amber-600 text-4xl font-bold mx-auto mb-6 shadow-xl">
            📖
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg" style={{ fontFamily: 'serif' }}>
            活水讀經
          </h1>

          {/* Subtitle */}
          <p className="text-white/90 text-lg md:text-xl mb-12 leading-relaxed max-w-lg mx-auto">
            透過互動聖經研讀平台，<br />
            讓您對神的話語深入了解，靈命得著滋養。
          </p>

          {/* User type buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => setUserType('participant')}
              className="group flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 min-w-[200px] justify-center"
            >
              <span className="text-2xl">👤</span>
              <span>學生登入</span>
            </button>

            <button
              onClick={() => setUserType('admin')}
              className="group flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border-2 border-white/50 hover:border-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 min-w-[200px] justify-center"
            >
              <span className="text-2xl">⚙️</span>
              <span>管理員登入</span>
            </button>
          </div>

          {/* Scripture quote */}
          <p className="mt-16 text-white/70 text-sm leading-relaxed max-w-md mx-auto">
            「聖經都是上帝所默示的，於教訓、督責、<br />
            使人歸正、教導人學義都是有益的。」<br />
            <span className="text-amber-300">提摩太後書 3:16</span>
          </p>
        </div>
      </div>
    );
  }

  // Admin login form
  if (userType === 'admin') {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{
          backgroundImage: 'url(/BibleInChurch.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative z-10 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl max-w-md w-full p-8 md:p-12 animate-fadeIn">
          <button
            onClick={handleBackToSelection}
            className="absolute top-4 left-4 text-slate-500 hover:text-slate-700 flex items-center gap-1 text-sm transition-colors"
          >
            <span>←</span>
            <span>返回</span>
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 bg-purple-100">
              ⚙️
            </div>
            <h2 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'serif' }}>
              管理員登入
            </h2>
            <p className="text-slate-500 mt-2 text-sm">請輸入管理員帳號與密碼</p>
          </div>

          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                管理員名稱
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  id="name"
                  required
                  className="flex-1 px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-0 outline-none transition-all text-lg text-center"
                  placeholder="管理員帳號"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(''); }}
                  autoFocus
                />
                <SpeechInputButton
                  onTranscript={handleSpeechTranscript}
                  className="flex-shrink-0"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                密碼
              </label>
              <input
                type="password"
                id="password"
                required
                className="w-full px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-0 outline-none transition-all text-lg text-center"
                placeholder="請輸入密碼"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed bg-purple-600 hover:bg-purple-700"
            >
              {loading ? '登入中...' : '確認登入'}
            </button>
          </form>

          <p className="mt-6 text-center text-slate-400 text-xs leading-relaxed">
            管理員可以管理課程、查看分析報告及設定系統。
          </p>
        </div>
      </div>
    );
  }

  // Student flow
  const renderStudentForm = () => {
    // Step 1: Enter name
    if (!studentStep) {
      return (
        <form onSubmit={handleStudentNameSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
              您的名字 / 稱呼
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                id="name"
                required
                className="flex-1 px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:ring-0 outline-none transition-all text-lg text-center"
                placeholder="例如：熊天佑"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                autoFocus
              />
              <SpeechInputButton
                onTranscript={handleSpeechTranscript}
                className="flex-shrink-0"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-900 hover:bg-slate-800"
          >
            {loading ? '確認中...' : '下一步'}
          </button>
        </form>
      );
    }

    // Step 2a: Returning user with password - enter password
    if (studentStep === 'password') {
      return (
        <div className="space-y-4">
          <div className="text-center mb-2">
            <p className="text-slate-600 text-sm">歡迎回來，<span className="font-bold">{name}</span></p>
          </div>
          <form onSubmit={handleStudentPasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="student-password" className="block text-sm font-medium text-slate-700 mb-1">
                請輸入密碼
              </label>
              <input
                type="password"
                id="student-password"
                required
                className="w-full px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:ring-0 outline-none transition-all text-lg text-center"
                placeholder="請輸入密碼"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-900 hover:bg-slate-800"
            >
              {loading ? '登入中...' : '確認登入'}
            </button>
          </form>
          <button
            onClick={handleBackToName}
            className="w-full text-slate-500 hover:text-slate-700 text-sm py-2 transition-colors"
          >
            ← 返回輸入名字
          </button>
        </div>
      );
    }

    // Step 2b: New user - setup password option
    if (studentStep === 'setup') {
      return (
        <div className="space-y-4">
          <div className="text-center mb-2">
            <p className="text-slate-600 text-sm">
              歡迎，<span className="font-bold">{name}</span>！<br />
              您可以設定密碼以保護帳號，或直接跳過。
            </p>
          </div>

          <form onSubmit={handleSetupPassword} className="space-y-4">
            <div>
              <label htmlFor="setup-password" className="block text-sm font-medium text-slate-700 mb-1">
                設定密碼
              </label>
              <input
                type="password"
                id="setup-password"
                className="w-full px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:ring-0 outline-none transition-all text-lg text-center"
                placeholder="輸入密碼（選填）"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="setup-email" className="block text-sm font-medium text-slate-700 mb-1">
                電子信箱（選填）
              </label>
              <input
                type="email"
                id="setup-email"
                className="w-full px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:ring-0 outline-none transition-all text-lg text-center"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-900 hover:bg-slate-800"
            >
              {loading ? '設定中...' : '設定密碼並登入'}
            </button>
          </form>

          <button
            onClick={handleSkipPassword}
            disabled={loading}
            className="w-full text-amber-600 hover:text-amber-700 font-medium text-sm py-3 transition-colors border-2 border-amber-200 hover:border-amber-300 rounded-xl"
          >
            跳過，僅用名稱登入
          </button>

          <button
            onClick={handleBackToName}
            className="w-full text-slate-500 hover:text-slate-700 text-sm py-2 transition-colors"
          >
            ← 返回輸入名字
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        backgroundImage: 'url(/BibleInChurch.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/50"></div>
      <div className="relative z-10 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl max-w-md w-full p-8 md:p-12 animate-fadeIn">
        <button
          onClick={handleBackToSelection}
          className="absolute top-4 left-4 text-slate-500 hover:text-slate-700 flex items-center gap-1 text-sm transition-colors"
        >
          <span>←</span>
          <span>返回</span>
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 bg-amber-100">
            👤
          </div>
          <h2 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'serif' }}>
            學生登入
          </h2>
          <p className="text-slate-500 mt-2 text-sm">
            請輸入您的名字開始讀經之旅
          </p>
        </div>

        {renderStudentForm()}

        <p className="mt-6 text-center text-slate-400 text-xs leading-relaxed">
          「⋯⋯這聖經能使你因在基督耶穌裏的信有得救的智慧。」提摩太後書 3:15
        </p>
      </div>
    </div>
  );
};

export default Login;
