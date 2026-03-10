import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { generateAuthUrl, exchangeCodeForToken, refreshAccessToken } from "./oauth.tsx";
import { 
  fetchGmailMessages, 
  fetchSlackMessages, 
  fetchJiraIssues, 
  fetchGithubActivity, 
  fetchGoogleCalendarEvents,
  fetchTeamsMessages 
} from "./integrations.tsx";

const app = new Hono();

// Helper function to verify user from request
async function verifyUser(c: any) {
  // The user's access token is passed in a custom header to avoid
  // conflicting with the Supabase Edge Function gateway's JWT validation
  // on the Authorization header (which must contain the anon key).
  const accessToken = c.req.header('x-user-access-token');
  
  if (!accessToken) {
    console.error("No x-user-access-token header provided");
    return { user: null, error: "No user access token" };
  }

  console.log("Access token (first 50 chars):", accessToken.substring(0, 50));
  console.log("Access token length:", accessToken.length);

  // Create Supabase client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  // Verify the JWT by passing it directly to getUser
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error) {
    console.error("Supabase auth error:", error.message);
    return { user: null, error: error.message };
  }
  
  if (!user) {
    console.error("No user found for token");
    return { user: null, error: "No user found" };
  }

  console.log("User verified:", user.id);
  return { user, error: null };
}

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey", "x-user-access-token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-a44134ce/health", (c) => {
  return c.json({ status: "ok" });
});

// Sign up endpoint
app.post("/make-server-a44134ce/signup", async (c) => {
  try {
    const { name, email, password } = await c.req.json();

    if (!name || !email || !password) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });

    if (error) {
      console.error("Signup error:", error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.error("Signup error:", error);
    return c.json({ error: "Failed to create account" }, 500);
  }
});

// Get user projects
app.get("/make-server-a44134ce/projects", async (c) => {
  try {
    const { user, error } = await verifyUser(c);
    
    if (error) {
      return c.json({ error }, 401);
    }

    // Get projects for this user from KV store
    const projects = await kv.getByPrefix(`user:${user.id}:projects`);
    
    return c.json({ projects: projects || [] });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return c.json({ error: "Failed to fetch projects" }, 500);
  }
});

// Save project data
app.post("/make-server-a44134ce/projects", async (c) => {
  try {
    const { user, error } = await verifyUser(c);
    
    if (error) {
      return c.json({ error }, 401);
    }

    const projectData = await c.req.json();
    const projectId = projectData.id || crypto.randomUUID();
    
    await kv.set(`user:${user.id}:projects:${projectId}`, {
      ...projectData,
      id: projectId,
      userId: user.id,
      updatedAt: new Date().toISOString(),
    });

    return c.json({ success: true, projectId });
  } catch (error) {
    console.error("Error saving project:", error);
    return c.json({ error: "Failed to save project" }, 500);
  }
});

// Get alerts
app.get("/make-server-a44134ce/alerts", async (c) => {
  try {
    const { user, error } = await verifyUser(c);
    
    if (error) {
      return c.json({ error }, 401);
    }

    const alerts = await kv.getByPrefix(`user:${user.id}:alerts`);
    
    return c.json({ alerts: alerts || [] });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return c.json({ error: "Failed to fetch alerts" }, 500);
  }
});

// Aggregated dashboard data endpoint - fetches all integration data
app.get("/make-server-a44134ce/dashboard/data", async (c) => {
  try {
    const { user, error } = await verifyUser(c);
    
    if (error) {
      return c.json({ error }, 401);
    }

    // Get all connected integrations
    const integrations = await kv.getByPrefix(`user:${user.id}:integration:`) || [];
    
    // Get cached data for each integration
    const dashboardData: any = {
      connectedProviders: [],
      gmail: { emails: [], connected: false },
      gcal: { events: [], connected: false },
      slack: { messages: [], connected: false },
      github: { activity: [], connected: false },
      jira: { issues: [], connected: false },
      teams: { messages: [], connected: false },
    };

    for (const integration of integrations) {
      const provider = integration.provider;
      // Skip :data entries (they have a `data` array instead of `accessToken`)
      if (!provider || !integration.accessToken) continue;
      
      dashboardData.connectedProviders.push(provider);
      
      // Get cached data
      const cachedData = await kv.get(`user:${user.id}:integration:${provider}:data`);
      
      if (cachedData && cachedData.data) {
        switch (provider) {
          case 'gmail':
            dashboardData.gmail = { emails: cachedData.data, connected: true, fetchedAt: cachedData.fetchedAt };
            break;
          case 'gcal':
            dashboardData.gcal = { events: cachedData.data, connected: true, fetchedAt: cachedData.fetchedAt };
            break;
          case 'slack':
            dashboardData.slack = { messages: cachedData.data, connected: true, fetchedAt: cachedData.fetchedAt };
            break;
          case 'github':
            dashboardData.github = { activity: cachedData.data, connected: true, fetchedAt: cachedData.fetchedAt };
            break;
          case 'jira':
            dashboardData.jira = { issues: cachedData.data, connected: true, fetchedAt: cachedData.fetchedAt };
            break;
          case 'teams':
            dashboardData.teams = { messages: cachedData.data, connected: true, fetchedAt: cachedData.fetchedAt };
            break;
        }
      } else {
        // Mark as connected but no data yet
        if (dashboardData[provider]) {
          dashboardData[provider].connected = true;
        }
      }
    }

    return c.json(dashboardData);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return c.json({ error: "Failed to fetch dashboard data" }, 500);
  }
});

// Sync all connected integrations and return fresh data
app.post("/make-server-a44134ce/dashboard/sync", async (c) => {
  try {
    const { user, error } = await verifyUser(c);
    
    if (error) {
      return c.json({ error }, 401);
    }

    const integrations = await kv.getByPrefix(`user:${user.id}:integration:`) || [];
    const results: any = {};

    for (const integration of integrations) {
      const provider = integration.provider;
      // Skip :data entries
      if (!provider || !integration.accessToken) continue;
      
      try {
        // Check if token needs refresh
        let accessToken = integration.accessToken;
        if (integration.expiresAt && Date.now() >= integration.expiresAt - 300000) {
          const newTokenData = await refreshAccessToken(provider, integration.refreshToken);
          accessToken = newTokenData.access_token;
          await kv.set(`user:${user.id}:integration:${provider}`, {
            ...integration,
            accessToken: newTokenData.access_token,
            expiresAt: newTokenData.expires_in ? Date.now() + (newTokenData.expires_in * 1000) : null,
          });
        }

        let data;
        switch (provider) {
          case 'gmail':
            data = await fetchGmailMessages(accessToken);
            break;
          case 'gcal':
            data = await fetchGoogleCalendarEvents(accessToken);
            break;
          case 'slack':
            data = await fetchSlackMessages(accessToken);
            break;
          case 'github':
            data = await fetchGithubActivity(accessToken);
            break;
          case 'jira':
            data = await fetchJiraIssues(accessToken, integration.cloudId || 'default');
            break;
          case 'teams':
            data = await fetchTeamsMessages(accessToken);
            break;
        }

        if (data) {
          await kv.set(`user:${user.id}:integration:${provider}:data`, {
            provider,
            data,
            fetchedAt: new Date().toISOString(),
          });
          results[provider] = { success: true, count: Array.isArray(data) ? data.length : 0 };
        }
      } catch (syncError: any) {
        console.error(`Error syncing ${provider}:`, syncError.message);
        results[provider] = { success: false, error: syncError.message };
      }
    }

    return c.json({ results });
  } catch (error) {
    console.error("Error syncing dashboard:", error);
    return c.json({ error: "Failed to sync dashboard data" }, 500);
  }
});

// OAuth initiation endpoint
app.get("/make-server-a44134ce/oauth/connect/:provider", async (c) => {
  try {
    const provider = c.req.param('provider');
    const { user, error } = await verifyUser(c);
    
    if (error) {
      return c.json({ error }, 401);
    }

    // Check if OAuth credentials exist before generating URL
    const config = (await import("./oauth.tsx")).oauthProviders[provider as keyof typeof import("./oauth.tsx").oauthProviders];
    if (config) {
      const clientId = Deno.env.get(config.clientIdEnv);
      const clientSecret = Deno.env.get(config.clientSecretEnv);
      if (!clientId) {
        return c.json({ error: `Missing ${config.clientIdEnv} environment variable. Please add your OAuth Client ID.` }, 400);
      }
      if (!clientSecret) {
        return c.json({ error: `Missing ${config.clientSecretEnv} environment variable. Please add your OAuth Client Secret.` }, 400);
      }
    }

    // Use redirect_uri from query param (sent by frontend) or fall back to origin header
    const redirectUri = c.req.query('redirect_uri') || `${c.req.header('origin')}/oauth/callback`;
    console.log("OAuth redirect URI:", redirectUri);
    const authUrl = generateAuthUrl(provider, user.id, redirectUri);

    if (!authUrl) {
      return c.json({ error: "Failed to generate OAuth URL. Please configure OAuth credentials." }, 400);
    }

    return c.json({ authUrl });
  } catch (error) {
    console.error("OAuth initiation error:", error);
    return c.json({ error: "Failed to initiate OAuth" }, 500);
  }
});

// OAuth callback endpoint
app.post("/make-server-a44134ce/oauth/callback", async (c) => {
  try {
    const { code, state, provider, redirectUri } = await c.req.json();
    const [providerName, userId] = state.split(':');

    if (providerName !== provider) {
      return c.json({ error: "Invalid state parameter" }, 400);
    }

    // Exchange code for token
    const tokenData = await exchangeCodeForToken(provider, code, redirectUri);

    // Store tokens in KV store
    await kv.set(`user:${userId}:integration:${provider}`, {
      provider,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : null,
      connectedAt: new Date().toISOString(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("OAuth callback error:", error);
    return c.json({ error: "Failed to complete OAuth" }, 500);
  }
});

// Get integration status
app.get("/make-server-a44134ce/integrations/status", async (c) => {
  try {
    const { user, error } = await verifyUser(c);
    
    if (error) {
      return c.json({ error }, 401);
    }

    const integrations = await kv.getByPrefix(`user:${user.id}:integration:`);
    
    return c.json({ integrations: integrations || [] });
  } catch (error) {
    console.error("Error fetching integration status:", error);
    return c.json({ error: "Failed to fetch integrations" }, 500);
  }
});

// Disconnect integration
app.delete("/make-server-a44134ce/integrations/:provider", async (c) => {
  try {
    const provider = c.req.param('provider');
    const { user, error } = await verifyUser(c);
    
    if (error) {
      return c.json({ error }, 401);
    }

    await kv.del(`user:${user.id}:integration:${provider}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting integration:", error);
    return c.json({ error: "Failed to disconnect integration" }, 500);
  }
});

// Fetch data from integration
app.get("/make-server-a44134ce/integrations/:provider/data", async (c) => {
  try {
    const provider = c.req.param('provider');
    const { user, error } = await verifyUser(c);
    
    if (error) {
      return c.json({ error }, 401);
    }

    // Get integration tokens
    const integration = await kv.get(`user:${user.id}:integration:${provider}`);
    
    if (!integration) {
      return c.json({ error: "Integration not connected" }, 404);
    }

    // Check if token needs refresh
    let integrationAccessToken = integration.accessToken;
    if (integration.expiresAt && Date.now() >= integration.expiresAt - 300000) {
      // Token expires in less than 5 minutes, refresh it
      const newTokenData = await refreshAccessToken(provider, integration.refreshToken);
      integrationAccessToken = newTokenData.access_token;
      
      // Update stored token
      await kv.set(`user:${user.id}:integration:${provider}`, {
        ...integration,
        accessToken: newTokenData.access_token,
        expiresAt: newTokenData.expires_in ? Date.now() + (newTokenData.expires_in * 1000) : null,
      });
    }

    // Fetch data based on provider
    let data;
    switch (provider) {
      case 'gmail':
        data = await fetchGmailMessages(integrationAccessToken);
        break;
      case 'slack':
        data = await fetchSlackMessages(integrationAccessToken);
        break;
      case 'jira':
        // For Jira, we need the cloud ID
        const cloudId = integration.cloudId || 'default';
        data = await fetchJiraIssues(integrationAccessToken, cloudId);
        break;
      case 'github':
        data = await fetchGithubActivity(integrationAccessToken);
        break;
      case 'gcal':
        data = await fetchGoogleCalendarEvents(integrationAccessToken);
        break;
      case 'teams':
        data = await fetchTeamsMessages(integrationAccessToken);
        break;
      default:
        return c.json({ error: "Unsupported provider" }, 400);
    }

    // Store the fetched data
    await kv.set(`user:${user.id}:integration:${provider}:data`, {
      provider,
      data,
      fetchedAt: new Date().toISOString(),
    });

    return c.json({ data });
  } catch (error) {
    console.error(`Error fetching ${c.req.param('provider')} data:`, error);
    return c.json({ error: `Failed to fetch data: ${error.message}` }, 500);
  }
});

Deno.serve(app.fetch);