import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Mail, 
  Calendar,
  RefreshCw,
  Loader2,
  Plug,
  BarChart3,
  Users,
  Clock,
  MessageSquare,
  Hash
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer 
} from 'recharts';
import {
  useIntegrationData,
  getEmailFrom,
  getEmailDate,
  isEmailUnread,
  isEmailImportant,
  isEventToday,
  isEventUpcoming,
  isEventThisWeek,
  getSlackMessageDate,
  isSlackBotMessage,
  getSlackChannelCounts,
  isSlackMessageToday,
} from '../hooks/useIntegrationData';

export default function Reports() {
  const { data: integrationData, loading, syncing, syncAll } = useIntegrationData();

  const handleSync = async () => {
    const results = await syncAll();
    if (results) {
      toast.success('Data synced successfully');
    }
  };

  const analytics = useMemo(() => {
    const emails = integrationData.gmail.emails;
    const events = integrationData.gcal.events;
    const slackMessages = integrationData.slack.messages;
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // --- Email analytics ---
    const totalEmails = emails.length;
    const unreadEmails = emails.filter(isEmailUnread).length;
    const importantEmails = emails.filter(isEmailImportant).length;

    const emailsByDay = new Map<string, { day: string; total: number; unread: number; important: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      emailsByDay.set(d.toDateString(), { day: dayNames[d.getDay()], total: 0, unread: 0, important: 0 });
    }
    emails.forEach(email => {
      const key = getEmailDate(email).toDateString();
      if (emailsByDay.has(key)) {
        const e = emailsByDay.get(key)!;
        e.total++; if (isEmailUnread(email)) e.unread++; if (isEmailImportant(email)) e.important++;
      }
    });
    const emailDailyData = Array.from(emailsByDay.values());

    const senderCounts = new Map<string, number>();
    emails.forEach(email => {
      const name = getEmailFrom(email).replace(/<[^>]+>/g, '').trim();
      senderCounts.set(name, (senderCounts.get(name) || 0) + 1);
    });
    const topSenders = Array.from(senderCounts.entries())
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, count]) => ({ name: name.substring(0, 25), count }));

    // --- Calendar analytics ---
    const totalEvents = events.length;
    const todayEvents = events.filter(isEventToday).length;
    const thisWeekEvents = events.filter(isEventThisWeek).length;

    const eventsByDay = new Map<string, { day: string; meetings: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      eventsByDay.set(d.toDateString(), { day: dayNames[d.getDay()], meetings: 0 });
    }
    events.forEach(event => {
      const start = event.start?.dateTime || event.start?.date;
      if (start) {
        const key = new Date(start).toDateString();
        if (eventsByDay.has(key)) eventsByDay.get(key)!.meetings++;
      }
    });
    const eventDailyData = Array.from(eventsByDay.values());

    let totalMeetingMinutes = 0, meetingCount = 0;
    events.forEach(event => {
      const s = event.start?.dateTime, e = event.end?.dateTime;
      if (s && e) {
        const dur = (new Date(e).getTime() - new Date(s).getTime()) / 60000;
        if (dur > 0 && dur < 480) { totalMeetingMinutes += dur; meetingCount++; }
      }
    });
    const avgMeetingDuration = meetingCount > 0 ? Math.round(totalMeetingMinutes / meetingCount) : 0;
    const totalMeetingHours = Math.round(totalMeetingMinutes / 60 * 10) / 10;

    const attendeeCounts = new Map<string, number>();
    events.forEach(event => {
      event.attendees?.forEach(a => {
        const name = a.displayName || a.email;
        attendeeCounts.set(name, (attendeeCounts.get(name) || 0) + 1);
      });
    });
    const topCollaborators = Array.from(attendeeCounts.entries())
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, count]) => ({ name: name.substring(0, 25), meetings: count }));

    // --- Slack analytics ---
    const totalSlackMessages = slackMessages.length;
    const humanMessages = slackMessages.filter(m => !isSlackBotMessage(m));
    const botMessages = slackMessages.filter(isSlackBotMessage);
    const todaySlackMessages = slackMessages.filter(isSlackMessageToday);
    const channelCounts = getSlackChannelCounts(slackMessages);
    const uniqueChannels = channelCounts.size;

    // Slack messages by day
    const slackByDay = new Map<string, { day: string; messages: number; human: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      slackByDay.set(d.toDateString(), { day: dayNames[d.getDay()], messages: 0, human: 0 });
    }
    slackMessages.forEach(msg => {
      const key = getSlackMessageDate(msg).toDateString();
      if (slackByDay.has(key)) {
        slackByDay.get(key)!.messages++;
        if (!isSlackBotMessage(msg)) slackByDay.get(key)!.human++;
      }
    });
    const slackDailyData = Array.from(slackByDay.values());

    // Channel activity chart
    const channelChartData = Array.from(channelCounts.entries())
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([channel, count]) => ({ channel: `#${channel}`, messages: count }));

    // Source breakdown for pie chart
    const sourceData: { name: string; value: number; color: string }[] = [];
    if (integrationData.gmail.connected) sourceData.push({ name: 'Gmail', value: totalEmails, color: '#ef4444' });
    if (integrationData.gcal.connected) sourceData.push({ name: 'Calendar', value: totalEvents, color: '#3b82f6' });
    if (integrationData.slack.connected) sourceData.push({ name: 'Slack', value: totalSlackMessages, color: '#8b5cf6' });
    if (integrationData.github.connected) sourceData.push({ name: 'GitHub', value: integrationData.github.activity.length, color: '#10b981' });

    // Combined daily data
    const combinedDailyData = emailDailyData.map((ed, i) => ({
      day: ed.day,
      emails: ed.total,
      meetings: eventDailyData[i]?.meetings || 0,
      slackMessages: slackDailyData[i]?.messages || 0,
    }));

    return {
      totalEmails, unreadEmails, importantEmails, emailDailyData, topSenders,
      totalEvents, todayEvents, thisWeekEvents, eventDailyData,
      avgMeetingDuration, totalMeetingHours, meetingCount, topCollaborators,
      totalSlackMessages, humanMessages: humanMessages.length, botMessages: botMessages.length,
      todaySlackMessages: todaySlackMessages.length, uniqueChannels,
      slackDailyData, channelChartData,
      sourceData, combinedDailyData,
    };
  }, [integrationData]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading reports...</span>
      </div>
    );
  }

  const connectedCount = integrationData.connectedProviders.length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
            <p className="text-gray-600">Insights from your connected integrations</p>
          </div>
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="size-4 mr-2 animate-spin" /> : <RefreshCw className="size-4 mr-2" />}
            {syncing ? 'Syncing...' : 'Refresh Data'}
          </Button>
        </div>
      </div>

      {connectedCount === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="size-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No data sources connected</h3>
            <p className="text-gray-600 mb-4 text-center max-w-md">Connect your integrations to generate real analytics.</p>
            <Link to="/integrations"><Button><Plug className="size-4 mr-2" />Connect Integrations</Button></Link>
          </CardContent>
        </Card>
      )}

      {connectedCount > 0 && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-8">
            {integrationData.gmail.connected && (
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Emails Tracked</CardDescription>
                  <CardTitle className="text-3xl">{analytics.totalEmails}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="size-4 text-red-500" />
                    <span className="text-gray-600">{analytics.unreadEmails} unread</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {integrationData.gcal.connected && (
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Calendar Events</CardDescription>
                  <CardTitle className="text-3xl">{analytics.totalEvents}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="size-4 text-blue-500" />
                    <span className="text-gray-600">{analytics.todayEvents} today</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {integrationData.slack.connected && (
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Slack Messages</CardDescription>
                  <CardTitle className="text-3xl text-purple-600">{analytics.totalSlackMessages}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm">
                    <MessageSquare className="size-4 text-purple-500" />
                    <span className="text-gray-600">{analytics.uniqueChannels} channels</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {integrationData.gcal.connected && (
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Avg Meeting Duration</CardDescription>
                  <CardTitle className="text-3xl">{analytics.avgMeetingDuration} min</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="size-4 text-gray-500" />
                    <span className="text-gray-600">{analytics.totalMeetingHours}h total</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Items</CardDescription>
                <CardTitle className="text-3xl">
                  {analytics.totalEmails + analytics.totalEvents + analytics.totalSlackMessages + integrationData.github.activity.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  <BarChart3 className="size-4 text-purple-500" />
                  <span className="text-gray-600">{connectedCount} source{connectedCount !== 1 ? 's' : ''}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {integrationData.gmail.connected && <TabsTrigger value="email">Email</TabsTrigger>}
              {integrationData.gcal.connected && <TabsTrigger value="calendar">Calendar</TabsTrigger>}
              {integrationData.slack.connected && <TabsTrigger value="slack">Slack</TabsTrigger>}
              <TabsTrigger value="sources">Data Sources</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid grid-cols-2 gap-6">
                {analytics.sourceData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Data Source Distribution</CardTitle>
                      <CardDescription>Items tracked by source</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie data={analytics.sourceData} cx="50%" cy="50%" labelLine={false}
                            label={({ name, value }) => `${name}: ${value}`}
                            outerRadius={100} dataKey="value">
                            {analytics.sourceData.map((entry, i) => (
                              <Cell key={`cell-${i}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Daily Activity (Last 7 Days)</CardTitle>
                    <CardDescription>All sources combined</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.combinedDailyData}>
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
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Email Tab */}
            {integrationData.gmail.connected && (
              <TabsContent value="email">
                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Email Volume (Last 7 Days)</CardTitle>
                      <CardDescription>Daily breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {analytics.emailDailyData.some(d => d.total > 0) ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={analytics.emailDailyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" /><YAxis /><Tooltip /><Legend />
                            <Bar dataKey="total" fill="#3b82f6" name="Total" />
                            <Bar dataKey="unread" fill="#f59e0b" name="Unread" />
                            <Bar dataKey="important" fill="#ef4444" name="Important" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[300px] text-gray-500">No email data. Sync to fetch.</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top Senders</CardTitle>
                      <CardDescription>Most frequent senders</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {analytics.topSenders.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={analytics.topSenders} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#8b5cf6" name="Emails" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[300px] text-gray-500">No sender data</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="col-span-2">
                    <CardHeader><CardTitle>Email Summary</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-6">
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-3xl font-bold text-gray-900">{analytics.totalEmails}</div>
                          <div className="text-sm text-gray-600 mt-1">Total Tracked</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-3xl font-bold text-blue-600">{analytics.unreadEmails}</div>
                          <div className="text-sm text-gray-600 mt-1">Unread</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <div className="text-3xl font-bold text-red-600">{analytics.importantEmails}</div>
                          <div className="text-sm text-gray-600 mt-1">Important</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-3xl font-bold text-green-600">{analytics.topSenders.length}</div>
                          <div className="text-sm text-gray-600 mt-1">Unique Senders</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}

            {/* Calendar Tab */}
            {integrationData.gcal.connected && (
              <TabsContent value="calendar">
                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Meeting Schedule (Last 7 Days)</CardTitle>
                      <CardDescription>Meetings per day</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {analytics.eventDailyData.some(d => d.meetings > 0) ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={analytics.eventDailyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" /><YAxis allowDecimals={false} /><Tooltip />
                            <Line type="monotone" dataKey="meetings" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} name="Meetings" />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[300px] text-gray-500">No calendar data. Sync to fetch.</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top Collaborators</CardTitle>
                      <CardDescription>Most frequent meeting partners</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {analytics.topCollaborators.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={analytics.topCollaborators} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="meetings" fill="#3b82f6" name="Shared Meetings" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[300px] text-gray-500">No collaborator data</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="col-span-2">
                    <CardHeader><CardTitle>Calendar Summary</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-5 gap-6">
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-3xl font-bold text-gray-900">{analytics.totalEvents}</div>
                          <div className="text-sm text-gray-600 mt-1">Total Events</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <div className="text-3xl font-bold text-purple-600">{analytics.todayEvents}</div>
                          <div className="text-sm text-gray-600 mt-1">Today</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-3xl font-bold text-blue-600">{analytics.thisWeekEvents}</div>
                          <div className="text-sm text-gray-600 mt-1">This Week</div>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                          <div className="text-3xl font-bold text-yellow-600">{analytics.avgMeetingDuration}</div>
                          <div className="text-sm text-gray-600 mt-1">Avg Duration (min)</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <div className="text-3xl font-bold text-red-600">{analytics.totalMeetingHours}h</div>
                          <div className="text-sm text-gray-600 mt-1">Total Meeting Time</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}

            {/* Slack Tab */}
            {integrationData.slack.connected && (
              <TabsContent value="slack">
                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="size-5 text-purple-500" />
                        Message Volume (Last 7 Days)
                      </CardTitle>
                      <CardDescription>Daily message breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {analytics.slackDailyData.some(d => d.messages > 0) ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={analytics.slackDailyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" /><YAxis /><Tooltip /><Legend />
                            <Bar dataKey="messages" fill="#8b5cf6" name="All Messages" />
                            <Bar dataKey="human" fill="#6366f1" name="Human" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[300px] text-gray-500">
                          No Slack data. Sync to fetch messages.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Hash className="size-5 text-purple-500" />
                        Channel Activity
                      </CardTitle>
                      <CardDescription>Messages per channel (top 10)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {analytics.channelChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={analytics.channelChartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="channel" type="category" width={120} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="messages" fill="#a78bfa" name="Messages" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[300px] text-gray-500">No channel data</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="col-span-2">
                    <CardHeader><CardTitle>Slack Summary</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-5 gap-6">
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-3xl font-bold text-gray-900">{analytics.totalSlackMessages}</div>
                          <div className="text-sm text-gray-600 mt-1">Total Messages</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <div className="text-3xl font-bold text-purple-600">{analytics.humanMessages}</div>
                          <div className="text-sm text-gray-600 mt-1">Human Messages</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-3xl font-bold text-blue-600">{analytics.botMessages}</div>
                          <div className="text-sm text-gray-600 mt-1">Bot Messages</div>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                          <div className="text-3xl font-bold text-yellow-600">{analytics.todaySlackMessages}</div>
                          <div className="text-sm text-gray-600 mt-1">Today</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-3xl font-bold text-green-600">{analytics.uniqueChannels}</div>
                          <div className="text-sm text-gray-600 mt-1">Active Channels</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}

            {/* Data Sources Tab */}
            <TabsContent value="sources">
              <Card>
                <CardHeader>
                  <CardTitle>Integration Statistics</CardTitle>
                  <CardDescription>Activity by connected data source</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {integrationData.gmail.connected && (
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-red-100"><Mail className="size-5 text-red-600" /></div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Gmail</h3>
                            <p className="text-sm text-gray-600">{analytics.totalEmails} emails tracked</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{analytics.unreadEmails} unread</div>
                          {integrationData.gmail.fetchedAt && (
                            <div className="text-xs text-gray-500">Last sync: {new Date(integrationData.gmail.fetchedAt).toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {integrationData.gcal.connected && (
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-100"><Calendar className="size-5 text-blue-600" /></div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Google Calendar</h3>
                            <p className="text-sm text-gray-600">{analytics.totalEvents} events tracked</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{analytics.todayEvents} today</div>
                          {integrationData.gcal.fetchedAt && (
                            <div className="text-xs text-gray-500">Last sync: {new Date(integrationData.gcal.fetchedAt).toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {integrationData.slack.connected && (
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-purple-100"><MessageSquare className="size-5 text-purple-600" /></div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Slack</h3>
                            <p className="text-sm text-gray-600">{analytics.totalSlackMessages} messages across {analytics.uniqueChannels} channels</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{analytics.todaySlackMessages} today</div>
                          {integrationData.slack.fetchedAt && (
                            <div className="text-xs text-gray-500">Last sync: {new Date(integrationData.slack.fetchedAt).toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {integrationData.github.connected && (
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-green-100"><BarChart3 className="size-5 text-green-600" /></div>
                          <div>
                            <h3 className="font-semibold text-gray-900">GitHub</h3>
                            <p className="text-sm text-gray-600">{integrationData.github.activity.length} activities tracked</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {integrationData.github.fetchedAt && (
                            <div className="text-xs text-gray-500">Last sync: {new Date(integrationData.github.fetchedAt).toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
