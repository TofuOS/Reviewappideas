import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { authenticatedRequest } from '../lib/api';

export interface GmailEmail {
  id: string;
  threadId: string;
  snippet: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
  };
  internalDate?: string;
  labelIds?: string[];
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  status?: string;
  organizer?: { email: string; displayName?: string };
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>;
  htmlLink?: string;
}

export interface SlackMessage {
  text?: string;
  user?: string;
  ts?: string;
  channel?: string;
  channelId?: string;
  subtype?: string;
  bot_id?: string;
  type?: string;
}

export interface IntegrationData {
  connectedProviders: string[];
  gmail: { emails: GmailEmail[]; connected: boolean; fetchedAt?: string };
  gcal: { events: CalendarEvent[]; connected: boolean; fetchedAt?: string };
  slack: { messages: SlackMessage[]; connected: boolean; fetchedAt?: string };
  github: { activity: any[]; connected: boolean; fetchedAt?: string };
  jira: { issues: any[]; connected: boolean; fetchedAt?: string };
  teams: { messages: any[]; connected: boolean; fetchedAt?: string };
}

const defaultData: IntegrationData = {
  connectedProviders: [],
  gmail: { emails: [], connected: false },
  gcal: { events: [], connected: false },
  slack: { messages: [], connected: false },
  github: { activity: [], connected: false },
  jira: { issues: [], connected: false },
  teams: { messages: [], connected: false },
};

export function useIntegrationData() {
  const [data, setData] = useState<IntegrationData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const response = await authenticatedRequest('/dashboard/data', session.access_token);
      setData(response);
    } catch (error) {
      console.error('Error fetching integration data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const syncAll = useCallback(async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const response = await authenticatedRequest('/dashboard/sync', session.access_token, {
        method: 'POST',
      });

      // Refetch dashboard data after sync
      await fetchData();
      return response.results;
    } catch (error) {
      console.error('Error syncing integrations:', error);
      return null;
    } finally {
      setSyncing(false);
    }
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, syncing, refresh: fetchData, syncAll };
}

// Helper utilities for parsing integration data
export function getEmailSubject(email: GmailEmail): string {
  const subject = email.payload?.headers?.find(h => h.name.toLowerCase() === 'subject');
  return subject?.value || '(No subject)';
}

export function getEmailFrom(email: GmailEmail): string {
  const from = email.payload?.headers?.find(h => h.name.toLowerCase() === 'from');
  return from?.value || 'Unknown sender';
}

export function getEmailDate(email: GmailEmail): Date {
  return new Date(parseInt(email.internalDate || '0'));
}

export function isEmailImportant(email: GmailEmail): boolean {
  return email.labelIds?.includes('IMPORTANT') || false;
}

export function isEmailUnread(email: GmailEmail): boolean {
  return email.labelIds?.includes('UNREAD') || false;
}

export function getEventTime(event: CalendarEvent): string {
  const start = event.start?.dateTime || event.start?.date;
  if (!start) return 'No time';
  const date = new Date(start);
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isEventToday(event: CalendarEvent): boolean {
  const start = event.start?.dateTime || event.start?.date;
  if (!start) return false;
  const eventDate = new Date(start);
  const today = new Date();
  return eventDate.toDateString() === today.toDateString();
}

export function isEventUpcoming(event: CalendarEvent): boolean {
  const start = event.start?.dateTime || event.start?.date;
  if (!start) return false;
  return new Date(start) >= new Date();
}

export function isEventThisWeek(event: CalendarEvent): boolean {
  const start = event.start?.dateTime || event.start?.date;
  if (!start) return false;
  const eventDate = new Date(start);
  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + 7);
  return eventDate >= now && eventDate <= endOfWeek;
}

// Slack helpers
export function getSlackMessageDate(msg: SlackMessage): Date {
  return new Date(parseFloat(msg.ts || '0') * 1000);
}

export function getSlackMessagePreview(msg: SlackMessage): string {
  const text = msg.text || '';
  return text.length > 120 ? text.substring(0, 120) + '...' : text;
}

export function isSlackBotMessage(msg: SlackMessage): boolean {
  return !!msg.bot_id || msg.subtype === 'bot_message';
}

export function getSlackChannelCounts(messages: SlackMessage[]): Map<string, number> {
  const counts = new Map<string, number>();
  messages.forEach(msg => {
    const ch = msg.channel || 'unknown';
    counts.set(ch, (counts.get(ch) || 0) + 1);
  });
  return counts;
}

export function isSlackMessageRecent(msg: SlackMessage, hoursAgo: number = 24): boolean {
  const date = getSlackMessageDate(msg);
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - hoursAgo);
  return date >= cutoff;
}

export function isSlackMessageToday(msg: SlackMessage): boolean {
  const date = getSlackMessageDate(msg);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}