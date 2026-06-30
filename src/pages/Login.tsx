import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Rocket, ShieldAlert, ArrowRight, Chrome, Github, Terminal } from 'lucide-react';

export default function Login() {
  const { 
    isAuthenticated, 
    providers, 
    loginWithGoogle, 
    loginWithGitHub, 
    devLogin 
  } = useAuth();

  const [searchParams] = useSearchParams();
  const errorParam = searchParams.get('error');

  const [devEmail, setDevEmail] = useState('');
  const [devName, setDevName] = useState('');
  const [devError, setDevError] = useState<string | null>(null);
  const [devLoading, setDevLoading] = useState(false);

  // If already logged in, redirect to primary dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleDevSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devEmail || !devName) {
      setDevError('Name and email are required for Developer authentication.');
      return;
    }
    setDevLoading(true);
    setDevError(null);
    try {
      await devLogin(devEmail, devName);
    } catch (err: any) {
      setDevError(err.message || 'Developer login failed.');
    } finally {
      setDevLoading(false);
    }
  };

  // Check if at least one OAuth provider is online
  const oauthActive = providers.google || providers.github;

  return (
    <div id="login-page-wrapper" className="min-h-screen bg-[#F1EFE8] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center space-x-2.5">
          <Rocket className="w-10 h-10 text-[#534AB7]" />
          <span className="font-sans font-extrabold text-3xl tracking-tight text-[#2C2C2A]">DeployCost</span>
        </div>
        <h2 className="mt-6 text-center font-sans font-bold text-lg text-gray-500">
          Cloud Deploy Cost Estimator for Teams
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-[#d8d5cb] sm:rounded-lg sm:px-10 space-y-6">
          
          {/* Display URL query OAuth errors */}
          {errorParam && (
            <div id="oauth-error-banner" className="bg-red-50 border-l-4 border-red-500 p-4 rounded flex items-start space-x-3">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <p className="font-sans font-semibold text-xs text-red-800">Authentication Failed</p>
                <p className="font-sans text-[11px] text-red-700 mt-0.5">
                  The OAuth transaction could not complete. {errorParam === 'google_auth_failed' ? 'Google authentication failed.' : 'GitHub authentication failed.'}
                </p>
              </div>
            </div>
          )}

          {/* OAuth Buttons Section */}
          <div className="space-y-3">
            {providers.google && (
              <button
                id="btn-login-google"
                onClick={loginWithGoogle}
                className="w-full flex justify-center items-center space-x-2.5 px-4 py-3 border border-[#d8d5cb] rounded-lg bg-white text-gray-dark hover:bg-gray-50 transition-colors font-sans font-semibold text-sm"
              >
                <Chrome className="w-4 h-4 text-red-500" />
                <span>Continue with Google</span>
              </button>
            )}

            {providers.github && (
              <button
                id="btn-login-github"
                onClick={loginWithGitHub}
                className="w-full flex justify-center items-center space-x-2.5 px-4 py-3 border border-[#d8d5cb] rounded-lg bg-[#24292e] text-white hover:bg-[#24292e]/90 transition-colors font-sans font-semibold text-sm"
              >
                <Github className="w-4 h-4" />
                <span>Continue with GitHub</span>
              </button>
            )}

            {!oauthActive && (
              <div className="text-center py-2 px-3 bg-amber-50 rounded border border-amber-200">
                <p className="font-sans text-[11px] text-[#BA7517] leading-relaxed">
                  ⚠️ No live OAuth applications are currently configured on the backend. Please use the developer sandbox credential form below.
                </p>
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="relative flex items-center justify-center">
            <div className="absolute w-full border-t border-[#d8d5cb]" />
            <span className="relative bg-white px-3 font-sans text-[11px] text-gray-400 font-medium uppercase tracking-wider">
              Sandbox Testing
            </span>
          </div>

          {/* Sandbox Local Dev Form */}
          <form id="dev-login-form" onSubmit={handleDevSubmit} className="space-y-4">
            {devError && (
              <p className="text-red-500 font-sans text-xs text-center">{devError}</p>
            )}
            
            <div className="space-y-1">
              <label htmlFor="dev-email-input" className="block font-sans text-xs font-semibold text-gray-500">
                Developer Sandbox Email
              </label>
              <input
                id="dev-email-input"
                type="email"
                placeholder="developer@company.com"
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
                className="w-full border border-[#d8d5cb] rounded-lg px-3 py-2 text-sm font-sans focus:outline-none focus:border-purple"
                required
              />
              <span className="font-sans text-[9px] text-gray-400">
                Email determines domain organization groupings (e.g., @company.com)
              </span>
            </div>

            <div className="space-y-1">
              <label htmlFor="dev-name-input" className="block font-sans text-xs font-semibold text-gray-500">
                Full Name
              </label>
              <input
                id="dev-name-input"
                type="text"
                placeholder="Sridhar Patil"
                value={devName}
                onChange={(e) => setDevName(e.target.value)}
                className="w-full border border-[#d8d5cb] rounded-lg px-3 py-2 text-sm font-sans focus:outline-none focus:border-purple"
                required
              />
            </div>

            <button
              id="btn-dev-login-submit"
              type="submit"
              disabled={devLoading}
              className="w-full flex justify-center items-center space-x-2 px-4 py-2.5 bg-purple text-white hover:bg-purple/95 font-sans font-semibold text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              <Terminal className="w-4 h-4 shrink-0" />
              <span>{devLoading ? 'Logging into Sandbox...' : 'Developer Instant Entry'}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
