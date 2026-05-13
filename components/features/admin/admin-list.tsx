'use client';

import { useState, useEffect } from 'react';
import { listAdminsAction } from '@/app/actions/admin/admin-management-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AdminActionsDropdown } from './admin-actions-dropdown';
import { Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function AdminList() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');

  const loadAdmins = async () => {
    setLoading(true);
    const result = await listAdminsAction({
      search: search || undefined,
      role: roleFilter !== 'all' ? (roleFilter as any) : undefined,
      status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
    });

    if (result.success) {
      setAdmins(result.admins);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAdmins();
  }, [search, roleFilter, statusFilter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Users</CardTitle>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username, email, or name..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="csr">CSR</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="super-admin">Super Admin</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading admins...
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No admins found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin._id}>
                  <TableCell className="font-medium">
                    {admin.username}
                  </TableCell>
                  <TableCell>{admin.email || '-'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        admin.role === 'super-admin' ? 'default' : 'secondary'
                      }
                    >
                      {admin.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        admin.accountStatus === 'active'
                          ? 'default'
                          : 'destructive'
                      }
                    >
                      {admin.accountStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {admin.lastLoginAt
                      ? formatDistanceToNow(new Date(admin.lastLoginAt), {
                          addSuffix: true,
                        })
                      : 'Never'}
                  </TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(admin.createdAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <AdminActionsDropdown admin={admin} onUpdate={loadAdmins} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
