'use client';
import { useEffect, useRef, useState } from 'react';
import { useSignIn, useSignUp, useClerk } from '@clerk/nextjs';
import { Backdrop, BACKDROP_CSS, DOTS } from './Backdrop';
import { TsMark } from './Splash';

// Thiscene's own sign-in / sign-up (same flow as the phone app):
// Google, or email → password or 6-digit code; new emails create an account; forgot password.

const errText = (e, fallback = 'Something went wrong — try again') => {
  const x = e?.errors?.[0];
  const code = x?.code || '';
  if (code === 'form_password_incorrect') return 'That password isn’t right. Try again, or get a code by email.';
  if (code === 'form_code_incorrect') return 'That code isn’t right — check your email and try again.';
  if (code === 'verification_expired') return 'That code expired. Tap “Send a new code”.';
  if (code === 'form_password_pwned') return 'That password has appeared in a data leak — please pick a different one.';
  if (code === 'form_password_length_too_short' || code === 'form_password_not_strong_enough') return 'Pick a stronger password — at least 8 characters, mixing words and numbers.';
  if (code === 'form_identifier_exists') return 'There’s already an account with that email — sign in instead.';
  if (code === 'too_many_requests') return 'Too many tries — wait a minute and try again.';
  return x?.longMessage || x?.message || e?.message || fallback;
};
const isEmail = (v) => /^\S+@\S+\.\S+$/.test(String(v).trim());

const COPY = {
  start: ['Find it. Watch it. Together.', 'Trailers you’ll actually watch, picks that fit your mood, and your friends on the couch — even when they’re not.'],
  email: ['What’s your email?', 'We’ll check if you already have an account.'],
  password: ['Welcome back', ''],
  signup: ['Create your account', 'One last step — then your feed learns your taste.'],
  code: ['Check your email', ''],
  reset: ['Reset your password', 'Choose a new password for your account.'],
};

const ic = (d, s = 18, c = 'currentColor') => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
const G = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
);

function Field({ icon, right, ...p }) {
  const [f, setF] = useState(false);
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, height: 56, borderRadius: 18, padding: '0 16px', background: f ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)', border: `1px solid ${f ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.16)'}`, transition: 'all .2s ease', color: 'rgba(255,255,255,0.55)' }}>
      {icon}
      <input {...p} onFocus={() => setF(true)} onBlur={() => setF(false)} style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 16, fontFamily: 'inherit' }} />
      {right}
    </label>
  );
}

function Btn({ children, onClick, busy, glass, disabled, type = 'button' }) {
  return (
    <button type={type} onClick={onClick} disabled={busy || disabled} className="auth-btn"
      style={{ height: 56, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 16, fontWeight: 700, fontFamily: 'inherit', cursor: busy || disabled ? 'default' : 'pointer', width: '100%', opacity: disabled && !busy ? 0.45 : 1, ...(glass ? { background: 'rgba(255,255,255,0.07)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' } : { background: '#fff', color: '#06060B', border: 'none' }) }}>
      {busy ? <span style={{ width: 20, height: 20, borderRadius: '50%', border: `2.5px solid ${glass ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)'}`, borderTopColor: glass ? '#fff' : '#06060B', animation: 'bdSpin .8s linear infinite' }} /> : children}
    </button>
  );
}

function CodeBoxes({ value, onChange, onDone, accent }) {
  const ref = useRef(null);
  useEffect(() => { const t = setTimeout(() => ref.current?.focus(), 300); return () => clearTimeout(t); }, []);
  return (
    <div onClick={() => ref.current?.focus()} style={{ position: 'relative', display: 'flex', gap: 8, justifyContent: 'center', cursor: 'text' }}>
      {Array.from({ length: 6 }, (_, i) => {
        const ch = value[i] || '';
        const active = i === Math.min(value.length, 5);
        return (
          <div key={i} style={{ width: 50, height: 60, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? `${accent}14` : 'rgba(255,255,255,0.05)', border: `1.5px solid ${active ? accent : ch ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.16)'}`, transition: 'all .2s ease', fontFamily: "var(--font-display), 'Inter Tight', sans-serif", fontSize: 24, fontWeight: 800 }}>
            {ch || (active ? <span style={{ width: 2, height: 24, background: accent, animation: 'authBlink 1s steps(2) infinite' }} /> : null)}
          </div>
        );
      })}
      <input ref={ref} value={value} inputMode="numeric" autoComplete="one-time-code" aria-label="6-digit code" maxLength={6}
        onChange={(e) => { const d = e.target.value.replace(/\D/g, '').slice(0, 6); onChange(d); if (d.length === 6) onDone?.(d); }}
        style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', fontSize: 16 }} />
    </div>
  );
}

export default function AuthScreen({ onClose, redirect = '/', page = false }) {
  const { isLoaded: inLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: upLoaded, signUp } = useSignUp();
  const clerk = useClerk();
  const [step, setStep] = useState('start');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [code, setCode] = useState('');
  const [codeFor, setCodeFor] = useState(null);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [k, setK] = useState(0);
  const [accent, setAccent] = useState(DOTS[0]);

  useEffect(() => { let i = 0; const t = setInterval(() => { i = (i + 1) % DOTS.length; setAccent(DOTS[i]); }, 2600); return () => clearInterval(t); }, []);
  useEffect(() => { const f = (e) => { if (e.key === 'Escape' && !page) onClose?.(); }; window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f); }, [onClose, page]);

  const go = (s) => { setErr(''); setOk(''); setStep(s); setK((x) => x + 1); };
  const fail = (e, f) => { if (navigator.vibrate) navigator.vibrate(30); setOk(''); setErr(errText(e, f)); };
  const finish = async (sessionId) => {
    await setActive({ session: sessionId });
    if (page) window.location.replace(redirect || '/');
    else onClose?.();
  };

  const google = async () => {
    setBusy('google');
    try { await signIn.authenticateWithRedirect({ strategy: 'oauth_google', redirectUrl: '/sso-callback', redirectUrlComplete: redirect || '/' }); }
    catch (e) { fail(e, 'Google sign-in didn’t start — try email instead'); setBusy(null); }
  };
  const checkEmail = async (e) => {
    e?.preventDefault();
    if (!inLoaded || !isEmail(email)) { setErr('Enter a valid email address'); return; }
    setBusy('email'); setErr('');
    try { await signIn.create({ identifier: email.trim() }); go('password'); }
    catch (x) { if (x?.errors?.[0]?.code === 'form_identifier_not_found') go('signup'); else fail(x); }
    setBusy(null);
  };
  const sendSignInCode = async () => {
    setBusy('code');
    try {
      const f = (signIn.supportedFirstFactors || []).find((x) => x.strategy === 'email_code');
      await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: f?.emailAddressId });
      setCode(''); setCodeFor('signin'); go('code');
    } catch (x) { fail(x); }
    setBusy(null);
  };
  const withPassword = async (e) => {
    e?.preventDefault();
    if (!password) return;
    setBusy('password'); setErr('');
    try {
      const r = await signIn.attemptFirstFactor({ strategy: 'password', password });
      if (r.status === 'complete') await finish(r.createdSessionId);
      else if (r.status === 'needs_second_factor' || r.status === 'needs_client_trust') { await signIn.prepareSecondFactor({ strategy: 'email_code' }); setCode(''); setCodeFor('second'); go('code'); }
      else setErr('One more step is needed — use “Email me a code” instead');
    } catch (x) { fail(x); }
    setBusy(null);
  };
  const createAccount = async (e) => {
    e?.preventDefault();
    if (!upLoaded || password.length < 8) { setErr('Use at least 8 characters for your password'); return; }
    setBusy('signup'); setErr('');
    try {
      await signUp.create({ emailAddress: email.trim(), password, ...(name.trim() ? { firstName: name.trim() } : {}) });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setCode(''); setCodeFor('signup'); go('code');
    } catch (x) { fail(x); }
    setBusy(null);
  };
  const verify = async (c = code) => {
    if (c.length < 6) return;
    if (codeFor === 'reset') { go('reset'); return; }
    setBusy('verify'); setErr('');
    try {
      let r;
      if (codeFor === 'signup') r = await signUp.attemptEmailAddressVerification({ code: c });
      else if (codeFor === 'second') r = await signIn.attemptSecondFactor({ strategy: 'email_code', code: c });
      else r = await signIn.attemptFirstFactor({ strategy: 'email_code', code: c });
      if (r.status === 'complete') await finish(r.createdSessionId);
      else if (r.status === 'needs_second_factor') { await signIn.prepareSecondFactor({ strategy: 'email_code' }); setCode(''); setCodeFor('second'); }
      else setErr('Almost there — something else is needed. Try “Continue with Google” or contact us.');
    } catch (x) { setCode(''); fail(x); }
    setBusy(null);
  };
  const resend = async () => {
    setErr('');
    try {
      if (codeFor === 'signup') await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      else if (codeFor === 'second') await signIn.prepareSecondFactor({ strategy: 'email_code' });
      else if (codeFor === 'reset') await signIn.create({ strategy: 'reset_password_email_code', identifier: email.trim() });
      else { const f = (signIn.supportedFirstFactors || []).find((x) => x.strategy === 'email_code'); await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: f?.emailAddressId }); }
      setOk('New code sent ✓');
    } catch (x) { fail(x); }
  };
  const forgot = async () => {
    setBusy('forgot');
    try { await signIn.create({ strategy: 'reset_password_email_code', identifier: email.trim() }); setCode(''); setPassword(''); setCodeFor('reset'); go('code'); }
    catch (x) { fail(x); }
    setBusy(null);
  };
  const resetPassword = async (e) => {
    e?.preventDefault();
    if (password.length < 8) { setErr('Use at least 8 characters'); return; }
    setBusy('reset'); setErr('');
    try {
      const r = await signIn.attemptFirstFactor({ strategy: 'reset_password_email_code', code, password });
      if (r.status === 'complete') await finish(r.createdSessionId);
      else if (r.status === 'needs_second_factor') { await signIn.prepareSecondFactor({ strategy: 'email_code' }); setCode(''); setCodeFor('second'); go('code'); }
    } catch (x) { fail(x); if (x?.errors?.[0]?.code === 'form_code_incorrect') go('code'); }
    setBusy(null);
  };
  const back = () => {
    if (step === 'start') { if (page) window.location.assign('/'); else onClose?.(); return; }
    if (step === 'email') go('start');
    else if (step === 'code' || step === 'reset') go(codeFor === 'signup' ? 'signup' : 'password');
    else go('email');
  };

  const [title, sub] = COPY[step];
  const subtitle = step === 'password' ? email.trim() : step === 'code' ? `We sent a 6-digit code to ${email.trim()}` : sub;
  const eye = <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex' }}>{ic(show ? <><path d="M17.94 17.94A10 10 0 0 1 12 20c-7 0-11-8-11-8a18 18 0 0 1 5.06-5.94M9.9 4.24A9 9 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.16 3.19M1 1l22 22" /></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>, 17)}</button>;
  const strength = [1, 6, 8, 12].filter((n) => password.length >= n).length;
  const link = { background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'center', marginTop: 4, padding: 4 };

  return (
    <div role="dialog" aria-label="Sign in to Thiscene" style={{ position: 'fixed', inset: 0, zIndex: 900, background: '#06060B', color: '#fff', fontFamily: "var(--font-sans), system-ui, sans-serif", display: 'flex', justifyContent: 'center', overflow: 'hidden', animation: page ? 'none' : 'authIn .3s ease' }}>
      <style>{BACKDROP_CSS + '@keyframes authIn{from{opacity:0}to{opacity:1}}@keyframes authBlink{50%{opacity:0}}.auth-btn{transition:transform .12s ease}.auth-btn:active{transform:scale(.97)}'}</style>
      <Backdrop height={step === 'start' ? '64%' : '42%'} rows={4} />
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 20%, rgba(6,6,11,0.85) ${step === 'start' ? 48 : 34}%, #06060B ${step === 'start' ? 62 : 46}%)`, transition: 'background .4s ease', pointerEvents: 'none' }} />
      <button onClick={back} aria-label={step === 'start' ? 'Close' : 'Back'} style={{ position: 'absolute', top: 'max(16px, env(safe-area-inset-top))', left: 16, zIndex: 2, width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.16)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {ic(step === 'start' ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M19 12H5M12 19l-7-7 7-7" />, 19)}
      </button>

      <div style={{ position: 'relative', width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 24px calc(28px + env(safe-area-inset-bottom))', overflowY: 'auto' }}>
        <div key={k} style={{ animation: 'bdUp .4s cubic-bezier(.2,.8,.2,1) both' }}>
          {step === 'start' && <div style={{ marginBottom: 18 }}><TsMark size={52} /></div>}
          <h1 style={{ margin: 0, fontFamily: "var(--font-display), 'Inter Tight', system-ui, sans-serif", fontSize: step === 'start' ? 40 : 31, lineHeight: 1.06, fontWeight: 800, letterSpacing: '-0.035em' }}>{title}</h1>
          {subtitle && <p style={{ margin: '10px 0 0', fontSize: 15.5, lineHeight: 1.55, color: 'rgba(255,255,255,0.65)' }}>{subtitle}</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 26 }}>
            {step === 'start' && (
              <>
                <Btn onClick={google} busy={busy === 'google'}><G />Continue with Google</Btn>
                <Btn glass onClick={() => go('email')}>{ic(<><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></>)}Continue with email</Btn>
              </>
            )}
            {step === 'email' && (
              <form onSubmit={checkEmail} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field icon={ic(<><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></>, 17)} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" autoFocus />
                <Btn type="submit" busy={busy === 'email'} disabled={!isEmail(email)}>Continue</Btn>
              </form>
            )}
            {step === 'password' && (
              <form onSubmit={withPassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field icon={ic(<><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>, 17)} type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" autoFocus right={eye} />
                <Btn type="submit" busy={busy === 'password'} disabled={!password}>Sign in</Btn>
                <Btn glass onClick={sendSignInCode} busy={busy === 'code'}>Email me a code instead</Btn>
                <button type="button" onClick={forgot} style={link}>{busy === 'forgot' ? 'Sending…' : 'Forgot password?'}</button>
              </form>
            )}
            {step === 'signup' && (
              <form onSubmit={createAccount} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field icon={ic(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>, 17)} value={name} onChange={(e) => setName(e.target.value)} placeholder="First name (optional)" autoComplete="given-name" />
                <Field icon={ic(<><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>, 17)} type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password (8+ characters)" autoComplete="new-password" right={eye} />
                <div style={{ display: 'flex', gap: 6, padding: '0 4px' }}>{[0, 1, 2, 3].map((i) => <span key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < strength ? ['#FF6B8A', '#F5A623', '#A3E635', '#2DD4BF'][strength - 1] : 'rgba(255,255,255,0.12)', transition: 'background .25s ease' }} />)}</div>
                <Btn type="submit" busy={busy === 'signup'} disabled={password.length < 8}>Create account</Btn>
                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>Signing up as <b style={{ color: '#fff', fontWeight: 600 }}>{email.trim()}</b></div>
              </form>
            )}
            {step === 'code' && (
              <>
                <CodeBoxes value={code} onChange={setCode} onDone={verify} accent={accent} />
                <Btn onClick={() => verify()} busy={busy === 'verify'} disabled={code.length < 6}>{codeFor === 'reset' ? 'Continue' : 'Verify'}</Btn>
                <button type="button" onClick={resend} style={link}>Send a new code</button>
              </>
            )}
            {step === 'reset' && (
              <form onSubmit={resetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field icon={ic(<><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>, 17)} type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (8+ characters)" autoComplete="new-password" autoFocus right={eye} />
                <Btn type="submit" busy={busy === 'reset'} disabled={password.length < 8}>Save and sign in</Btn>
              </form>
            )}
          </div>

          {(err || ok) && <div role="alert" style={{ fontSize: 13.5, lineHeight: 1.45, color: ok ? '#7BFF9E' : '#FF8FA3', marginTop: 14, textAlign: 'center' }}>{ok || err}</div>}
          {/* Clerk's bot check renders here when it's needed */}
          <div id="clerk-captcha" style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }} />
          {step === 'start' && (
            <div style={{ fontSize: 12, lineHeight: 1.5, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: 18 }}>
              By continuing you agree to our <a href="/terms" target="_blank" rel="noopener" style={{ color: 'rgba(255,255,255,0.8)' }}>Terms</a> and <a href="/privacy" target="_blank" rel="noopener" style={{ color: 'rgba(255,255,255,0.8)' }}>Privacy Policy</a>.
            </div>
          )}
          {step === 'start' && clerk?.openSignIn && (
            <button type="button" onClick={() => { clerk.openSignIn(); onClose?.(); }} style={{ ...link, display: 'block', margin: '10px auto 0', fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Having trouble? Use the standard sign-in</button>
          )}
        </div>
      </div>
    </div>
  );
}
