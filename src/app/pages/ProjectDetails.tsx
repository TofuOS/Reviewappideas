import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  MessageSquare,
  Users,
  Calendar,
  Mail,
  Slack,
  TrendingUp,
  FileText
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export default function ProjectDetails() {
  const { projectId } = useParams();

  const [project] = useState({
    id: projectId,
    name: 'Mobile App Redesign',
    status: 'healthy',
    progress: 75,
    risk: 'low',
    team: 8,
    dueDate: '2026-04-15',
    startDate: '2026-01-10',
    description: 'Complete redesign of the mobile application with new UI/UX patterns, improved performance, and enhanced user experience.',
    owner: 'Sarah Johnson',
    stakeholders: ['Mike Chen', 'Emily Rodriguez', 'David Park'],
  });

  const [timeline] = useState([
    { week: 'W1', progress: 15, planned: 20 },
    { week: 'W2', progress: 28, planned: 30 },
    { week: 'W3', progress: 42, planned: 45 },
    { week: 'W4', progress: 55, planned: 60 },
    { week: 'W5', progress: 68, planned: 75 },
    { week: 'W6', progress: 75, planned: 85 },
  ]);

  const [updates] = useState([
    {
      id: '1',
      source: 'slack',
      channel: '#mobile-redesign',
      author: 'Sarah Johnson',
      message: 'Design review completed. Minor adjustments needed on the checkout flow.',
      timestamp: '2 hours ago',
      type: 'update',
    },
    {
      id: '2',
      source: 'email',
      author: 'Mike Chen',
      subject: 'Testing phase update',
      message: 'QA team has completed testing on 80% of new features. Found 3 minor bugs.',
      timestamp: '5 hours ago',
      type: 'update',
    },
    {
      id: '3',
      source: 'jira',
      author: 'Emily Rodriguez',
      message: 'Story MOBILE-234 moved to Done. Animation implementation complete.',
      timestamp: '1 day ago',
      type: 'completion',
    },
    {
      id: '4',
      source: 'slack',
      channel: '#mobile-redesign',
      author: 'David Park',
      message: 'Question: Should we use the new color palette for the settings screen as well?',
      timestamp: '1 day ago',
      type: 'question',
    },
  ]);

  const [risks] = useState([
    {
      id: '1',
      title: 'Design approval delay',
      description: 'Stakeholder review pending for over 48 hours',
      severity: 'medium',
      status: 'active',
      detectedOn: '2026-03-08',
    },
    {
      id: '2',
      title: 'API integration dependency',
      description: 'Waiting on backend team to complete new endpoints',
      severity: 'low',
      status: 'monitoring',
      detectedOn: '2026-03-05',
    },
  ]);

  const [tasks] = useState([
    { id: '1', title: 'Complete onboarding flow', assignee: 'Sarah J.', status: 'in-progress', dueDate: '2026-03-15' },
    { id: '2', title: 'Implement dark mode', assignee: 'Mike C.', status: 'completed', dueDate: '2026-03-12' },
    { id: '3', title: 'Performance optimization', assignee: 'Emily R.', status: 'in-progress', dueDate: '2026-03-18' },
    { id: '4', title: 'Accessibility audit', assignee: 'David P.', status: 'todo', dueDate: '2026-03-20' },
  ]);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'slack':
        return <Slack className="size-4" />;
      case 'email':
        return <Mail className="size-4" />;
      case 'jira':
        return <FileText className="size-4" />;
      default:
        return <MessageSquare className="size-4" />;
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'todo':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.name}</h1>
            <p className="text-gray-600 mb-4">{project.description}</p>
            <div className="flex items-center gap-4">
              <Badge className="bg-green-100 text-green-800 border-green-200">
                {project.status}
              </Badge>
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600">Low Risk</span>
              </div>
            </div>
          </div>
          <Button>Add Update</Button>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Progress</CardDescription>
            <CardTitle className="text-3xl">{project.progress}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={project.progress} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Team Size</CardDescription>
            <CardTitle className="text-3xl">{project.team}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Users className="size-4" />
              <span>Active members</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Days Remaining</CardDescription>
            <CardTitle className="text-3xl">36</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Calendar className="size-4" />
              <span>Due {project.dueDate}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Issues</CardDescription>
            <CardTitle className="text-3xl">2</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <AlertCircle className="size-4" />
              <span>Need attention</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="timeline" className="space-y-6">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="updates">Updates</TabsTrigger>
          <TabsTrigger value="risks">Risks & Blockers</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Progress Timeline</CardTitle>
              <CardDescription>Actual vs planned progress over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="progress" stroke="#3b82f6" strokeWidth={2} name="Actual" />
                  <Line type="monotone" dataKey="planned" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Planned" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="updates">
          <Card>
            <CardHeader>
              <CardTitle>Recent Updates</CardTitle>
              <CardDescription>Activity from Slack, email, Jira, and other sources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {updates.map((update) => (
                  <div key={update.id} className="flex gap-4 p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-center size-10 rounded-lg bg-gray-100">
                      {getSourceIcon(update.source)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{update.author}</span>
                        {update.channel && (
                          <span className="text-sm text-gray-500">{update.channel}</span>
                        )}
                        <Badge variant="outline" className="text-xs capitalize">
                          {update.type}
                        </Badge>
                      </div>
                      {update.subject && (
                        <p className="text-sm font-medium text-gray-700 mb-1">{update.subject}</p>
                      )}
                      <p className="text-sm text-gray-600 mb-2">{update.message}</p>
                      <span className="text-xs text-gray-500">{update.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks">
          <Card>
            <CardHeader>
              <CardTitle>Risks & Blockers</CardTitle>
              <CardDescription>AI-detected issues that may impact project delivery</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {risks.map((risk) => (
                  <div key={risk.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{risk.title}</h3>
                        <Badge className={
                          risk.severity === 'high' ? 'bg-red-100 text-red-800' :
                          risk.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }>
                          {risk.severity}
                        </Badge>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {risk.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{risk.description}</p>
                    <span className="text-xs text-gray-500">Detected on {risk.detectedOn}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Tasks & Action Items</CardTitle>
              <CardDescription>Extracted from communications and project tools</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="size-5 text-green-600" />
                      ) : (
                        <Clock className="size-5 text-gray-400" />
                      )}
                      <div>
                        <p className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {task.title}
                        </p>
                        <p className="text-sm text-gray-600">{task.assignee}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">Due {task.dueDate}</span>
                      <Badge className={getTaskStatusColor(task.status)}>
                        {task.status.replace('-', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Project team and stakeholders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="font-semibold text-blue-600">SJ</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{project.owner}</p>
                      <p className="text-sm text-gray-600">Project Owner</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Stakeholders</h3>
                  <div className="space-y-2">
                    {project.stakeholders.map((stakeholder, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                        <div className="size-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-sm font-semibold text-gray-600">
                            {stakeholder.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <p className="text-gray-900">{stakeholder}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
