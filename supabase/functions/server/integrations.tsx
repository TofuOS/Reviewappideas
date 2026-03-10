// API functions for fetching data from integrated services

export async function fetchGmailMessages(accessToken: string, query = '') {
  const searchQuery = query || 'is:unread OR label:important';
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(searchQuery)}&maxResults=50`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Gmail API error: ${response.statusText}`);
  }

  const data = await response.json();
  const messages = [];

  // Fetch details for each message
  if (data.messages) {
    for (const msg of data.messages.slice(0, 20)) {
      const msgResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      
      if (msgResponse.ok) {
        messages.push(await msgResponse.json());
      }
    }
  }

  return messages;
}

export async function fetchSlackMessages(accessToken: string, channelId?: string) {
  // Get list of channels if no specific channel provided
  const channelsResponse = await fetch(
    'https://slack.com/api/conversations.list?types=public_channel,private_channel',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!channelsResponse.ok) {
    throw new Error(`Slack API error: ${channelsResponse.statusText}`);
  }

  const channelsData = await channelsResponse.json();
  
  if (!channelsData.ok) {
    throw new Error(`Slack API error: ${channelsData.error}`);
  }

  const messages = [];
  const channels = channelsData.channels || [];

  // Fetch recent messages from each channel
  for (const channel of channels.slice(0, 10)) {
    const historyResponse = await fetch(
      `https://slack.com/api/conversations.history?channel=${channel.id}&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (historyResponse.ok) {
      const historyData = await historyResponse.json();
      if (historyData.ok && historyData.messages) {
        messages.push(...historyData.messages.map((msg: any) => ({
          ...msg,
          channel: channel.name,
          channelId: channel.id,
        })));
      }
    }
  }

  return messages;
}

export async function fetchJiraIssues(accessToken: string, cloudId: string) {
  const response = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search?jql=updated>=startOfDay(-7)&maxResults=50`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Jira API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.issues || [];
}

export async function fetchGithubActivity(accessToken: string, org?: string) {
  // Fetch user's repositories
  const reposResponse = await fetch(
    org 
      ? `https://api.github.com/orgs/${org}/repos?sort=updated&per_page=20`
      : 'https://api.github.com/user/repos?sort=updated&per_page=20',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    }
  );

  if (!reposResponse.ok) {
    throw new Error(`GitHub API error: ${reposResponse.statusText}`);
  }

  const repos = await reposResponse.json();
  const activity = [];

  // Fetch recent commits and issues for each repo
  for (const repo of repos.slice(0, 5)) {
    // Fetch commits
    const commitsResponse = await fetch(
      `https://api.github.com/repos/${repo.full_name}/commits?per_page=5`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (commitsResponse.ok) {
      const commits = await commitsResponse.json();
      activity.push(...commits.map((commit: any) => ({
        type: 'commit',
        repo: repo.name,
        ...commit,
      })));
    }

    // Fetch issues
    const issuesResponse = await fetch(
      `https://api.github.com/repos/${repo.full_name}/issues?state=open&per_page=5`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (issuesResponse.ok) {
      const issues = await issuesResponse.json();
      activity.push(...issues.map((issue: any) => ({
        type: 'issue',
        repo: repo.name,
        ...issue,
      })));
    }
  }

  return activity;
}

export async function fetchGoogleCalendarEvents(accessToken: string) {
  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 7);
  
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin.toISOString()}&maxResults=50&orderBy=startTime&singleEvents=true`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Google Calendar API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.items || [];
}

export async function fetchTeamsMessages(accessToken: string) {
  // Fetch user's teams
  const teamsResponse = await fetch(
    'https://graph.microsoft.com/v1.0/me/joinedTeams',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!teamsResponse.ok) {
    throw new Error(`Teams API error: ${teamsResponse.statusText}`);
  }

  const teamsData = await teamsResponse.json();
  const messages = [];

  // Fetch channels and messages for each team
  for (const team of (teamsData.value || []).slice(0, 5)) {
    const channelsResponse = await fetch(
      `https://graph.microsoft.com/v1.0/teams/${team.id}/channels`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (channelsResponse.ok) {
      const channelsData = await channelsResponse.json();
      
      for (const channel of (channelsData.value || []).slice(0, 3)) {
        const messagesResponse = await fetch(
          `https://graph.microsoft.com/v1.0/teams/${team.id}/channels/${channel.id}/messages?$top=20`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          messages.push(...(messagesData.value || []).map((msg: any) => ({
            ...msg,
            teamName: team.displayName,
            channelName: channel.displayName,
          })));
        }
      }
    }
  }

  return messages;
}
