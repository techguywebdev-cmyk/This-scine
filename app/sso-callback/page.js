'use client';
import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';
import { TsMark } from '@/components/cine/Splash';

// Google sign-in comes back here, finishes, then continues to where you were
export default function SSOCallback() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#06060B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <TsMark size={64} />
      <AuthenticateWithRedirectCallback signInFallbackRedirectUrl="/" signUpFallbackRedirectUrl="/" continueSignUpUrl="/sign-in" />
    </div>
  );
}
