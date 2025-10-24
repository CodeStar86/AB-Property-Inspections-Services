import { useState } from 'react';
import { useAuth } from '../hooks/use-auth';
import { useInspections, useProperties, useCreateInspection, useDeleteInspections } from '../hooks/use-database';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner@2.0.3';
import { Plus, ClipboardList, Home, LogOut, FileText, Filter, Search, Trash2, Shield } from 'lucide-react';
import { Input } from '../components/ui/input';
import type { InspectionType } from '../lib/types';

type Route = { page: 'home' } | { page: 'properties' } | { page: 'admin' } | { page: 'inspection-edit'; id: string } | { page: 'preview'; id: string; token?: string };

interface HomePageProps {
  onNavigate: (route: Route) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { user, signOut, userRole } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedType, setSelectedType] = useState<InspectionType>('routine');
  const [selectedInspections, setSelectedInspections] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: inspections, isLoading: inspectionsLoading } = useInspections(
    statusFilter !== 'all' ? { status: statusFilter } : undefined
  );
  const { data: properties } = useProperties();
  const createInspection = useCreateInspection();
  const deleteInspections = useDeleteInspections();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out');
    }
  };

  const handleCreateInspection = async () => {
    if (!selectedProperty) {
      toast.error('Please select a property');
      return;
    }

    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    try {
      const inspection = await createInspection.mutateAsync({
        property_id: selectedProperty,
        type: selectedType,
        created_by: user.id,
      });
      toast.success('Inspection created');
      setShowNewDialog(false);
      onNavigate({ page: 'inspection-edit', id: inspection.id });
    } catch (error: any) {
      toast.error(error.message || 'Failed to create inspection');
    }
  };

  const handleSelectAll = () => {
    if (filteredInspections) {
      setSelectedInspections(new Set(filteredInspections.map(i => i.id)));
    }
  };

  const handleDeselectAll = () => {
    setSelectedInspections(new Set());
  };

  const handleDeleteSelected = async () => {
    try {
      await deleteInspections.mutateAsync(Array.from(selectedInspections));
      toast.success(`Deleted ${selectedInspections.size} inspection${selectedInspections.size > 1 ? 's' : ''}`);
      setSelectedInspections(new Set());
      setShowDeleteDialog(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete inspections');
    }
  };

  const filteredInspections = inspections?.filter((inspection) => {
    if (typeFilter !== 'all' && inspection.type !== typeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        inspection.reference_code.toLowerCase().includes(query) ||
        inspection.property.title.toLowerCase().includes(query) ||
        inspection.property.postcode.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-primary text-white';
      case 'in_progress':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'routine':
        return 'Routine';
      case 'fire_safety':
        return 'Fire Safety';
      case 'check_in':
        return 'Check-In';
      case 'check_out':
        return 'Check-Out';
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-gradient-primary sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-white" />
            <h1 className="text-white">Clerk Inspections</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white hidden sm:inline">{user?.email}</span>
            {userRole === 'admin' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate({ page: 'admin' })}
                className="text-white hover:bg-white/20 active:bg-white/30 touch-active"
              >
                <Shield className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-white hover:bg-white/20 active:bg-white/30 touch-active">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Button
            onClick={() => setShowNewDialog(true)}
            className="bg-primary hover:bg-primary/90 active:bg-primary/80 flex-1 sm:flex-initial touch-active"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Inspection
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigate({ page: 'properties' })}
            className="flex-1 sm:flex-initial touch-active"
          >
            <Home className="w-4 h-4 mr-2" />
            Manage Properties
          </Button>
          {selectedInspections.size > 0 && (
            <>
              <Button
                variant="outline"
                onClick={selectedInspections.size === filteredInspections?.length ? handleDeselectAll : handleSelectAll}
                className="flex-1 sm:flex-initial touch-active"
              >
                {selectedInspections.size === filteredInspections?.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="flex-1 sm:flex-initial touch-active"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete {selectedInspections.size} Selected
              </Button>
            </>
          )}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by code, property..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-input-background"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-input-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="bg-input-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="fire_safety">Fire Safety</SelectItem>
                  <SelectItem value="check_in">Check-In</SelectItem>
                  <SelectItem value="check_out">Check-Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Inspections List */}
        <div className="space-y-3">
          {inspectionsLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : filteredInspections && filteredInspections.length > 0 ? (
            filteredInspections.map((inspection) => (
              <Card
                key={inspection.id}
                className={`cursor-pointer hover:shadow-md active:shadow-sm transition-all touch-card ${
                  selectedInspections.has(inspection.id) ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => onNavigate({ page: 'inspection-edit', id: inspection.id })}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="hidden pt-1 pr-1" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedInspections.has(inspection.id)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedInspections);
                          if (checked) {
                            newSelected.add(inspection.id);
                          } else {
                            newSelected.delete(inspection.id);
                          }
                          setSelectedInspections(newSelected);
                        }}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {inspection.reference_code}
                          </Badge>
                          <Badge className={getStatusColor(inspection.status)}>
                            {inspection.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <h3 className="mb-1 truncate">{inspection.property.title}</h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {getTypeLabel(inspection.type)} • {inspection.property.postcode}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Started {new Date(inspection.started_at).toLocaleDateString()}
                        </p>
                      </div>
                      <FileText className="w-8 h-8 text-muted-foreground shrink-0 hidden sm:block" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="mb-2">No inspections found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first inspection to get started'}
                </p>
                {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && (
                  <Button onClick={() => setShowNewDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Inspection
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* New Inspection Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Inspection</DialogTitle>
            <DialogDescription>
              Select a property and inspection type to begin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label>Property</label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger className="bg-input-background">
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {properties?.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.title} - {property.postcode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {properties && properties.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No properties found.{' '}
                  <button
                    onClick={() => {
                      setShowNewDialog(false);
                      onNavigate({ page: 'properties' });
                    }}
                    className="text-primary hover:underline"
                  >
                    Add a property first
                  </button>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label>Inspection Type</label>
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as InspectionType)}>
                <SelectTrigger className="bg-input-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine Inspection</SelectItem>
                  <SelectItem value="fire_safety">Fire Safety Inspection</SelectItem>
                  <SelectItem value="check_in">Check-In Inspection</SelectItem>
                  <SelectItem value="check_out">Check-Out Inspection</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateInspection}
              disabled={!selectedProperty || createInspection.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {createInspection.isPending ? 'Creating...' : 'Create Inspection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedInspections.size} inspection{selectedInspections.size > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected inspection{selectedInspections.size > 1 ? 's' : ''} and all associated data including photos, items, and preview tokens.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              disabled={deleteInspections.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteInspections.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
