import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Bell, Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';

export default function NotificationRules() {
  const [rules, setRules] = useState([
    {
      id: '1',
      name: 'High Priority Blockers',
      description: 'Notify when "blocker" is mentioned 3+ times in 48 hours',
      enabled: true,
      condition: {
        type: 'keyword_frequency',
        keyword: 'blocker',
        count: 3,
        timeframe: 48,
      },
      actions: ['email', 'dashboard'],
      projects: ['all'],
    },
    {
      id: '2',
      name: 'Deadline Without Owner',
      description: 'Alert when deadline is mentioned without assigned owner',
      enabled: true,
      condition: {
        type: 'missing_owner',
        keywords: ['deadline', 'due date'],
      },
      actions: ['email', 'dashboard'],
      projects: ['all'],
    },
    {
      id: '3',
      name: 'No Updates Reminder',
      description: 'Alert if no update posted for a project in 5 days',
      enabled: true,
      condition: {
        type: 'silence_period',
        days: 5,
      },
      actions: ['email'],
      projects: ['all'],
    },
    {
      id: '4',
      name: 'Urgent Keywords',
      description: 'Immediate notification for urgent/critical mentions',
      enabled: true,
      condition: {
        type: 'keyword_match',
        keywords: ['urgent', 'critical', 'emergency'],
      },
      actions: ['email', 'dashboard', 'push'],
      projects: ['all'],
    },
    {
      id: '5',
      name: 'Missed Deadline Risk',
      description: 'Warn when project is <70% complete with <7 days to deadline',
      enabled: false,
      condition: {
        type: 'progress_risk',
        completionThreshold: 70,
        daysRemaining: 7,
      },
      actions: ['email', 'dashboard'],
      projects: ['Mobile App Redesign', 'Customer Portal v2'],
    },
  ]);

  const [isCreating, setIsCreating] = useState(false);

  const toggleRule = (id: string) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
    ));
    const rule = rules.find(r => r.id === id);
    toast.success(`Rule "${rule?.name}" ${rule?.enabled ? 'disabled' : 'enabled'}`);
  };

  const deleteRule = (id: string) => {
    const rule = rules.find(r => r.id === id);
    setRules(rules.filter(r => r.id !== id));
    toast.success(`Deleted rule "${rule?.name}"`);
  };

  const getActionBadges = (actions: string[]) => {
    const actionColors: Record<string, string> = {
      email: 'bg-blue-100 text-blue-800',
      dashboard: 'bg-purple-100 text-purple-800',
      push: 'bg-green-100 text-green-800',
    };

    return actions.map(action => (
      <Badge key={action} className={actionColors[action]} variant="outline">
        {action}
      </Badge>
    ));
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Notification Rules</h1>
            <p className="text-gray-600">Configure smart alerts and custom notification rules</p>
          </div>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4 mr-2" />
                Create Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Notification Rule</DialogTitle>
                <DialogDescription>
                  Set up a custom rule to receive notifications based on specific conditions
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="rule-name">Rule Name</Label>
                  <Input id="rule-name" placeholder="e.g., High Priority Issues" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rule-description">Description</Label>
                  <Input id="rule-description" placeholder="Describe what triggers this rule" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="condition-type">Condition Type</Label>
                  <Select>
                    <SelectTrigger id="condition-type">
                      <SelectValue placeholder="Select condition type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keyword">Keyword Detection</SelectItem>
                      <SelectItem value="frequency">Keyword Frequency</SelectItem>
                      <SelectItem value="silence">Silence Period</SelectItem>
                      <SelectItem value="progress">Progress Risk</SelectItem>
                      <SelectItem value="ownership">Missing Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notification Actions</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Switch id="action-email" />
                      <Label htmlFor="action-email">Email notification</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch id="action-dashboard" />
                      <Label htmlFor="action-dashboard">Dashboard alert</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch id="action-push" />
                      <Label htmlFor="action-push">Push notification</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projects">Apply to Projects</Label>
                  <Select>
                    <SelectTrigger id="projects">
                      <SelectValue placeholder="Select projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      <SelectItem value="mobile">Mobile App Redesign</SelectItem>
                      <SelectItem value="backend">Backend Infrastructure</SelectItem>
                      <SelectItem value="portal">Customer Portal v2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsCreating(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={() => {
                  toast.success('Notification rule created');
                  setIsCreating(false);
                }} className="flex-1">
                  Create Rule
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Rules</CardDescription>
            <CardTitle className="text-3xl">{rules.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{rules.filter(r => r.enabled).length} active rules</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Alerts This Week</CardDescription>
            <CardTitle className="text-3xl">23</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">+12% from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Email Notifications</CardDescription>
            <CardTitle className="text-3xl">47</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Sent in the last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Digest */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Daily Digest Settings</CardTitle>
          <CardDescription>Configure your daily and weekly summary emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Daily Summary</p>
              <p className="text-sm text-gray-600">Receive a daily email with all project updates</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Weekly Report</p>
              <p className="text-sm text-gray-600">Comprehensive weekly summary of all projects</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Real-time Alerts</p>
              <p className="text-sm text-gray-600">Immediate notifications for critical issues</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Rules List */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Custom Rules</h2>
        <div className="space-y-4">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg">{rule.name}</CardTitle>
                      <Badge variant={rule.enabled ? 'default' : 'outline'}>
                        {rule.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                      <div className="flex gap-1">
                        {getActionBadges(rule.actions)}
                      </div>
                    </div>
                    <CardDescription>{rule.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={rule.enabled}
                      onCheckedChange={() => toggleRule(rule.id)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Applied to: {rule.projects.includes('all') ? 'All Projects' : `${rule.projects.length} projects`}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Edit className="size-4 mr-2" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => deleteRule(rule.id)}
                    >
                      <Trash2 className="size-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
