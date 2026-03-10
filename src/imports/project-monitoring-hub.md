Build a modern web app for project managers that connects to multiple communication and work data sources such as email, Microsoft Teams, Slack, and optionally project tools like Jira, Trello, Asana, and Google Calendar. The app should collect relevant project information, identify what matters most, and visualize it in clean dashboards so project managers can stay on top of progress, blockers, risks, deadlines, and team communication.

Core idea:
The platform acts like an intelligent project monitoring hub. It pulls data from connected sources, organizes it by project, detects signals that need attention, and presents them in a simple dashboard with summaries, alerts, and trends.

Main features:
1. Multi-source integrations
- Connect Gmail/Outlook for email
- Connect Microsoft Teams
- Connect Slack
- Optional integrations: Jira, Trello, Asana, Notion, Google Calendar, GitHub
- Secure OAuth-based login and permissions
- Ability to choose which channels, inboxes, teams, or projects to monitor

2. AI-powered project intelligence
- Read and classify incoming messages, conversations, tickets, and updates
- Detect important project signals such as blockers, delays, missed deadlines, unresolved questions, repeated issues, risks, ownership gaps, escalation language, and dependencies
- Extract action items, decisions, deadlines, and mentions of project milestones
- Summarize daily or weekly project status automatically
- Group information by project, team, priority, and source

3. Dashboard for project managers
- Executive overview dashboard with:
  - project health status
  - overdue items
  - risks and blockers
  - pending approvals
  - unresolved questions
  - recent key updates
  - team responsiveness
- Project-specific dashboard pages
- Visual widgets such as:
  - status cards
  - timeline views
  - task/risk heatmaps
  - communication trend charts
  - priority queues
  - dependency trackers
- Alert section for urgent issues needing PM attention

4. Smart notifications
- Notify project managers when high-risk issues appear
- Daily digest and weekly summary
- Custom rules such as:
  - alert me if a deadline is mentioned without owner
  - alert me if blocker is mentioned 3+ times in 48 hours
  - alert me if no update has been posted for a project in 5 days

5. Search and drill-down
- Global search across emails, chats, tickets, and updates
- Filter by project, person, priority, date range, and source
- Click from dashboard cards into the raw source context

6. Collaboration and reporting
- Share dashboards with stakeholders
- Export summaries as PDF or email-friendly report
- Add notes or comments on flagged issues
- Create simple project review reports automatically

Design requirements:
- Clean, modern SaaS UI
- Responsive design for desktop first
- Role-based views for project managers, team leads, and executives
- Minimal clutter, highly visual, easy to scan
- Use charts, badges, color-coded status indicators, and timeline components

Technical expectations:
- Frontend: React or Next.js
- Backend: Node.js, Python, or equivalent
- Database: PostgreSQL
- Authentication: OAuth + secure session handling
- Integrations architecture should be modular so new data sources can be added later
- AI layer should support summarization, classification, entity extraction, and risk detection
- Include auditability so users can see why something was flagged as important
- Prioritize security, privacy, and permissions handling for connected work data

Suggested pages:
- Login / connect accounts
- Dashboard overview
- Project details page
- Alerts page
- Reports page
- Integration settings
- Notification rules
- Search/results page

Nice-to-have features:
- Natural language query like “Show me projects at risk this week”
- Sentiment analysis for team communication
- Trend forecasting for project delays
- Meeting summary ingestion from Teams or calendar events
- AI copilot chat for asking questions about project status

Goal:
Create a polished MVP that helps project managers reduce manual follow-up, spot issues early, and get a real-time overview of project health from fragmented communication and work tools.