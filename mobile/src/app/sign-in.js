import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useAuth, useSSO } from '@clerk/expo';
import { useSignIn, useSignUp } from '@clerk/expo/legacy';
import { AuthView } from '@clerk/expo/native';
import Marquee from '../components/PosterMarquee';
import { CyclingGlow, usePosters } from '../components/StatusScreen';
import { TsLoader, DOTS } from '../components/Brand';
import { API_URL } from '../lib/config';
import { F, T } from '../lib/theme';

WebBrowser.maybeCompleteAuthSession();

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
const isEmail = (v) => /^\S+@\S+\.\S+$/.test(v.trim());

// Six boxes over one hidden field, so pasting and SMS/email autofill both work
function CodeBoxes({ value, onChange, accent, onDone }) {
  const ref = useRef(null);
  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => { const l = Animated.loop(Animated.sequence([Animated.timing(blink, { toValue: 0.2, duration: 500, useNativeDriver: true }), Animated.timing(blink, { toValue: 1, duration: 500, useNativeDriver: true })])); l.start(); return () => l.stop(); }, [blink]);
  useEffect(() => { const t = setTimeout(() => ref.current?.focus(), 350); return () => clearTimeout(t); }, []);
  return (
    <Pressable onPress={() => ref.current?.focus()} style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
      {Array.from({ length: 6 }, (_, i) => {
        const ch = value[i] || '';
        const active = i === Math.min(value.length, 5);
        return (
          <View key={i} style={[styles.cell, ch ? { borderColor: 'rgba(255,255,255,0.4)' } : null, active && { borderColor: accent, backgroundColor: `${accent}14` }]}>
            {ch ? <Text style={styles.cellText}>{ch}</Text> : active ? <Animated.View style={{ width: 2, height: 24, backgroundColor: accent, opacity: blink }} /> : null}
          </View>
        );
      })}
      <TextInput ref={ref} value={value} onChangeText={(v) => { const d = v.replace(/\D/g, '').slice(0, 6); onChange(d); if (d.length === 6) onDone?.(d); }} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }} />
    </Pressable>
  );
}

function Field({ icon, right, ...props }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={[styles.field, focus && { borderColor: 'rgba(255,255,255,0.45)', backgroundColor: 'rgba(255,255,255,0.08)' }]}>
      <Feather name={icon} size={17} color="rgba(255,255,255,0.55)" />
      <TextInput {...props} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} placeholderTextColor="rgba(255,255,255,0.38)" style={styles.input} />
      {right}
    </View>
  );
}

function Btn({ label, onPress, busy, kind = 'primary', icon, disabled }) {
  const s = useRef(new Animated.Value(1)).current;
  const press = (v) => Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 40 }).start();
  const primary = kind === 'primary';
  return (
    <Animated.View style={{ transform: [{ scale: s }] }}>
      <Pressable onPressIn={() => press(0.97)} onPressOut={() => press(1)} onPress={onPress} disabled={busy || disabled} style={[styles.btn, primary ? styles.btnPrimary : styles.btnGlass, (disabled && !busy) && { opacity: 0.45 }]}>
        {busy ? <ActivityIndicator color={primary ? '#06060B' : '#fff'} /> : (
          <>
            {icon}
            <Text style={[styles.btnText, { color: primary ? '#06060B' : '#fff' }]}>{label}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const GoogleG = () => (
  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' }}>
    <Text style={{ fontFamily: F.displayHeavy, fontSize: 14, color: '#4285F4', marginTop: -1 }}>G</Text>
  </View>
);

const COPY = {
  start: ['Find it. Watch it.\nTogether.', 'Trailers you’ll actually watch, picks that fit your mood, and your friends on the couch — even when they’re not.'],
  email: ['What’s your email?', 'We’ll check if you already have an account.'],
  password: ['Welcome back', ''],
  signup: ['Create your account', 'One last step — then your feed learns your taste.'],
  code: ['Check your email', ''],
  reset: ['Reset your password', ''],
};

export default function SignIn() {
  const { isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const posters = usePosters(24);
  const { isLoaded: inLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: upLoaded, signUp } = useSignUp();
  const { startSSOFlow } = useSSO();
  const [step, setStep] = useState('start');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [code, setCode] = useState('');
  const [codeFor, setCodeFor] = useState(null); // signin | signup | second | reset
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState('');
  const [fallback, setFallback] = useState(false);
  const [accent, setAccent] = useState(DOTS[0]);
  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => { if (isSignedIn) { router.canGoBack() ? router.back() : router.replace('/'); } }, [isSignedIn]);
  useEffect(() => { if (Platform.OS === 'android') { WebBrowser.warmUpAsync().catch(() => {}); return () => { WebBrowser.coolDownAsync().catch(() => {}); }; } return undefined; }, []);
  useEffect(() => { let i = 0; const t = setInterval(() => { i = (i + 1) % DOTS.length; setAccent(DOTS[i]); }, 2600); return () => clearInterval(t); }, []);

  const go = (next) => {
    setErr('');
    Animated.timing(anim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      setStep(next);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 9, tension: 70 }).start();
    });
  };
  const fail = (e, f) => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); const code = e?.errors?.[0]?.code || ''; if (/captcha/i.test(code)) { setFallback(true); return; } setErr(errText(e, f)); };
  const done = async (sessionId) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await setActive({ session: sessionId });
  };

  const google = async () => {
    setBusy('google'); setErr('');
    try {
      const r = await startSSOFlow({ strategy: 'oauth_google', redirectUrl: AuthSession.makeRedirectUri({ scheme: 'thiscene', path: 'sso-callback' }) });
      if (r.createdSessionId) await (r.setActive || setActive)({ session: r.createdSessionId });
    } catch (e) { fail(e, 'Google sign-in didn’t finish — try again or use email'); }
    setBusy(null);
  };

  const checkEmail = async () => {
    if (!inLoaded || !isEmail(email)) { setErr('Enter a valid email address'); return; }
    setBusy('email'); setErr('');
    try {
      await signIn.create({ identifier: email.trim() });
      go('password');
    } catch (e) {
      const c = e?.errors?.[0]?.code;
      if (c === 'form_identifier_not_found') go('signup');
      else fail(e);
    }
    setBusy(null);
  };

  const sendSignInCode = async () => {
    setBusy('code'); setErr('');
    try {
      const f = (signIn.supportedFirstFactors || []).find((x) => x.strategy === 'email_code');
      await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: f?.emailAddressId });
      setCode(''); setCodeFor('signin'); go('code');
    } catch (e) { fail(e); }
    setBusy(null);
  };

  const withPassword = async () => {
    if (!password) { setErr('Enter your password'); return; }
    setBusy('password'); setErr('');
    try {
      const r = await signIn.attemptFirstFactor({ strategy: 'password', password });
      if (r.status === 'complete') await done(r.createdSessionId);
      else if (r.status === 'needs_second_factor' || r.status === 'needs_client_trust') {
        await signIn.prepareSecondFactor({ strategy: 'email_code' });
        setCode(''); setCodeFor('second'); go('code');
      } else setErr('One more step is needed — use “Email me a code” instead');
    } catch (e) { fail(e); }
    setBusy(null);
  };

  const createAccount = async () => {
    if (!upLoaded) return;
    if (password.length < 8) { setErr('Use at least 8 characters for your password'); return; }
    setBusy('signup'); setErr('');
    try {
      await signUp.create({ emailAddress: email.trim(), password, ...(name.trim() ? { firstName: name.trim() } : {}) });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setCode(''); setCodeFor('signup'); go('code');
    } catch (e) { fail(e); }
    setBusy(null);
  };

  const verify = async (c = code) => {
    if (c.length < 6) return;
    setBusy('verify'); setErr('');
    try {
      if (codeFor === 'signup') {
        const r = await signUp.attemptEmailAddressVerification({ code: c });
        if (r.status === 'complete') await done(r.createdSessionId);
        else setErr('Almost there — please finish on the standard sign-up screen'), setFallback(true);
      } else if (codeFor === 'second') {
        const r = await signIn.attemptSecondFactor({ strategy: 'email_code', code: c });
        if (r.status === 'complete') await done(r.createdSessionId);
      } else if (codeFor === 'reset') {
        go('reset');
      } else {
        const r = await signIn.attemptFirstFactor({ strategy: 'email_code', code: c });
        if (r.status === 'complete') await done(r.createdSessionId);
        else if (r.status === 'needs_second_factor') { await signIn.prepareSecondFactor({ strategy: 'email_code' }); setCode(''); setCodeFor('second'); }
      }
    } catch (e) { setCode(''); fail(e); }
    setBusy(null);
  };

  const resend = async () => {
    setErr('');
    try {
      if (codeFor === 'signup') await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      else if (codeFor === 'second') await signIn.prepareSecondFactor({ strategy: 'email_code' });
      else if (codeFor === 'reset') await signIn.create({ strategy: 'reset_password_email_code', identifier: email.trim() });
      else { const f = (signIn.supportedFirstFactors || []).find((x) => x.strategy === 'email_code'); await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: f?.emailAddressId }); }
      Haptics.selectionAsync().catch(() => {});
      setErr('New code sent ✓');
    } catch (e) { fail(e); }
  };

  const forgot = async () => {
    setBusy('forgot'); setErr('');
    try {
      await signIn.create({ strategy: 'reset_password_email_code', identifier: email.trim() });
      setCode(''); setPassword(''); setCodeFor('reset'); go('code');
    } catch (e) { fail(e); }
    setBusy(null);
  };

  const resetPassword = async () => {
    if (password.length < 8) { setErr('Use at least 8 characters'); return; }
    setBusy('reset'); setErr('');
    try {
      const r = await signIn.attemptFirstFactor({ strategy: 'reset_password_email_code', code, password });
      if (r.status === 'complete') await done(r.createdSessionId);
      else if (r.status === 'needs_second_factor') { await signIn.prepareSecondFactor({ strategy: 'email_code' }); setCode(''); setCodeFor('second'); go('code'); }
    } catch (e) { fail(e); if (e?.errors?.[0]?.code === 'form_code_incorrect') go('code'); }
    setBusy(null);
  };

  const back = () => {
    if (step === 'start') { router.canGoBack() ? router.back() : router.replace('/'); return; }
    if (step === 'email') go('start');
    else if (step === 'code' || step === 'reset') go(codeFor === 'signup' ? 'signup' : 'password');
    else go('email');
  };

  // Clerk's own screen as a safety net (e.g. if a security check needs it)
  if (fallback) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg }}>
        <AuthView mode="signInOrUp" isDismissible onDismiss={() => setFallback(false)} />
      </View>
    );
  }

  const [title, sub] = COPY[step];
  const subtitle = step === 'password' ? email.trim() : step === 'code' ? `We sent a 6-digit code to ${email.trim()}` : step === 'reset' ? 'Choose a new password for your account.' : sub;
  const big = Math.max(width, height) * 1.2;
  const slide = { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] };

  return (
    <View style={{ flex: 1, backgroundColor: '#06060B' }}>
      <CyclingGlow size={big} cx={0} cy={0} />
      <CyclingGlow size={big} cx={width} cy={height} strength={0.7} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: height * (step === 'start' ? 0.62 : 0.4) }}>
        <Marquee posters={posters} rows={4} size={88} />
      </View>
      <LinearGradient pointerEvents="none" colors={['transparent', 'rgba(6,6,11,0.85)', '#06060B']} locations={[0.2, step === 'start' ? 0.5 : 0.36, step === 'start' ? 0.62 : 0.46]} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={back} hitSlop={10} style={styles.topBtn} accessibilityLabel={step === 'start' ? 'Close' : 'Back'}>
            <Feather name={step === 'start' ? 'x' : 'arrow-left'} size={19} color="#fff" />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View style={slide}>
            {step === 'start' ? <View style={{ alignItems: 'flex-start', marginBottom: 18 }}><TsLoader size={46} /></View> : null}
            <Text style={[styles.title, step === 'start' && { fontSize: 38, lineHeight: 41 }]}>{title}</Text>
            {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}

            <View style={{ gap: 12, marginTop: 26 }}>
              {step === 'start' ? (
                <>
                  <Btn label="Continue with Google" onPress={google} busy={busy === 'google'} icon={<GoogleG />} />
                  <Btn kind="glass" label="Continue with email" onPress={() => go('email')} icon={<Feather name="mail" size={18} color="#fff" />} />
                </>
              ) : null}

              {step === 'email' ? (
                <>
                  <Field icon="mail" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" autoFocus returnKeyType="next" onSubmitEditing={checkEmail} />
                  <Btn label="Continue" onPress={checkEmail} busy={busy === 'email'} disabled={!isEmail(email)} />
                </>
              ) : null}

              {step === 'password' ? (
                <>
                  <Field icon="lock" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry={!show} autoComplete="password" autoFocus returnKeyType="go" onSubmitEditing={withPassword}
                    right={<Pressable onPress={() => setShow((v) => !v)} hitSlop={8}><Feather name={show ? 'eye-off' : 'eye'} size={17} color="rgba(255,255,255,0.6)" /></Pressable>} />
                  <Btn label="Sign in" onPress={withPassword} busy={busy === 'password'} disabled={!password} />
                  <Btn kind="glass" label="Email me a code instead" onPress={sendSignInCode} busy={busy === 'code'} />
                  <Pressable onPress={forgot} hitSlop={8} style={{ alignSelf: 'center', marginTop: 4 }}>{busy === 'forgot' ? <ActivityIndicator color="#fff" /> : <Text style={styles.link}>Forgot password?</Text>}</Pressable>
                </>
              ) : null}

              {step === 'signup' ? (
                <>
                  <Field icon="user" value={name} onChangeText={setName} placeholder="First name (optional)" autoComplete="given-name" autoCapitalize="words" returnKeyType="next" />
                  <Field icon="lock" value={password} onChangeText={setPassword} placeholder="Create a password (8+ characters)" secureTextEntry={!show} autoComplete="new-password" returnKeyType="go" onSubmitEditing={createAccount}
                    right={<Pressable onPress={() => setShow((v) => !v)} hitSlop={8}><Feather name={show ? 'eye-off' : 'eye'} size={17} color="rgba(255,255,255,0.6)" /></Pressable>} />
                  <View style={styles.meter}>{[0, 1, 2, 3].map((i) => <View key={i} style={[styles.meterBar, { backgroundColor: password.length >= [1, 6, 8, 12][i] ? ['#FF6B8A', '#F5A623', '#A3E635', '#2DD4BF'][Math.min(3, [1, 6, 8, 12].filter((n) => password.length >= n).length - 1)] : 'rgba(255,255,255,0.12)' }]} />)}</View>
                  <Btn label="Create account" onPress={createAccount} busy={busy === 'signup'} disabled={password.length < 8} />
                  <Text style={styles.small}>Signing up as <Text style={{ color: '#fff', fontFamily: F.semibold }}>{email.trim()}</Text></Text>
                </>
              ) : null}

              {step === 'code' ? (
                <>
                  <CodeBoxes value={code} onChange={setCode} accent={accent} onDone={(c) => (codeFor === 'reset' ? go('reset') : verify(c))} />
                  <Btn label={codeFor === 'reset' ? 'Continue' : 'Verify'} onPress={() => (codeFor === 'reset' ? go('reset') : verify())} busy={busy === 'verify'} disabled={code.length < 6} />
                  <Pressable onPress={resend} hitSlop={8} style={{ alignSelf: 'center', marginTop: 4 }}><Text style={styles.link}>Send a new code</Text></Pressable>
                </>
              ) : null}

              {step === 'reset' ? (
                <>
                  <Field icon="lock" value={password} onChangeText={setPassword} placeholder="New password (8+ characters)" secureTextEntry={!show} autoComplete="new-password" autoFocus returnKeyType="go" onSubmitEditing={resetPassword}
                    right={<Pressable onPress={() => setShow((v) => !v)} hitSlop={8}><Feather name={show ? 'eye-off' : 'eye'} size={17} color="rgba(255,255,255,0.6)" /></Pressable>} />
                  <Btn label="Save and sign in" onPress={resetPassword} busy={busy === 'reset'} disabled={password.length < 8} />
                </>
              ) : null}
            </View>

            {err ? <Text style={[styles.err, /✓/.test(err) && { color: '#7BFF9E' }]}>{err}</Text> : null}

            {step === 'start' ? (
              <Text style={styles.terms}>
                By continuing you agree to our <Text style={styles.termsLink} onPress={() => Linking.openURL(`${API_URL}/terms`).catch(() => {})}>Terms</Text> and <Text style={styles.termsLink} onPress={() => Linking.openURL(`${API_URL}/privacy`).catch(() => {})}>Privacy Policy</Text>.
              </Text>
            ) : null}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 0, right: 0, top: 0, zIndex: 5, paddingHorizontal: 18, flexDirection: 'row' },
  topBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  title: { fontFamily: F.displayHeavy, fontSize: 30, lineHeight: 34, letterSpacing: -0.8, color: '#fff' },
  sub: { fontFamily: F.body, fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.65)', marginTop: 10 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 56, borderRadius: 18, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  input: { flex: 1, color: '#fff', fontFamily: F.body, fontSize: 16, paddingVertical: 0 },
  btn: { height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnPrimary: { backgroundColor: '#fff' },
  btnGlass: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  btnText: { fontFamily: F.bold, fontSize: 16 },
  link: { fontFamily: F.semibold, fontSize: 14, color: 'rgba(255,255,255,0.75)', textDecorationLine: 'underline' },
  err: { fontFamily: F.body, fontSize: 13.5, color: '#FF8FA3', marginTop: 14, textAlign: 'center', lineHeight: 19 },
  small: { fontFamily: F.body, fontSize: 12.5, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  terms: { fontFamily: F.body, fontSize: 12, lineHeight: 18, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: 22 },
  termsLink: { color: 'rgba(255,255,255,0.8)', textDecorationLine: 'underline' },
  cell: { width: 48, height: 58, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.16)' },
  cellText: { fontFamily: F.displayHeavy, fontSize: 24, color: '#fff' },
  meter: { flexDirection: 'row', gap: 6, paddingHorizontal: 4 },
  meterBar: { flex: 1, height: 4, borderRadius: 2 },
});
