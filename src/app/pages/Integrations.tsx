import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Mail, 
  MessageSquare, 
  Calendar, 
  FileText, 
  Github,
  CheckCircle2,
  Settings2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { authenticatedRequest } from '../lib/api';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export default function Integrations() {
  const [integrations, setIntegrations] = useState([
    {
      id: 'gmail',
      name: 'Gmail',
      description: 'Connect your Gmail account to monitor project-related emails',
      icon: Mail,
      connected: false,
      status: 'available',
      lastSync: null,
      itemsTracked: 0,
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Monitor channels and direct messages for project updates',
      icon: MessageSquare,
      connected: false,
      status: 'available',
      lastSync: null,
      itemsTracked: 0,
    },
    {
      id: 'teams',
      name: 'Microsoft Teams',
      description: 'Track conversations and activity in Teams channels',
      icon: MessageSquare,
      connected: false,
      status: 'available',
      lastSync: null,
      itemsTracked: 0,
    },
    {
      id: 'jira',
      name: 'Jira',
      description: 'Sync tickets, sprints, and project boards',
      icon: FileText,
      connected: false,
      status: 'available',
      lastSync: null,
      itemsTracked: 0,
    },
    {
      id: 'gcal',
      name: 'Google Calendar',
      description: 'Track meetings and project milestones',
      icon: Calendar,
      connected: false,
      status: 'available',
      lastSync: null,
      itemsTracked: 0,
    },
    {
      id: 'github',
      name: 'GitHub',
      description: 'Monitor pull requests, issues, and commits',
      icon: Github,
      connected: false,
      status: 'available',
      lastSync: null,
      itemsTracked: 0,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrationStatus();
  }, []);

  const loadIntegrationStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No active session, skipping integration status load');
        return;
      }

      console.log('Loading integration status with session:', session.access_token.substring(0, 20) + '...');
      const response = await authenticatedRequest('/integrations/status', session.access_token);
      
      if (response.integrations) {
        // Update integration status based on backend data
        setIntegrations(prev => prev.map(int => {
          const connected = response.integrations.some((i: any) => 
            i.provider === int.id || i.key?.includes(int.id)
          );
          
          if (connected) {
            const intData = response.integrations.find((i: any) => 
              i.provider === int.id || i.key?.includes(int.id)
            );
            return {
              ...int,
              connected: true,
              status: 'active',
              lastSync: intData?.connectedAt ? new Date(intData.connectedAt).toLocaleString() : 'Just now',
            };
          }
          return int;
        }));
      }
    } catch (error: any) {
      console.error('Error loading integration status:', error);
      // Check if it's an auth error
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        console.log('Authentication error - user may need to log in again');
        // Don't show error toast for auth issues on initial load
      }
    }
  };

  const handleConnect = async (id: string) => {
    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        toast.error('Session error: ' + sessionError.message);
        setLoading(false);
        return;
      }
      
      if (!session) {
        toast.error('Please log in to connect integrations');
        setLoading(false);
        return;
      }

      console.log('Current session user:', session.user?.id);
      console.log('Access token (first 20 chars):', session.access_token?.substring(0, 20));

      // Request OAuth URL from backend
      const redirectUri = encodeURIComponent(`${window.location.origin}/oauth/callback`);
      const response = await authenticatedRequest(`/oauth/connect/${id}?redirect_uri=${redirectUri}`, session.access_token);
      
      if (response.authUrl) {
        // Redirect to OAuth provider
        window.location.href = response.authUrl;
      } else if (response.error) {
        toast.error(response.error);
      }
    } catch (error: any) {
      console.error('Connection error:', error);
      // Parse error message for better display
      let errorMsg = error.message || 'Failed to initiate connection';
      try {
        const parsed = JSON.parse(errorMsg.replace('API request failed: ', ''));
        if (parsed.error) errorMsg = parsed.error;
      } catch {}
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await authenticatedRequest(`/integrations/${id}`, session.access_token, {
        method: 'DELETE',
      });

      setIntegrations(integrations.map(int => 
        int.id === id ? { ...int, connected: false, status: 'available', lastSync: null } : int
      ));
      
      toast.success('Integration disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect integration');
    }
  };

  const handleSyncData = async (id: string) => {
    setSyncingProvider(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await authenticatedRequest(`/integrations/${id}/data`, session.access_token);
      
      if (response.data) {
        toast.success(`Synced ${response.data.length || 0} items from ${integrations.find(i => i.id === id)?.name}`);
        
        // Update last sync time
        setIntegrations(prev => prev.map(int => 
          int.id === id ? { ...int, lastSync: 'Just now', itemsTracked: response.data.length || 0 } : int
        ));
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(error.message || 'Failed to sync data');
    } finally {
      setSyncingProvider(null);
    }
  };

  const connectedIntegrations = integrations.filter(i => i.connected);
  const availableIntegrations = integrations.filter(i => !i.connected);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrations</h1>
        <p className="text-gray-600">Connect your tools to centralize project monitoring</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Connected Services</CardDescription>
            <CardTitle className="text-3xl">{connectedIntegrations.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Out of {integrations.length} available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Items Tracked</CardDescription>
            <CardTitle className="text-3xl">
              {integrations.reduce((sum, int) => sum + int.itemsTracked, 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Across all integrations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Sync Status</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {connectedIntegrations.length > 0 ? 'Active' : 'None'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              {connectedIntegrations.length > 0 ? 'Integrations syncing' : 'No integrations connected'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Connected Integrations */}
      {connectedIntegrations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Connected</h2>
          <div className="grid grid-cols-2 gap-6">
            {connectedIntegrations.map((integration) => {
              const Icon = integration.icon;
              const isSyncing = syncingProvider === integration.id;
              
              return (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-3 rounded-lg bg-green-100">
                          <Icon className="size-6 text-green-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-lg">{integration.name}</CardTitle>
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              <CheckCircle2 className="size-3 mr-1" />
                              Connected
                            </Badge>
                          </div>
                          <CardDescription>{integration.description}</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Last synced</span>
                        <span className="font-medium text-gray-900">{integration.lastSync || 'Never'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Items tracked</span>
                        <span className="font-medium text-gray-900">{integration.itemsTracked}</span>
                      </div>
                      <div className="flex gap-2 pt-3">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleSyncData(integration.id)}
                          disabled={isSyncing}
                        >
                          {isSyncing ? (
                            <>
                              <Loader2 className="size-4 mr-2 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <Settings2 className="size-4 mr-2" />
                              Sync Now
                            </>
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 text-red-600 hover:text-red-700"
                          onClick={() => handleDisconnect(integration.id)}
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Integrations */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Available</h2>
        <div className="grid grid-cols-2 gap-6">
          {availableIntegrations.map((integration) => {
            const Icon = integration.icon;
            return (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-lg bg-gray-100">
                      <Icon className="size-6 text-gray-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg mb-1">{integration.name}</CardTitle>
                      <CardDescription>{integration.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full"
                    onClick={() => handleConnect(integration.id)}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      `Connect ${integration.name}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}