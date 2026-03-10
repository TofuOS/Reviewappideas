import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { supabase } from '../lib/supabase';
import { authenticatedRequest } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing OAuth callback...');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      if (!code || !state) {
        setStatus('error');
        setMessage('Missing OAuth parameters');
        return;
      }

      const [provider] = state.split(':');

      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus('error');
        setMessage('Not authenticated');
        navigate('/login');
        return;
      }

      // Exchange code for token via backend
      const redirectUri = `${window.location.origin}/oauth/callback`;
      await authenticatedRequest(
        '/oauth/callback',
        session.access_token,
        {
          method: 'POST',
          body: JSON.stringify({ code, state, provider, redirectUri }),
        }
      );

      setStatus('success');
      setMessage(`Successfully connected ${provider}!`);
      
      setTimeout(() => {
        navigate('/integrations');
      }, 2000);
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to complete OAuth connection');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>OAuth Connection</CardTitle>
          <CardDescription>
            {status === 'loading' && 'Processing your connection...'}
            {status === 'success' && 'Connection successful!'}
            {status === 'error' && 'Connection failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'loading' && (
            <Loader2 className="size-16 text-blue-600 animate-spin" />
          )}
          {status === 'success' && (
            <CheckCircle2 className="size-16 text-green-600" />
          )}
          {status === 'error' && (
            <XCircle className="size-16 text-red-600" />
          )}
          <p className="text-center text-gray-700">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}
