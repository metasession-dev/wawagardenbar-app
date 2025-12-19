import { Suspense } from 'react';
import { AuditLogService } from '@/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

/**
 * Get audit logs
 */
async function getAuditLogs() {
  const result = await AuditLogService.getLogs({}, 1, 50);
  return result.logs;
}

/**
 * Audit logs table
 */
async function AuditLogsTable() {
  const logs = await getAuditLogs();

  function getActionColor(action: string): 'default' | 'secondary' | 'destructive' {
    if (action.includes('delete') || action.includes('cancel')) {
      return 'destructive';
    }
    if (action.includes('create')) {
      return 'default';
    }
    return 'secondary';
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Logs</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log._id.toString()}>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(log.createdAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{log.userEmail}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {log.userRole}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActionColor(log.action)}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {log.resource}
                      </p>
                      {log.resourceId && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {log.resourceId.slice(0, 8)}...
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {log.details && (
                      <pre className="text-xs text-muted-foreground overflow-hidden text-ellipsis">
                        {JSON.stringify(log.details, null, 2).slice(0, 100)}...
                      </pre>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton
 */
function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Audit logs page
 */
export default async function AuditLogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">
          Track all admin actions and system changes
        </p>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <AuditLogsTable />
      </Suspense>
    </div>
  );
}
