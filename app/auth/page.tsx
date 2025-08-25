'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import SignInForm from '@/components/auth/SignInForm';
import SignUpForm from '@/components/auth/SignUpForm';
import { Building2 } from 'lucide-react';

type AuthMode = 'signin' | 'signup';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Building2 className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tax Deed Platform
          </h1>
          <p className="text-gray-600">
            {mode === 'signin' 
              ? 'Sign in to continue your investment journey' 
              : 'Join thousands of successful real estate investors'
            }
          </p>
        </div>

        {/* Auth Forms */}
        {mode === 'signin' ? (
          <SignInForm
            onSwitchToSignUp={() => setMode('signup')}
            onForgotPassword={() => {
              // TODO: Implement forgot password flow
              alert('Forgot password functionality coming soon!');
            }}
          />
        ) : (
          <SignUpForm
            onSwitchToSignIn={() => setMode('signin')}
          />
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            By continuing, you agree to our{' '}
            <a href="#" className="text-primary hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-primary hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
