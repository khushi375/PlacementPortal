import { useState } from 'react';
import type { FormEvent } from 'react';
import { sendPasswordResetEmail, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, authPersistence } from '../../lib/firebase';
import { api } from '../../services/studentApi';

export function AuthPanel() {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await authPersistence;
      if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email);
        setMessage('Password reset email sent.');
      } else if (mode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await api.post('/student/register', { firebaseUid: user.uid, email: user.email, displayName: displayName || email.split('@')[0] });
        setMessage('Account created successfully. Please sign in.');
        setMode('login');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      console.error('Auth error:', error);
      setMessage('We could not complete that request. Check your details and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand auth-brand">
          <div className="brand-mark">✦</div>
          <div><strong>nexora</strong><span>placement center</span></div>
        </div>
        <p className="eyebrow">Student portal</p>
        <h1>{mode === 'login' ? 'Welcome back.' : mode === 'register' ? 'Create your profile.' : 'Reset your password.'}</h1>
        <p className="muted">{mode === 'reset' ? 'We will send a secure link to your verified email.' : 'Your university placement workspace, in one place.'}</p>
        <form onSubmit={submit}>
          <label>Email address<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          {mode === 'register' && (
            <label>
              Display name
              <input
                type="text"
                required
                minLength={2}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your full name"
              />
            </label>
          )}
          {mode !== 'reset' && <label>Password<input type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} /></label>}
          <button className="dark-button auth-submit" disabled={busy}>{busy ? 'Working...' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link'}</button>
        </form>
        {message && <p className="auth-message">{message}</p>}
        <div className="auth-links">
          {mode === 'login' && <button onClick={() => setMode('reset')}>Forgot password?</button>}
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create a student account' : 'Back to sign in'}</button>
        </div>
      </div>
    </div>
  );
}