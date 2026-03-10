import { useState } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MessageSquare,
  Users,
  Calendar,
  Mail,
  RefreshCw,
  Loader2,
  ExternalLink,
  Plug,
  Hash
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer 
} from 'recharts';
import { toast } from 'sonner';
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
  getSlackMessageDate,
  getSlackMessagePreview,
  isSlackBotMessage,
  getSlackChannelCounts,
  isSlackMessageToday,
  isSlackMessageRecent,
} from '../hooks/useIntegrationData';

export default function Dashboard() {
  const { data: integrationData, loading, syncing, syncAll } = useIntegrationData();

  const handleSync = async () => {
    const results = await syncAll();
    if (results) {
      const success = Object.values(results).filter((r: any) => r.success).length;
      const failed = Object.values(results).filter((r: any) => !r.success).length;
      if (failed > 0) {
        toast.warning(`Synced ${success} source(s), ${failed} failed`);
      } else {
        toast.success(`Synced ${success} source(s) successfully`);
      }
    }
  };

  // Derive stats from real integration data
  const totalEmails = integrationData.gmail.emails.length;
  const unreadEmails = integrationData.gmail.emails.filter(isEmailUnread).length;
  const importantEmails = integrationData.gmail.emails.filter(isEmailImportant).length;
  
  const todayEvents = integrationData.gcal.events.filter(isEventToday);
  const upcomingEvents = integrationData.gcal.events.filter(isEventUpcoming);
  const thisWeekEvents = integrationData.gcal.events.filter(isEventThisWeek);

  // Slack stats
  const slackMessages = integrationData.slack.messages;
  const totalSlackMessages = slackMessages.length;
  const humanMessages = slackMessages.filter(m => !isSlackBotMessage(m));
  const todaySlackMessages = slackMessages.filter(isSlackMessageToday);
  const recentSlackMessages = slackMessages.filter(m => isSlackMessageRecent(m, 24));
  const slackChannels = getSlackChannelCounts(slackMessages);
  const uniqueChannels = slackChannels.size;

  const connectedCount = integrationData.connectedProviders.length;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Build combined activity chart data (last 7 days)
  const activityByDay = new Map<string, { day: string; emails: number; meetings: number; slackMessages: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    activityByDay.set(key, { day: dayNames[d.getDay()], emails: 0, meetings: 0, slackMessages: 0 });
  }
  
  integrationData.gmail.emails.forEach(email => {
    const key = getEmailDate(email).toDateString();
    if (activityByDay.has(key)) activityByDay.get(key)!.emails += 1;
  });
  
  integrationData.gcal.events.forEach(event => {
    const start = event.start?.dateTime || event.start?.date;
    if (start) {
      const key = new Date(start).toDateString();
      if (activityByDay.has(key)) activityByDay.get(key)!.meetings += 1;
    }
  });

  slackMessages.forEach(msg => {
    const key = getSlackMessageDate(msg).toDateString();
    if (activityByDay.has(key)) activityByDay.get(key)!.slackMessages += 1;
  });
  
  const activityChartData = Array.from(activityByDay.values());

  // Slack channel breakdown chart
  const channelChartData = Array.from(slackChannels.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([channel, count]) => ({ channel: `#${channel}`, messages: count }));

  // Smart alerts from real data
  const smartAlerts: Array<{
    id: string;
    type: string;
    source: string;
    message: string;
    severity: 'high' | 'medium' | 'low';
    time: string;
  }> = [];

  // Calendar alerts
  todayEvents.forEach((event, i) => {
    const start = event.start?.dateTime || event.start?.date;
    if (start) {
      const eventTime = new Date(start);
      const now = new Date();
      const diffMin = Math.round((eventTime.getTime() - now.getTime()) / 60000);
      
      if (diffMin > 0 && diffMin <= 60) {
        smartAlerts.push({
          id: `gcal-soon-${i}`,
          type: 'meeting',
          source: 'Google Calendar',
          message: `"${event.summary}" starts in ${diffMin} minutes`,
          severity: 'high',
          time: getEventTime(event),
        });
      } else if (diffMin > 60 && diffMin <= 180) {
        smartAlerts.push({
          id: `gcal-upcoming-${i}`,
          type: 'meeting',
          source: 'Google Calendar',
          message: `"${event.summary}" is coming up today at ${new Date(start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          severity: 'medium',
          time: getEventTime(event),
        });
      }
    }
    if (event.attendees && event.attendees.length >= 5) {
      smartAlerts.push({
        id: `gcal-large-${i}`,
        type: 'meeting',
        source: 'Google Calendar',
        message: `Large meeting: "${event.summary}" with ${event.attendees.length} attendees`,
        severity: 'medium',
        time: getEventTime(event),
      });
    }
  });

  // Email alerts
  if (unreadEmails > 10) {
    smartAlerts.push({
      id: 'gmail-unread',
      type: 'email',
      source: 'Gmail',
      message: `You have ${unreadEmails} unread emails requiring attention`,
      severity: unreadEmails > 20 ? 'high' : 'medium',
      time: 'Now',
    });
  }
  if (importantEmails > 0) {
    smartAlerts.push({
      id: 'gmail-important',
      type: 'email',
      source: 'Gmail',
      message: `${importantEmails} important email(s) detected in your inbox`,
      severity: 'medium',
      time: 'Recent',
    });
  }

  // Slack alerts
  if (integrationData.slack.connected) {
    // High message volume alert
    if (recentSlackMessages.length > 50) {
      smartAlerts.push({
        id: 'slack-high-volume',
        type: 'slack',
        source: 'Slack',
        message: `${recentSlackMessages.length} messages in the last 24 hours across ${uniqueChannels} channels`,
        severity: recentSlackMessages.length > 100 ? 'high' : 'medium',
        time: 'Last 24h',
      });
    }

    // Channels with high activity
    const highActivityChannels = Array.from(slackChannels.entries()).filter(([, count]) => count > 15);
    if (highActivityChannels.length > 0) {
      const topChannel = highActivityChannels.sort((a, b) => b[1] - a[1])[0];
      smartAlerts.push({
        id: 'slack-hot-channel',
        type: 'slack',
        source: 'Slack',
        message: `High activity in #${topChannel[0]} (${topChannel[1]} messages). ${highActivityChannels.length > 1 ? `${highActivityChannels.length - 1} other busy channel(s).` : ''}`,
        severity: 'low',
        time: 'Recent',
      });
    }

    // Look for keywords suggesting blockers or urgent items
    const urgentKeywords = ['blocker', 'blocked', 'urgent', 'asap', 'critical', 'help', 'broken', 'down', 'outage'];
    const urgentMessages = humanMessages.filter(msg => {
      const text = (msg.text || '').toLowerCase();
      return urgentKeywords.some(kw => text.includes(kw));
    });
    if (urgentMessages.length > 0) {
      const channels = [...new Set(urgentMessages.map(m => m.channel).filter(Boolean))];
      smartAlerts.push({
        id: 'slack-urgent-keywords',
        type: 'slack',
        source: 'Slack',
        message: `${urgentMessages.length} message(s) with urgent keywords detected in ${channels.map(c => `#${c}`).join(', ')}`,
        severity: 'high',
        time: 'Recent',
      });
    }

    // Mentions detection (messages containing @)
    const mentions = humanMessages.filter(msg => (msg.text || '').includes('<@'));
    if (mentions.length > 5) {
      smartAlerts.push({
        id: 'slack-mentions',
        type: 'slack',
        source: 'Slack',
        message: `${mentions.length} messages with @mentions detected - may need your response`,
        severity: 'medium',
        time: 'Recent',
      });
    }
  }

  // Sort alerts by severity
  const severityOrder = { high: 0, medium: 1, low: 2 };
  smartAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const getAlertIcon = (type: string, severity: string) => {
    const colorClass = severity === 'high' ? 'text-red-600' : severity === 'medium' ? 'text-yellow-600' : 'text-blue-600';
    switch (type) {
      case 'meeting': return <Calendar className={`size-5 ${colorClass}`} />;
      case 'email': return <Mail className={`size-5 ${colorClass}`} />;
      case 'slack': return <MessageSquare className={`size-5 ${colorClass}`} />;
      default: return <AlertCircle className={`size-5 ${colorClass}`} />;
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Executive Dashboard</h1>
          <p className="text-gray-600">Real-time overview from your connected integrations</p>
        </div>
        <div className="flex items-center gap-3">
          {connectedCount > 0 && (
            <Badge variant="outline" className="px-3 py-1.5 text-sm">
              <Plug className="size-3.5 mr-1.5" />
              {connectedCount} source{connectedCount !== 1 ? 's' : ''} connected
            </Badge>
          )}
          <Button onClick={handleSync} disabled={syncing || connectedCount === 0} variant="outline">
            {syncing ? <Loader2 className="size-4 mr-2 animate-spin" /> : <RefreshCw className="size-4 mr-2" />}
            {syncing ? 'Syncing...' : 'Sync All'}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Loading dashboard data...</span>
        </div>
      )}

      {!loading && connectedCount === 0 && (
        <Card className="mb-8 border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Plug className="size-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No integrations connected</h3>
            <p className="text-gray-600 mb-4 text-center max-w-md">
              Connect Gmail, Google Calendar, Slack, or other services to see real-time data on your dashboard.
            </p>
            <Link to="/integrations">
              <Button><Plug className="size-4 mr-2" />Connect Integrations</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!loading && connectedCount > 0 && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Connected Sources</CardDescription>
                <CardTitle className="text-3xl">{connectedCount}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <CheckCircle2 className="size-4 text-green-600" />
                  <span>{integrationData.connectedProviders.map(p => {
                    const names: Record<string, string> = { gmail: 'Gmail', gcal: 'Calendar', slack: 'Slack', github: 'GitHub', jira: 'Jira', teams: 'Teams' };
                    return names[p] || p;
                  }).join(', ')}</span>
                </div>
              </CardContent>
            </Card>

            {integrationData.gmail.connected && (
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Emails Tracked</CardDescription>
                  <CardTitle className="text-3xl">{totalEmails}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Mail className="size-4 text-blue-600" />
                      <span className="text-gray-600">{unreadEmails} unread</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {integrationData.gcal.connected && (
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Today's Meetings</CardDescription>
                  <CardTitle className="text-3xl text-blue-600">{todayEvents.length}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Calendar className="size-4" />
                    <span>{thisWeekEvents.length} this week</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {integrationData.slack.connected && (
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Slack Messages</CardDescription>
                  <CardTitle className="text-3xl text-purple-600">{totalSlackMessages}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="size-4 text-purple-500" />
                      <span className="text-gray-600">{todaySlackMessages.length} today</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Hash className="size-4 text-gray-500" />
                      <span className="text-gray-600">{uniqueChannels} channels</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Smart Alerts</CardDescription>
                <CardTitle className="text-3xl text-yellow-600">{smartAlerts.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <AlertCircle className="size-4" />
                  <span>{smartAlerts.filter(a => a.severity === 'high').length} high priority</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Combined Activity Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Communication Activity (Last 7 Days)</CardTitle>
                <CardDescription>All sources combined</CardDescription>
              </CardHeader>
              <CardContent>
                {activityChartData.some(d => d.emails > 0 || d.meetings > 0 || d.slackMessages > 0) ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={activityChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {integrationData.gmail.connected && <Bar dataKey="emails" fill="#ef4444" name="Emails" />}
                      {integrationData.gcal.connected && <Bar dataKey="meetings" fill="#3b82f6" name="Meetings" />}
                      {integrationData.slack.connected && <Bar dataKey="slackMessages" fill="#8b5cf6" name="Slack" />}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-gray-500">
                    <div className="text-center">
                      <RefreshCw className="size-8 mx-auto mb-2 text-gray-400" />
                      <p>No activity data yet. Click "Sync All" to fetch data.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Slack Channel Breakdown */}
            {integrationData.slack.connected && channelChartData.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="size-5 text-purple-500" />
                    Slack Channel Activity
                  </CardTitle>
                  <CardDescription>
                    Messages per channel
                    {integrationData.slack.fetchedAt && (
                      <span className="ml-2 text-xs">
                        Last synced: {new Date(integrationData.slack.fetchedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={channelChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="channel" type="category" width={120} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="messages" fill="#8b5cf6" name="Messages" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : integrationData.gcal.connected ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="size-5 text-blue-500" />
                    Meeting Schedule (Last 7 Days)
                  </CardTitle>
                  <CardDescription>Meetings per day</CardDescription>
                </CardHeader>
                <CardContent>
                  {activityChartData.some(d => d.meetings > 0) ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={activityChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="meetings" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-gray-500">
                      <div className="text-center">
                        <Calendar className="size-8 mx-auto mb-2 text-gray-400" />
                        <p>No calendar data yet. Click "Sync All" to fetch your events.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>

          {/* Smart Alerts */}
          {smartAlerts.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Smart Alerts</CardTitle>
                    <CardDescription>AI-detected issues from your connected integrations</CardDescription>
                  </div>
                  <Link to="/alerts" className="text-sm text-blue-600 hover:underline">View all alerts</Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {smartAlerts.slice(0, 6).map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className={`p-2 rounded-lg ${
                        alert.severity === 'high' ? 'bg-red-100' :
                        alert.severity === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                      }`}>
                        {getAlertIcon(alert.type, alert.severity)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{alert.source}</span>
                          <Badge variant="outline" className="text-xs">{alert.type}</Badge>
                          <Badge className={
                            alert.severity === 'high' ? 'bg-red-100 text-red-800 border-red-200' :
                            alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                            'bg-blue-100 text-blue-800 border-blue-200'
                          }>{alert.severity}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{alert.message}</p>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">{alert.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data feeds: Emails, Events, Slack Messages */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Recent Emails */}
            {integrationData.gmail.connected && integrationData.gmail.emails.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="size-5 text-red-500" />
                    Recent Emails
                  </CardTitle>
                  <CardDescription>{totalEmails} emails tracked</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {integrationData.gmail.emails.slice(0, 8).map((email) => {
                      const subject = getEmailSubject(email);
                      const from = getEmailFrom(email);
                      const date = getEmailDate(email);
                      const unread = isEmailUnread(email);
                      const important = isEmailImportant(email);
                      
                      return (
                        <div
                          key={email.id}
                          className={`p-3 border rounded-lg transition-colors ${
                            unread ? 'bg-blue-50 border-blue-200' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {unread && <div className="size-2 rounded-full bg-blue-500 flex-shrink-0" />}
                                {important && <AlertTriangle className="size-3.5 text-yellow-500 flex-shrink-0" />}
                                <span className={`text-sm truncate ${unread ? 'font-semibold text-gray-900' : 'text-gray-900'}`}>
                                  {subject}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 truncate">{from}</p>
                              {email.snippet && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{email.snippet}</p>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                              {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Calendar Events */}
            {integrationData.gcal.connected && integrationData.gcal.events.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="size-5 text-blue-500" />
                    Upcoming Events
                  </CardTitle>
                  <CardDescription>{upcomingEvents.length} upcoming</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {upcomingEvents.slice(0, 8).map((event) => {
                      const today = isEventToday(event);
                      const start = event.start?.dateTime || event.start?.date;
                      const end = event.end?.dateTime || event.end?.date;
                      
                      return (
                        <div
                          key={event.id}
                          className={`p-3 border rounded-lg transition-colors ${
                            today ? 'bg-purple-50 border-purple-200' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {today && <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">Today</Badge>}
                                <span className="text-sm font-medium text-gray-900 truncate">
                                  {event.summary || 'Untitled Event'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600">
                                {getEventTime(event)}
                                {end && start && (
                                  <span className="text-gray-400">
                                    {' '}({Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)} min)
                                  </span>
                                )}
                              </p>
                              {event.attendees && event.attendees.length > 0 && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Users className="size-3 text-gray-400" />
                                  <span className="text-xs text-gray-500">
                                    {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              )}
                            </div>
                            {event.htmlLink && (
                              <a href={event.htmlLink} target="_blank" rel="noopener noreferrer"
                                className="text-gray-400 hover:text-blue-600">
                                <ExternalLink className="size-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Slack Messages */}
            {integrationData.slack.connected && slackMessages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="size-5 text-purple-500" />
                    Recent Slack Messages
                  </CardTitle>
                  <CardDescription>{totalSlackMessages} messages across {uniqueChannels} channels</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {slackMessages
                      .filter(m => !isSlackBotMessage(m) && m.text)
                      .sort((a, b) => parseFloat(b.ts || '0') - parseFloat(a.ts || '0'))
                      .slice(0, 10)
                      .map((msg, i) => {
                        const date = getSlackMessageDate(msg);
                        const preview = getSlackMessagePreview(msg);
                        const isToday = isSlackMessageToday(msg);
                        
                        return (
                          <div
                            key={`${msg.channelId}-${msg.ts}-${i}`}
                            className={`p-3 border rounded-lg transition-colors ${
                              isToday ? 'bg-purple-50 border-purple-200' : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Hash className="size-3.5 text-purple-500 flex-shrink-0" />
                                  <span className="text-sm font-medium text-gray-900">{msg.channel || 'unknown'}</span>
                                  {isToday && <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">Today</Badge>}
                                </div>
                                <p className="text-xs text-gray-600 line-clamp-2">{preview}</p>
                              </div>
                              <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sync prompt if connected but no data */}
          {connectedCount > 0 && 
            !integrationData.gmail.emails.length && 
            !integrationData.gcal.events.length &&
            !integrationData.slack.messages.length && (
            <Card className="border-dashed border-2 border-blue-300 bg-blue-50">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <RefreshCw className="size-10 text-blue-500 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Integrations connected - sync your data!</h3>
                <p className="text-gray-600 mb-4 text-center max-w-md">
                  Click "Sync All" above to fetch your latest emails, calendar events, and Slack messages.
                </p>
                <Button onClick={handleSync} disabled={syncing}>
                  {syncing ? (
                    <><Loader2 className="size-4 mr-2 animate-spin" />Syncing...</>
                  ) : (
                    <><RefreshCw className="size-4 mr-2" />Sync Now</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
