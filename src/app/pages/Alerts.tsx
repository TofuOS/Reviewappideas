import { 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  HelpCircle,
  CheckCircle2,
  XCircle,
  Calendar,
  Mail,
  MessageSquare,
  Loader2,
  RefreshCw,
  Users,
  Plug
} from 'lucide-react';
import {
  useIntegrationData,
  getEmailSubject,
  getEmailFrom,
  getEmailDate,
  isEmailUnread,
  isEmailImportant,
  getEventTime,
  isEventToday,
  isEventUpcoming,
  isEventThisWeek,
  isSlackBotMessage,
  isSlackMessageRecent,
  getSlackChannelCounts,
  getSlackMessageDate,
  type CalendarEvent,
  type GmailEmail,
} from '../hooks/useIntegrationData';

interface Alert {
  id: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  source: string;
  title: string;
  description: string;
  detectedAt: string;
  status: 'active' | 'monitoring' | 'dismissed';
  aiReason: string;
  rawData?: any;
}

export default function Alerts() {
  const { data: integrationData, loading, syncing, syncAll } = useIntegrationData();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const handleSync = async () => {
    const results = await syncAll();
    if (results) {
      toast.success('Synced and refreshed alerts');
    }
  };

  // Generate alerts from real integration data
  const alerts = useMemo<Alert[]>(() => {
    const generated: Alert[] = [];
    const now = new Date();

    // --- Calendar alerts ---
    if (integrationData.gcal.connected) {
      const events = integrationData.gcal.events;
      const upcomingEvents = events.filter(isEventUpcoming);

      // Imminent meetings (within next hour)
      upcomingEvents.forEach((event, i) => {
        const start = event.start?.dateTime || event.start?.date;
        if (!start) return;
        const eventTime = new Date(start);
        const diffMin = Math.round((eventTime.getTime() - now.getTime()) / 60000);

        if (diffMin > 0 && diffMin <= 30) {
          generated.push({
            id: `gcal-imminent-${event.id}`,
            type: 'meeting',
            severity: 'high',
            source: 'Google Calendar',
            title: `Meeting starting in ${diffMin} min`,
            description: `"${event.summary}" starts at ${eventTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.${event.attendees ? ` ${event.attendees.length} attendee(s).` : ''}`,
            detectedAt: now.toISOString(),
            status: 'active',
            aiReason: 'Event starts within 30 minutes and may need preparation',
            rawData: event,
          });
        } else if (diffMin > 30 && diffMin <= 60) {
          generated.push({
            id: `gcal-soon-${event.id}`,
            type: 'meeting',
            severity: 'medium',
            source: 'Google Calendar',
            title: `Meeting in ${diffMin} minutes`,
            description: `"${event.summary}" at ${eventTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.${event.attendees ? ` ${event.attendees.length} attendee(s).` : ''}`,
            detectedAt: now.toISOString(),
            status: 'active',
            aiReason: 'Upcoming meeting detected within the next hour',
            rawData: event,
          });
        }
      });

      // Large meetings today
      const todayEvents = events.filter(isEventToday);
      todayEvents.forEach(event => {
        if (event.attendees && event.attendees.length >= 5) {
          generated.push({
            id: `gcal-large-${event.id}`,
            type: 'meeting',
            severity: 'medium',
            source: 'Google Calendar',
            title: `Large meeting: ${event.summary}`,
            description: `Meeting with ${event.attendees.length} attendees scheduled today. ${getEventTime(event)}.`,
            detectedAt: now.toISOString(),
            status: 'active',
            aiReason: `Meeting has ${event.attendees.length} attendees, likely an important group discussion`,
            rawData: event,
          });
        }
      });

      // Declined or tentative meetings
      todayEvents.forEach(event => {
        if (event.attendees) {
          const declined = event.attendees.filter(a => a.responseStatus === 'declined');
          const tentative = event.attendees.filter(a => a.responseStatus === 'tentative');
          if (declined.length >= 2) {
            generated.push({
              id: `gcal-declined-${event.id}`,
              type: 'meeting',
              severity: 'medium',
              source: 'Google Calendar',
              title: `Multiple declines for "${event.summary}"`,
              description: `${declined.length} attendee(s) declined. ${tentative.length} tentative. Consider rescheduling.`,
              detectedAt: now.toISOString(),
              status: 'monitoring',
              aiReason: 'Multiple attendees declined which may reduce meeting effectiveness',
              rawData: event,
            });
          }
        }
      });

      // Busy day alert
      if (todayEvents.length >= 5) {
        generated.push({
          id: 'gcal-busy-day',
          type: 'schedule',
          severity: 'medium',
          source: 'Google Calendar',
          title: 'Busy day ahead',
          description: `You have ${todayEvents.length} meetings scheduled today. Consider blocking focus time.`,
          detectedAt: now.toISOString(),
          status: 'monitoring',
          aiReason: `${todayEvents.length} meetings detected today, which exceeds typical meeting load`,
        });
      }

      // Back-to-back meetings
      const sortedToday = [...todayEvents].sort((a, b) => {
        const aStart = new Date(a.start?.dateTime || a.start?.date || 0).getTime();
        const bStart = new Date(b.start?.dateTime || b.start?.date || 0).getTime();
        return aStart - bStart;
      });
      
      let backToBackCount = 0;
      for (let i = 0; i < sortedToday.length - 1; i++) {
        const endCurrent = sortedToday[i].end?.dateTime;
        const startNext = sortedToday[i + 1].start?.dateTime;
        if (endCurrent && startNext) {
          const gap = (new Date(startNext).getTime() - new Date(endCurrent).getTime()) / 60000;
          if (gap <= 5) backToBackCount++;
        }
      }
      
      if (backToBackCount >= 2) {
        generated.push({
          id: 'gcal-backtoback',
          type: 'schedule',
          severity: 'low',
          source: 'Google Calendar',
          title: 'Back-to-back meetings detected',
          description: `${backToBackCount} consecutive meetings with no break. Consider adding buffer time.`,
          detectedAt: now.toISOString(),
          status: 'monitoring',
          aiReason: 'Detected consecutive meetings with <=5 min gaps between them',
        });
      }
    }

    // --- Gmail alerts ---
    if (integrationData.gmail.connected) {
      const emails = integrationData.gmail.emails;
      const unread = emails.filter(isEmailUnread);
      const important = emails.filter(isEmailImportant);
      const importantUnread = emails.filter(e => isEmailUnread(e) && isEmailImportant(e));

      // High unread count
      if (unread.length >= 15) {
        generated.push({
          id: 'gmail-unread-high',
          type: 'email',
          severity: 'high',
          source: 'Gmail',
          title: `${unread.length} unread emails`,
          description: `Your inbox has ${unread.length} unread messages. ${important.length} are marked as important.`,
          detectedAt: now.toISOString(),
          status: 'active',
          aiReason: 'Unread email count exceeds threshold, may contain action items',
        });
      } else if (unread.length >= 5) {
        generated.push({
          id: 'gmail-unread-med',
          type: 'email',
          severity: 'medium',
          source: 'Gmail',
          title: `${unread.length} unread emails`,
          description: `You have ${unread.length} unread messages in your inbox.`,
          detectedAt: now.toISOString(),
          status: 'active',
          aiReason: 'Moderate unread email count detected',
        });
      }

      // Important unread emails
      if (importantUnread.length > 0) {
        const topImportant = importantUnread.slice(0, 3);
        const subjects = topImportant.map(e => `"${getEmailSubject(e)}"`).join(', ');
        generated.push({
          id: 'gmail-important-unread',
          type: 'email',
          severity: 'high',
          source: 'Gmail',
          title: `${importantUnread.length} important unread email(s)`,
          description: `Important emails need attention: ${subjects}${importantUnread.length > 3 ? ` and ${importantUnread.length - 3} more` : ''}.`,
          detectedAt: now.toISOString(),
          status: 'active',
          aiReason: 'Emails flagged as important by Gmail that remain unread',
        });
      }

      // Old unread emails (older than 2 days)
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const oldUnread = unread.filter(e => getEmailDate(e) < twoDaysAgo);
      if (oldUnread.length >= 3) {
        generated.push({
          id: 'gmail-stale-unread',
          type: 'email',
          severity: 'low',
          source: 'Gmail',
          title: `${oldUnread.length} unread emails older than 2 days`,
          description: `Some unread emails may need follow-up or archiving. Oldest from ${getEmailFrom(oldUnread[oldUnread.length - 1])}.`,
          detectedAt: now.toISOString(),
          status: 'monitoring',
          aiReason: 'Unread emails that are more than 48 hours old may indicate missed action items',
        });
      }
    }

    // --- Slack alerts ---
    if (integrationData.slack.connected) {
      const messages = integrationData.slack.messages;
      const humanMessages = messages.filter(m => !isSlackBotMessage(m));
      const recentMessages = messages.filter(m => isSlackMessageRecent(m, 24));
      const channelCounts = getSlackChannelCounts(messages);

      // High activity channels
      const highActivityChannels = Array.from(channelCounts.entries()).filter(([, count]) => count >= 15);
      if (highActivityChannels.length > 0) {
        const topChannel = highActivityChannels.sort((a, b) => b[1] - a[1])[0];
        generated.push({
          id: 'slack-high-activity',
          type: 'message',
          severity: 'medium',
          source: 'Slack',
          title: `High activity in #${topChannel[0]}`,
          description: `#${topChannel[0]} has ${topChannel[1]} messages. ${highActivityChannels.length > 1 ? `${highActivityChannels.length - 1} other busy channel(s).` : ''}`,
          detectedAt: now.toISOString(),
          status: 'active',
          aiReason: 'Channel message volume exceeds typical activity, may contain important discussions',
        });
      }

      // Urgent keywords detection
      const urgentKeywords = ['blocker', 'blocked', 'urgent', 'asap', 'critical', 'help', 'broken', 'down', 'outage', 'incident'];
      const urgentMessages = humanMessages.filter(msg => {
        const text = (msg.text || '').toLowerCase();
        return urgentKeywords.some(kw => text.includes(kw));
      });
      if (urgentMessages.length > 0) {
        const urgentChannels = [...new Set(urgentMessages.map(m => m.channel).filter(Boolean))];
        generated.push({
          id: 'slack-urgent-keywords',
          type: 'message',
          severity: 'high',
          source: 'Slack',
          title: `${urgentMessages.length} message(s) with urgent keywords`,
          description: `Detected keywords like "blocker", "urgent", "critical" in ${urgentChannels.map(c => `#${c}`).join(', ')}.`,
          detectedAt: now.toISOString(),
          status: 'active',
          aiReason: 'Messages containing urgent/blocker keywords detected which may need immediate action',
        });
      }

      // @mentions detection
      const mentions = humanMessages.filter(msg => (msg.text || '').includes('<@'));
      if (mentions.length > 5) {
        generated.push({
          id: 'slack-mentions',
          type: 'message',
          severity: 'medium',
          source: 'Slack',
          title: `${mentions.length} messages with @mentions`,
          description: `Multiple messages with @mentions detected - these may need your response.`,
          detectedAt: now.toISOString(),
          status: 'active',
          aiReason: '@mentions in Slack typically require direct response or action',
        });
      }

      // High overall volume
      if (recentMessages.length > 50) {
        generated.push({
          id: 'slack-high-volume',
          type: 'message',
          severity: recentMessages.length > 100 ? 'medium' : 'low',
          source: 'Slack',
          title: `${recentMessages.length} messages in last 24 hours`,
          description: `High message volume across ${channelCounts.size} channels in the last 24 hours.`,
          detectedAt: now.toISOString(),
          status: 'monitoring',
          aiReason: 'Message volume exceeds typical daily activity across channels',
        });
      }

      // Question marks without responses
      const questions = humanMessages.filter(msg => (msg.text || '').includes('?'));
      if (questions.length > 3) {
        generated.push({
          id: 'slack-questions',
          type: 'message',
          severity: 'low',
          source: 'Slack',
          title: `${questions.length} questions detected in Slack`,
          description: `Multiple questions found across channels - some may need follow-up.`,
          detectedAt: now.toISOString(),
          status: 'monitoring',
          aiReason: 'Questions in Slack channels may indicate blockers or decisions needed',
        });
      }
    }

    // Remove duplicates by id and apply dismissed filter
    const uniqueAlerts = generated.filter((alert, index, self) => 
      self.findIndex(a => a.id === alert.id) === index
    );

    return uniqueAlerts;
  }, [integrationData]);

  const activeAlerts = alerts.filter(a => a.status === 'active' && !dismissedIds.has(a.id));
  const monitoringAlerts = alerts.filter(a => a.status === 'monitoring' && !dismissedIds.has(a.id));
  const dismissedAlerts = alerts.filter(a => dismissedIds.has(a.id));

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
    toast.success('Alert dismissed');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting': return <Calendar className="size-5" />;
      case 'schedule': return <Clock className="size-5" />;
      case 'email': return <Mail className="size-5" />;
      case 'message': return <MessageSquare className="size-5" />;
      default: return <AlertTriangle className="size-5" />;
    }
  };

  const renderAlertCard = (alert: Alert, showActions = true) => (
    <Card
      key={alert.id}
      className="border-l-4"
      style={{
        borderLeftColor: alert.severity === 'high' ? '#ef4444' : alert.severity === 'medium' ? '#f59e0b' : '#3b82f6'
      }}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${getSeverityColor(alert.severity)}`}>
              {getTypeIcon(alert.type)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <CardTitle className="text-lg">{alert.title}</CardTitle>
                <Badge className={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                <Badge variant="outline" className="capitalize">{alert.type}</Badge>
              </div>
              <CardDescription>{alert.source}</CardDescription>
            </div>
          </div>
          {showActions && (
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" variant="outline" onClick={() => handleDismiss(alert.id)}>
                Dismiss
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 mb-4">{alert.description}</p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">AI Detection Reason</p>
              <p className="text-sm text-blue-700">{alert.aiReason}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <span>Source: {alert.source}</span>
          <span className="mx-2">&middot;</span>
          <span>Detected: {new Date(alert.detectedAt).toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading alerts...</span>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Alerts & Issues</h1>
          <p className="text-gray-600">AI-detected issues from your connected integrations</p>
        </div>
        <Button onClick={handleSync} disabled={syncing} variant="outline">
          {syncing ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="size-4 mr-2" />
          )}
          {syncing ? 'Syncing...' : 'Refresh Alerts'}
        </Button>
      </div>

      {/* No integrations */}
      {integrationData.connectedProviders.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Plug className="size-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No integrations connected</h3>
            <p className="text-gray-600 mb-4 text-center max-w-md">
              Connect Gmail, Google Calendar, or other services to automatically detect alerts.
            </p>
            <Link to="/integrations">
              <Button><Plug className="size-4 mr-2" />Connect Integrations</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {integrationData.connectedProviders.length > 0 && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Active Alerts</CardDescription>
                <CardTitle className="text-3xl text-red-600">{activeAlerts.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Need attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>High Severity</CardDescription>
                <CardTitle className="text-3xl">{activeAlerts.filter(a => a.severity === 'high').length}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Urgent issues</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Monitoring</CardDescription>
                <CardTitle className="text-3xl text-blue-600">{monitoringAlerts.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Under observation</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Dismissed</CardDescription>
                <CardTitle className="text-3xl text-green-600">{dismissedAlerts.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Cleared by you</p>
              </CardContent>
            </Card>
          </div>

          {alerts.length === 0 && !loading && (
            <Card className="border-dashed border-2 border-green-300 bg-green-50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="size-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">All clear!</h3>
                <p className="text-gray-600 mb-4 text-center max-w-md">
                  No alerts detected from your connected integrations. Try syncing to check for new data.
                </p>
                <Button onClick={handleSync} disabled={syncing} variant="outline">
                  <RefreshCw className="size-4 mr-2" />
                  Sync & Check
                </Button>
              </CardContent>
            </Card>
          )}

          {alerts.length > 0 && (
            <Tabs defaultValue="active" className="space-y-6">
              <TabsList>
                <TabsTrigger value="active">Active ({activeAlerts.length})</TabsTrigger>
                <TabsTrigger value="monitoring">Monitoring ({monitoringAlerts.length})</TabsTrigger>
                <TabsTrigger value="dismissed">Dismissed ({dismissedAlerts.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                <div className="space-y-4">
                  {activeAlerts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No active alerts</div>
                  ) : (
                    activeAlerts.map(alert => renderAlertCard(alert))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="monitoring">
                <div className="space-y-4">
                  {monitoringAlerts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">Nothing being monitored</div>
                  ) : (
                    monitoringAlerts.map(alert => renderAlertCard(alert))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="dismissed">
                <div className="space-y-4">
                  {dismissedAlerts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No dismissed alerts</div>
                  ) : (
                    dismissedAlerts.map(alert => renderAlertCard(alert, false))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </>
      )}
    </div>
  );
}