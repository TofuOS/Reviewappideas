import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Search as SearchIcon, 
  Filter,
  Mail,
  MessageSquare,
  FileText,
  Calendar,
  ExternalLink
} from 'lucide-react';

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([
    {
      id: '1',
      type: 'slack',
      channel: '#mobile-redesign',
      author: 'Sarah Johnson',
      content: 'Design review completed. Minor adjustments needed on the checkout flow. @team please review the latest mockups.',
      timestamp: '2026-03-10 14:30',
      project: 'Mobile App Redesign',
      relevance: 95,
    },
    {
      id: '2',
      type: 'email',
      subject: 'Q1 Backend Migration Update',
      author: 'Mike Chen',
      content: 'Team, the infrastructure migration is progressing well. We have completed phase 1 and are moving into phase 2 ahead of schedule.',
      timestamp: '2026-03-10 11:15',
      project: 'Backend Infrastructure Migration',
      relevance: 88,
    },
    {
      id: '3',
      type: 'jira',
      ticket: 'PORTAL-456',
      author: 'Emily Rodriguez',
      content: 'Blocker: API integration blocked - waiting on external vendor OAuth implementation. Need ETA from vendor.',
      timestamp: '2026-03-09 16:45',
      project: 'Customer Portal v2',
      relevance: 92,
    },
    {
      id: '4',
      type: 'slack',
      channel: '#analytics-dashboard',
      author: 'David Park',
      content: 'Question: Should we use the new chart library for the performance metrics, or stick with the current one?',
      timestamp: '2026-03-09 10:20',
      project: 'Analytics Dashboard',
      relevance: 75,
    },
    {
      id: '5',
      type: 'calendar',
      event: 'Sprint Planning - Mobile Team',
      author: 'Sarah Johnson',
      content: 'Sprint planning meeting to discuss Q2 roadmap and prioritize features for the next iteration.',
      timestamp: '2026-03-08 09:00',
      project: 'Mobile App Redesign',
      relevance: 70,
    },
    {
      id: '6',
      type: 'email',
      subject: 'Security Review Required',
      author: 'Security Team',
      content: 'Critical security review needed for the new authentication flow before we can proceed to production.',
      timestamp: '2026-03-07 15:30',
      project: 'Customer Portal v2',
      relevance: 85,
    },
  ]);

  const [filters, setFilters] = useState({
    source: 'all',
    project: 'all',
    dateRange: 'all',
  });

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'slack':
        return <MessageSquare className="size-5 text-purple-600" />;
      case 'email':
        return <Mail className="size-5 text-blue-600" />;
      case 'jira':
        return <FileText className="size-5 text-blue-700" />;
      case 'calendar':
        return <Calendar className="size-5 text-green-600" />;
      default:
        return <FileText className="size-5 text-gray-600" />;
    }
  };

  const getSourceBadge = (type: string) => {
    const colors: Record<string, string> = {
      slack: 'bg-purple-100 text-purple-800',
      email: 'bg-blue-100 text-blue-800',
      jira: 'bg-indigo-100 text-indigo-800',
      calendar: 'bg-green-100 text-green-800',
    };
    return (
      <Badge className={colors[type] || 'bg-gray-100 text-gray-800'}>
        {type}
      </Badge>
    );
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <mark key={index} className="bg-yellow-200 font-semibold">{part}</mark> : 
        part
    );
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Search</h1>
        <p className="text-gray-600">Find messages, updates, and information across all sources</p>
      </div>

      {/* Search Bar */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search for keywords, people, projects..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button>
              <SearchIcon className="size-4 mr-2" />
              Search
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <Select value={filters.source} onValueChange={(value) => setFilters({ ...filters, source: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="slack">Slack</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="jira">Jira</SelectItem>
                  <SelectItem value="calendar">Calendar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Select value={filters.project} onValueChange={(value) => setFilters({ ...filters, project: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  <SelectItem value="mobile">Mobile App Redesign</SelectItem>
                  <SelectItem value="backend">Backend Infrastructure</SelectItem>
                  <SelectItem value="portal">Customer Portal v2</SelectItem>
                  <SelectItem value="analytics">Analytics Dashboard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Select value={filters.dateRange} onValueChange={(value) => setFilters({ ...filters, dateRange: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Stats */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {results.length} Results
          </h2>
          <p className="text-sm text-gray-600">Sorted by relevance</p>
        </div>
        <Button variant="outline">
          <Filter className="size-4 mr-2" />
          Advanced Filters
        </Button>
      </div>

      {/* Search Results */}
      <div className="space-y-4">
        {results.map((result) => (
          <Card key={result.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="p-3 rounded-lg bg-gray-50 h-fit">
                  {getSourceIcon(result.type)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getSourceBadge(result.type)}
                        <span className="font-medium text-gray-900">{result.author}</span>
                        {result.channel && (
                          <span className="text-sm text-gray-500">{result.channel}</span>
                        )}
                        {result.ticket && (
                          <span className="text-sm text-blue-600 font-medium">{result.ticket}</span>
                        )}
                      </div>
                      {result.subject && (
                        <h3 className="font-semibold text-gray-900 mb-1">{result.subject}</h3>
                      )}
                      {result.event && (
                        <h3 className="font-semibold text-gray-900 mb-1">{result.event}</h3>
                      )}
                      <p className="text-gray-700 mb-2">
                        {highlightText(result.content, searchQuery)}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{result.timestamp}</span>
                        <span>•</span>
                        <span className="text-blue-600">{result.project}</span>
                        <span>•</span>
                        <span>{result.relevance}% relevance</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More */}
      {results.length > 0 && (
        <div className="text-center mt-8">
          <Button variant="outline">Load More Results</Button>
        </div>
      )}
    </div>
  );
}
