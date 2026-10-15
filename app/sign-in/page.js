'use client';
import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import AuthScreen from '@/components/cine/AuthScreen';

export default function SignInPage() {
  const { isSignedIn } = useAuth();
  const redirect = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirect_url') || new URLSearchParams(window.location.search).get('redirect') || '/' : '/';
  const safe = redirect.startsWith('/') || redirect.startsWith(typeof window !== 'undefined' ? window.location.origin : '') ? redirect : '/';
  useEffect(() => { if (isSignedIn) window.location.replace(safe); }, [isSignedIn, safe]);
  return <AuthScreen page redirect={safe} />;
}
