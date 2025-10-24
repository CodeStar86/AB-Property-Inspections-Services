import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Skeleton } from './ui/skeleton';
import { Activity, Users, FileText, Database, TrendingUp, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import type { User } from '../lib/types';

interface SystemPerformanceProps {
  users: User[];
  inspectionsCount: number;
  propertiesCount: number;
  isLoading?: boolean;
}

export function SystemPerformance({ users, inspectionsCount, propertiesCount, isLoading }: SystemPerformanceProps) {
  // Show loading state
  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-primary" />
                System Performance
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Real-time monitoring for 100+ users scale
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-12 w-full" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate metrics
  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const clerkCount = users.filter(u => u.role === 'clerk').length;
  
  // Estimate data usage (rough calculation)
  // Assuming ~0.1 MB per inspection on average (metadata + small photo refs)
  const estimatedDataMB = (inspectionsCount * 0.1).toFixed(1);
  
  // User capacity (assuming 100 users scale)
  const userCapacity = (totalUsers / 100) * 100;
  
  // Data usage (500 MB free tier)
  const dataUsagePercent = (parseFloat(estimatedDataMB) / 500) * 100;
  
  // System status
  const getSystemStatus = () => {
    if (userCapacity > 80 || dataUsagePercent > 80) {
      return { label: 'Warning', color: 'yellow', icon: AlertCircle };
    } else if (userCapacity > 50 || dataUsagePercent > 50) {
      return { label: 'Good', color: 'blue', icon: Info };
    } else {
      return { label: 'Optimal', color: 'green', icon: CheckCircle2 };
    }
  };
  
  const systemStatus = getSystemStatus();
  const StatusIcon = systemStatus.icon;
  
  // Free tier status
  const isFreeTierSufficient = dataUsagePercent < 80;
  
  // System message
  const getSystemMessage = () => {
    if (userCapacity > 80 || dataUsagePercent > 80) {
      return 'System approaching capacity limits. Consider upgrading.';
    } else if (userCapacity > 50 || dataUsagePercent > 50) {
      return 'System performance is good. Monitor usage regularly.';
    } else {
      return 'System running optimally. No action needed.';
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-primary" />
              System Performance
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Real-time monitoring for 100+ users scale
            </p>
          </div>
          <Badge 
            variant={systemStatus.color === 'green' ? 'default' : systemStatus.color === 'yellow' ? 'secondary' : 'outline'}
            className={
              systemStatus.color === 'green' 
                ? 'bg-green-500/10 text-green-700 border-green-500/20 hover:bg-green-500/20' 
                : systemStatus.color === 'yellow'
                ? 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20'
                : ''
            }
          >
            <StatusIcon className="w-3 h-3 mr-1" />
            {systemStatus.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Total Users */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <div className="flex items-start justify-between gap-2 mb-2">
              <Users className="w-5 h-5 text-primary shrink-0" />
              <span className="text-2xl font-semibold">{totalUsers}</span>
            </div>
            <p className="text-sm font-medium mb-1">Total Users</p>
            <p className="text-xs text-muted-foreground">
              {adminCount} admin{adminCount !== 1 ? 's' : ''} • {clerkCount} clerk{clerkCount !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Inspections */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <div className="flex items-start justify-between gap-2 mb-2">
              <FileText className="w-5 h-5 text-primary shrink-0" />
              <span className="text-2xl font-semibold">{inspectionsCount}</span>
            </div>
            <p className="text-sm font-medium mb-1">Inspections</p>
            <p className="text-xs text-muted-foreground">
              ~{estimatedDataMB} MB data
            </p>
          </div>

          {/* Properties */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <div className="flex items-start justify-between gap-2 mb-2">
              <Database className="w-5 h-5 text-primary shrink-0" />
              <span className="text-2xl font-semibold">{propertiesCount}</span>
            </div>
            <p className="text-sm font-medium mb-1">Properties</p>
            <p className="text-xs text-muted-foreground">
              {isFreeTierSufficient ? 'Free tier sufficient' : 'Consider upgrade'}
            </p>
          </div>
        </div>

        {/* Status Message */}
        <div className={`p-3 border rounded-lg ${
          systemStatus.color === 'green' 
            ? 'bg-green-500/5 border-green-500/20' 
            : systemStatus.color === 'yellow'
            ? 'bg-yellow-500/5 border-yellow-500/20'
            : 'bg-red-500/5 border-red-500/20'
        }`}>
          <p className="text-sm">{getSystemMessage()}</p>
        </div>

        {/* Capacity Indicators */}
        <div className="space-y-3">
          {/* User Capacity */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">User Capacity</span>
              </div>
              <span className="text-sm text-muted-foreground">{Math.round(userCapacity)}%</span>
            </div>
            <Progress 
              value={userCapacity} 
              className="h-2"
            />
          </div>

          {/* Data Usage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Data Usage</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {dataUsagePercent.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={dataUsagePercent} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              of 500 MB free tier
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
