import { useState } from 'react';
import { useUsers, useDeleteUser, useDeleteUserData, useInspections, useProperties } from '../hooks/use-database';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { CacheStats } from '../components/cache-stats';
import { SystemPerformance } from '../components/system-performance';
import { toast } from 'sonner@2.0.3';
import { ArrowLeft, Shield, UserX, Trash2, Users, Download, FileJson, Database, AlertTriangle } from 'lucide-react';
import type { User } from '../lib/types';
import { projectId, publicAnonKey } from '../utils/supabase/info';

type Route = { page: 'home' } | { page: 'properties' } | { page: 'admin' } | { page: 'inspection-edit'; id: string } | { page: 'preview'; id: string; token?: string };

interface AdminPageProps {
  onNavigate: (route: Route) => void;
}

export function AdminPage({ onNavigate }: AdminPageProps) {
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [showDeleteDataDialog, setShowDeleteDataDialog] = useState(false);
  const [showDeleteAllInspectionsDialog, setShowDeleteAllInspectionsDialog] = useState(false);
  const [showDeleteAllPropertiesDialog, setShowDeleteAllPropertiesDialog] = useState(false);
  const [showDeleteAllPhotosDialog, setShowDeleteAllPhotosDialog] = useState(false);
  const [showDeleteEntireDatabaseDialog, setShowDeleteEntireDatabaseDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const { data: users, isLoading, error: usersError } = useUsers();
  const { data: inspections, error: inspectionsError } = useInspections();
  const { data: properties, error: propertiesError } = useProperties();
  const deleteUser = useDeleteUser();
  const deleteUserData = useDeleteUserData();

  const handleDeleteUserClick = (user: User) => {
    setSelectedUser(user);
    setShowDeleteUserDialog(true);
  };

  const handleDeleteDataClick = (user: User) => {
    setSelectedUser(user);
    setShowDeleteDataDialog(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      await deleteUser.mutateAsync(selectedUser.id);
      toast.success(`User ${selectedUser.email} deleted successfully`);
      setShowDeleteUserDialog(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Delete user error:', error);
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const handleConfirmDeleteData = async () => {
    if (!selectedUser) return;

    try {
      const result = await deleteUserData.mutateAsync(selectedUser.id);
      toast.success(`Deleted all data for ${selectedUser.email}`);
      setShowDeleteDataDialog(false);
      setSelectedUser(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user data');
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportAllData = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/export-data`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const data = await response.json();
      
      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clerk-inspections-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Data exported successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAllInspections = async () => {
    setIsDeletingAll(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/admin/delete-all-inspections`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // If 404, fall back to manual deletion
      if (response.status === 404) {
        console.log('Endpoint not found, using fallback deletion method...');
        await deleteAllInspectionsViaBulkMethod();
        return;
      }

      const responseText = await response.text();
      
      if (!response.ok) {
        try {
          const error = JSON.parse(responseText);
          throw new Error(error.error || 'Failed to delete inspections');
        } catch (parseError) {
          console.error('Response text:', responseText);
          throw new Error(`Server error: ${response.status}`);
        }
      }

      const result = JSON.parse(responseText);
      toast.success(result.message || `Deleted ${result.deleted || 0} inspections`);
      setShowDeleteAllInspectionsDialog(false);
      onNavigate({ page: 'home' });
    } catch (error: any) {
      console.error('Delete all inspections error:', error);
      toast.error(error.message || 'Failed to delete inspections');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const deleteAllInspectionsViaBulkMethod = async () => {
    try {
      toast.info('Using alternative deletion method...');
      
      // Get all inspections
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/kv/get-by-prefix`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prefix: 'inspection:', limit: 10000 })
        }
      );

      if (!response.ok) throw new Error('Failed to fetch inspections');
      
      const data = await response.json();
      const inspections = data.values || [];
      
      let deletedCount = 0;
      
      for (const inspection of inspections) {
        if (inspection && inspection.id) {
          const id = inspection.id;
          
          // Delete inspection
          await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/kv/delete`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ key: `inspection:${id}` })
            }
          );
          
          // Delete inspection items
          await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/kv/delete`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ key: `inspection-items:${id}` })
            }
          );
          
          // Delete inspection photos index
          await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/kv/delete`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ key: `inspection-photos:${id}` })
            }
          );
          
          await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/kv/delete`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ key: `photo-index:${id}` })
            }
          );
          
          deletedCount++;
        }
      }

      toast.success(`Deleted ${deletedCount} inspections`);
      setShowDeleteAllInspectionsDialog(false);
      onNavigate({ page: 'home' });
    } catch (error: any) {
      console.error('Fallback deletion error:', error);
      throw error;
    }
  };

  const handleDeleteAllProperties = async () => {
    setIsDeletingAll(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/admin/delete-all-properties`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // If 404, fall back to manual deletion
      if (response.status === 404) {
        console.log('Endpoint not found, using fallback deletion method...');
        await deleteAllPropertiesViaBulkMethod();
        return;
      }

      const responseText = await response.text();
      
      if (!response.ok) {
        try {
          const error = JSON.parse(responseText);
          throw new Error(error.error || 'Failed to delete properties');
        } catch (parseError) {
          console.error('Response text:', responseText);
          throw new Error(`Server error: ${response.status}`);
        }
      }

      const result = JSON.parse(responseText);
      toast.success(result.message || `Deleted ${result.deleted || 0} properties`);
      setShowDeleteAllPropertiesDialog(false);
      onNavigate({ page: 'home' });
    } catch (error: any) {
      console.error('Delete all properties error:', error);
      toast.error(error.message || 'Failed to delete properties');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const deleteAllPropertiesViaBulkMethod = async () => {
    try {
      toast.info('Deleting all inspections first...');
      
      // First delete all inspections
      await deleteAllInspectionsViaBulkMethod();
      
      toast.info('Now deleting properties...');
      
      // Then delete properties
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/kv/get-by-prefix`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prefix: 'property:', limit: 10000 })
        }
      );

      if (!response.ok) throw new Error('Failed to fetch properties');
      
      const data = await response.json();
      const properties = data.values || [];
      
      let deletedCount = 0;
      
      for (const property of properties) {
        if (property && property.id) {
          await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/kv/delete`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ key: `property:${property.id}` })
            }
          );
          deletedCount++;
        }
      }

      toast.success(`Deleted ${deletedCount} properties and all inspections`);
      setShowDeleteAllPropertiesDialog(false);
      onNavigate({ page: 'home' });
    } catch (error: any) {
      console.error('Fallback deletion error:', error);
      throw error;
    }
  };

  const handleDeleteAllPhotos = async () => {
    setIsDeletingAll(true);
    try {
      // Try the new endpoint first
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/admin/delete-all-photos`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // If 404, fall back to manual deletion using KV endpoints
      if (response.status === 404) {
        console.log('Endpoint not found, using fallback deletion method...');
        await deleteAllPhotosViaBulkMethod();
        return;
      }

      const responseText = await response.text();
      
      if (!response.ok) {
        try {
          const error = JSON.parse(responseText);
          throw new Error(error.error || 'Failed to delete photos');
        } catch (parseError) {
          console.error('Response text:', responseText);
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }

      const result = JSON.parse(responseText);
      toast.success(result.message || `Deleted ${result.deleted || 0} photos from database`);
      setShowDeleteAllPhotosDialog(false);
      onNavigate({ page: 'home' });
    } catch (error: any) {
      console.error('Delete all photos error:', error);
      toast.error(error.message || 'Failed to delete photos');
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Fallback method using existing KV endpoints
  const deleteAllPhotosViaBulkMethod = async () => {
    try {
      toast.info('Using alternative deletion method...');
      
      // Get all inspections to find photo-data keys
      const inspResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/kv/get-by-prefix`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prefix: 'inspection:', limit: 10000 })
        }
      );

      if (!inspResponse.ok) throw new Error('Failed to fetch inspections');
      
      const inspData = await inspResponse.json();
      const inspections = inspData.values || [];
      
      let deletedCount = 0;
      
      // For each inspection, get and delete its photo-data
      for (const inspection of inspections) {
        if (inspection && inspection.id) {
          const photoResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/kv/get-by-prefix`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ prefix: `photo-data:${inspection.id}:`, limit: 1000 })
            }
          );

          if (photoResponse.ok) {
            const photoData = await photoResponse.json();
            const photos = photoData.values || [];
            
            // Delete each photo
            for (const photo of photos) {
              if (photo && photo.id) {
                await fetch(
                  `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/kv/delete`,
                  {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${publicAnonKey}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ key: `photo-data:${inspection.id}:${photo.id}` })
                  }
                );
                deletedCount++;
              }
            }
          }
        }
      }

      toast.success(`Deleted ${deletedCount} photos from database`);
      setShowDeleteAllPhotosDialog(false);
      onNavigate({ page: 'home' });
    } catch (error: any) {
      console.error('Fallback deletion error:', error);
      throw error;
    }
  };

  const handleDeleteEntireDatabase = async () => {
    setIsDeletingAll(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/admin/delete-all-data`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // If 404, fall back to manual deletion
      if (response.status === 404) {
        console.log('Endpoint not found, using fallback deletion method...');
        await deleteEntireDatabaseViaBulkMethod();
        return;
      }

      const responseText = await response.text();
      
      if (!response.ok) {
        try {
          const error = JSON.parse(responseText);
          throw new Error(error.error || 'Failed to delete all data');
        } catch (parseError) {
          console.error('Response text:', responseText);
          throw new Error(`Server error: ${response.status}`);
        }
      }

      const result = JSON.parse(responseText);
      toast.success(result.message || 'All data deleted from database');
      setShowDeleteEntireDatabaseDialog(false);
      onNavigate({ page: 'home' });
    } catch (error: any) {
      console.error('Delete entire database error:', error);
      toast.error(error.message || 'Failed to delete all data');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const deleteEntireDatabaseViaBulkMethod = async () => {
    try {
      toast.info('Nuclear deletion in progress... This may take a while.');
      
      let totalDeleted = 0;
      
      // Delete all inspections and photos
      const inspResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/kv/get-by-prefix`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prefix: 'inspection:', limit: 10000 })
        }
      );

      if (inspResponse.ok) {
        const inspData = await inspResponse.json();
        const inspections = inspData.values || [];
        
        for (const inspection of inspections) {
          if (inspection && inspection.id) {
            const id = inspection.id;
            
            // Delete all photo data for this inspection
            const photoResponse = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/kv/get-by-prefix`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${publicAnonKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prefix: `photo-data:${id}:`, limit: 1000 })
              }
            );
            
            if (photoResponse.ok) {
              const photoData = await photoResponse.json();
              const photos = photoData.values || [];
              
              for (const photo of photos) {
                if (photo && photo.id) {
                  await fetch(
                    `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/kv/delete`,
                    {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${publicAnonKey}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ key: `photo-data:${id}:${photo.id}` })
                    }
                  );
                  totalDeleted++;
                }
              }
            }
            
            // Delete inspection-related keys
            await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/kv/delete`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${publicAnonKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ key: `inspection:${id}` })
              }
            );
            
            await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/kv/delete`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${publicAnonKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ key: `inspection-items:${id}` })
              }
            );
            
            await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/kv/delete`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${publicAnonKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ key: `inspection-photos:${id}` })
              }
            );
            
            await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/kv/delete`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${publicAnonKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ key: `photo-index:${id}` })
              }
            );
            
            totalDeleted += 4;
          }
        }
      }
      
      // Delete all properties
      const propResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/kv/get-by-prefix`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prefix: 'property:', limit: 10000 })
        }
      );

      if (propResponse.ok) {
        const propData = await propResponse.json();
        const properties = propData.values || [];
        
        for (const property of properties) {
          if (property && property.id) {
            await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/kv/delete`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${publicAnonKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ key: `property:${property.id}` })
              }
            );
            totalDeleted++;
          }
        }
      }
      
      // Delete preview tokens
      const tokenResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/kv/get-by-prefix`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prefix: 'preview-token:', limit: 10000 })
        }
      );

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        const tokens = tokenData.values || [];
        
        for (const token of tokens) {
          if (token && token.token) {
            await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/kv/delete`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${publicAnonKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ key: `preview-token:${token.token}` })
              }
            );
            totalDeleted++;
          }
        }
      }

      toast.success(`Nuclear deletion complete! Deleted ${totalDeleted}+ records`);
      setShowDeleteEntireDatabaseDialog(false);
      onNavigate({ page: 'home' });
    } catch (error: any) {
      console.error('Fallback deletion error:', error);
      throw error;
    }
  };

  const clerkUsers = users?.filter(u => u.role === 'clerk') || [];
  const adminUsers = users?.filter(u => u.role === 'admin') || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-gradient-primary sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate({ page: 'home' })}
              className="text-white hover:bg-white/20 active:bg-white/30 touch-active"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-white" />
              <h1 className="text-white">Admin Dashboard</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Error Display */}
        {(usersError || inspectionsError || propertiesError) && (
          <div className="mb-6 p-4 border border-destructive/50 rounded-lg bg-destructive/5">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive mb-1">Failed to load admin data</p>
                <p className="text-xs text-muted-foreground">
                  {usersError?.message || inspectionsError?.message || propertiesError?.message || 'Unknown error occurred'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* System Performance */}
        <div className="mb-6">
          <SystemPerformance 
            users={users || []}
            inspectionsCount={inspections?.length || 0}
            propertiesCount={properties?.length || 0}
            isLoading={isLoading}
          />
        </div>

        <div className="mb-6">
          <h2 className="mb-2">User Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage clerk accounts and their data. Deleting a user removes their account, while deleting data removes all properties and inspections they created.
          </p>
        </div>

        {/* Admin Users */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Administrators ({adminUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : adminUsers.length > 0 ? (
              <div className="space-y-2">
                {adminUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 border rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="truncate">{user.email}</p>
                          <Badge variant="default" className="shrink-0">Admin</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Created: {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No admin users found
              </p>
            )}
          </CardContent>
        </Card>

        {/* Photo Cache Stats */}
        <div className="mb-6">
          <CacheStats />
        </div>

        {/* Database Management */}
        <Card className="mb-6 border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Database className="w-5 h-5" />
              Database Management (Danger Zone)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 border border-yellow-500/50 rounded-lg bg-yellow-500/5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium mb-1">Warning: Irreversible Actions</p>
                  <p className="text-xs text-muted-foreground">
                    These operations permanently delete data from Supabase. Always export data before deletion.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="p-3 border rounded-lg flex items-center justify-between gap-3">
                <div className="flex-1">
                  <h4 className="text-sm font-medium">Delete All Inspections</h4>
                  <p className="text-xs text-muted-foreground">
                    Remove all {inspections?.length || 0} inspections (keeps properties)
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteAllInspectionsDialog(true)}
                  disabled={!inspections?.length}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All
                </Button>
              </div>

              <div className="p-3 border rounded-lg flex items-center justify-between gap-3">
                <div className="flex-1">
                  <h4 className="text-sm font-medium">Delete All Properties</h4>
                  <p className="text-xs text-muted-foreground">
                    Remove all {properties?.length || 0} properties (and their inspections)
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteAllPropertiesDialog(true)}
                  disabled={!properties?.length}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All
                </Button>
              </div>

              <div className="p-3 border rounded-lg flex items-center justify-between gap-3">
                <div className="flex-1">
                  <h4 className="text-sm font-medium">Delete All Photo Data</h4>
                  <p className="text-xs text-muted-foreground">
                    Remove all photos from database (keeps inspection metadata)
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteAllPhotosDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All
                </Button>
              </div>

              <div className="p-3 border border-destructive rounded-lg bg-destructive/5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-destructive">⚠️ Delete Entire Database</h4>
                    <p className="text-xs text-muted-foreground">
                      Nuclear option: Remove ALL data (users, properties, inspections, photos)
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteEntireDatabaseDialog(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Everything
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Protection Tools */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Data Protection & Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Export All System Data (GDPR)</h3>
                  <p className="text-sm text-muted-foreground">
                    Download a complete copy of all system data in JSON format. Includes users, properties, inspections, and photo metadata.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportAllData}
                  disabled={isExporting}
                  className="shrink-0"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isExporting ? 'Exporting...' : 'Export'}
                </Button>
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-muted/50">
              <h3 className="font-medium mb-2">Data Retention Policy</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Active user data: Retained while account is active</li>
                <li>Deleted data: Permanently removed within 30 days</li>
                <li>Audit logs: Retained for compliance purposes</li>
                <li>Inspection reports: Retained according to organization policy</li>
              </ul>
            </div>

            <div className="p-4 border rounded-lg bg-muted/50">
              <h3 className="font-medium mb-2">Compliance Features</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>GDPR-compliant data export functionality</li>
                <li>Right to erasure (delete user data)</li>
                <li>Audit trail for all user actions</li>
                <li>Encrypted data transmission (HTTPS)</li>
                <li>Role-based access control (RBAC)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Clerk Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Clerks ({clerkUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : clerkUsers.length > 0 ? (
              <div className="space-y-3">
                {clerkUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="truncate">{user.email}</p>
                          <Badge variant="secondary" className="shrink-0">Clerk</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Created: {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto sm:shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDataClick(user)}
                          className="touch-active flex-1 sm:flex-none"
                        >
                          <Trash2 className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Delete Data</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUserClick(user)}
                          className="touch-active flex-1 sm:flex-none"
                        >
                          <UserX className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Delete User</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No clerk users found
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Delete User Dialog */}
      <AlertDialog open={showDeleteUserDialog} onOpenChange={setShowDeleteUserDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user account for <strong>{selectedUser?.email}</strong>.
              <br /><br />
              <strong>Important:</strong> This will remove their login access but will NOT delete their created data (properties and inspections). To delete their data, use the "Delete Data" button instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="touch-active">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteUser}
              disabled={deleteUser.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground touch-active"
            >
              {deleteUser.isPending ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Data Dialog */}
      <AlertDialog open={showDeleteDataDialog} onOpenChange={setShowDeleteDataDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all properties and inspections created by <strong>{selectedUser?.email}</strong>.
              <br /><br />
              <strong>Important:</strong> This action cannot be undone. The user account will remain active, but all their data will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="touch-active">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteData}
              disabled={deleteUserData.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground touch-active"
            >
              {deleteUserData.isPending ? 'Deleting...' : 'Delete All Data'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Inspections Dialog */}
      <AlertDialog open={showDeleteAllInspectionsDialog} onOpenChange={setShowDeleteAllInspectionsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Inspections?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all <strong>{inspections?.length || 0} inspections</strong> from the database, including all photos and inspection items.
              <br /><br />
              Properties will NOT be deleted and can be reused.
              <br /><br />
              <strong className="text-destructive">⚠️ This action cannot be undone!</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAll}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllInspections}
              disabled={isDeletingAll}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeletingAll ? 'Deleting...' : 'Delete All Inspections'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Properties Dialog */}
      <AlertDialog open={showDeleteAllPropertiesDialog} onOpenChange={setShowDeleteAllPropertiesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Properties?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all <strong>{properties?.length || 0} properties</strong> and ALL associated inspections and photos.
              <br /><br />
              <strong className="text-destructive">⚠️ This is a cascading delete and cannot be undone!</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAll}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllProperties}
              disabled={isDeletingAll}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeletingAll ? 'Deleting...' : 'Delete All Properties'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Photos Dialog */}
      <AlertDialog open={showDeleteAllPhotosDialog} onOpenChange={setShowDeleteAllPhotosDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Photo Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete ALL photo data from the Supabase database, including base64 image data.
              <br /><br />
              Inspection metadata will remain, but photos will show as missing.
              <br /><br />
              <strong className="text-destructive">⚠️ This action cannot be undone!</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAll}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllPhotos}
              disabled={isDeletingAll}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeletingAll ? 'Deleting...' : 'Delete All Photos'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Entire Database Dialog */}
      <AlertDialog open={showDeleteEntireDatabaseDialog} onOpenChange={setShowDeleteEntireDatabaseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">⚠️ Delete Entire Database?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p className="font-semibold text-destructive">
                  NUCLEAR OPTION: This will delete EVERYTHING from Supabase:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>All {users?.length || 0} users (except current admin)</li>
                  <li>All {properties?.length || 0} properties</li>
                  <li>All {inspections?.length || 0} inspections</li>
                  <li>All photos and metadata</li>
                  <li>All preview tokens</li>
                  <li>All KV store data</li>
                </ul>
                <p className="font-semibold text-destructive pt-2">
                  ⚠️ THIS CANNOT BE UNDONE! Export data first!
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAll}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEntireDatabase}
              disabled={isDeletingAll}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeletingAll ? 'Deleting Everything...' : 'Yes, Delete Everything'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
