import { useState } from 'react';
import { useAuth } from '../hooks/use-auth';
import { useProperties, useCreateProperty, useUpdateProperty, useDeleteProperty } from '../hooks/use-database';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner@2.0.3';
import { ArrowLeft, Plus, Home, MapPin, Search, Trash2 } from 'lucide-react';
import type { Property } from '../lib/types';

type Route = { page: 'home' } | { page: 'properties' } | { page: 'inspection-edit'; id: string } | { page: 'preview'; id: string; token?: string };

interface PropertiesPageProps {
  onNavigate: (route: Route) => void;
}

export function PropertiesPage({ onNavigate }: PropertiesPageProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);

  const { data: properties, isLoading } = useProperties(searchQuery);
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const deleteProperty = useDeleteProperty();

  const [formData, setFormData] = useState({
    title: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postcode: '',
    country: 'UK',
    bedrooms: '',
    bathrooms: '',
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      title: '',
      address_line1: '',
      address_line2: '',
      city: '',
      postcode: '',
      country: 'UK',
      bedrooms: '',
      bathrooms: '',
      notes: '',
    });
    setEditingProperty(null);
  };

  const handleOpenDialog = (property?: Property) => {
    if (property) {
      setEditingProperty(property);
      setFormData({
        title: property.title,
        address_line1: property.address_line1,
        address_line2: property.address_line2 || '',
        city: property.city,
        postcode: property.postcode,
        country: property.country,
        bedrooms: property.bedrooms?.toString() || '',
        bathrooms: property.bathrooms?.toString() || '',
        notes: property.notes || '',
      });
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.address_line1 || !formData.city || !formData.postcode) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    try {
      const propertyData = {
        title: formData.title,
        address_line1: formData.address_line1,
        address_line2: formData.address_line2 || null,
        city: formData.city,
        postcode: formData.postcode,
        country: formData.country,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        notes: formData.notes || null,
        created_by: user.id,
      };

      if (editingProperty) {
        await updateProperty.mutateAsync({
          id: editingProperty.id,
          updates: propertyData,
        });
        toast.success('Property updated');
      } else {
        await createProperty.mutateAsync(propertyData);
        toast.success('Property created');
      }

      setShowDialog(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save property');
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, property: Property) => {
    e.stopPropagation();
    setPropertyToDelete(property);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!propertyToDelete) return;

    try {
      await deleteProperty.mutateAsync(propertyToDelete.id);
      toast.success('Property and all associated inspections deleted');
      setShowDeleteDialog(false);
      setPropertyToDelete(null);
      if (editingProperty?.id === propertyToDelete.id) {
        setShowDialog(false);
        resetForm();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete property');
    }
  };

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
              <Home className="w-6 h-6 text-white" />
              <h1 className="text-white">Properties</h1>
            </div>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            size="sm"
            variant="secondary"
            className="bg-white/20 hover:bg-white/30 active:bg-white/40 text-white border-white/20 touch-active"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or postcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-input-background"
            />
          </div>
        </div>

        {/* Properties List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : properties && properties.length > 0 ? (
            properties.map((property) => (
              <Card
                key={property.id}
                className="cursor-pointer hover:shadow-md active:shadow-sm transition-all touch-card"
                onClick={() => handleOpenDialog(property)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="mb-2 truncate">{property.title}</h3>
                      <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
                        <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="truncate">{property.address_line1}</p>
                          {property.address_line2 && <p className="truncate">{property.address_line2}</p>}
                          <p className="truncate">
                            {property.city}, {property.postcode}
                          </p>
                        </div>
                      </div>
                      {(property.bedrooms || property.bathrooms) && (
                        <p className="text-sm text-muted-foreground">
                          {property.bedrooms && `${property.bedrooms} bed`}
                          {property.bedrooms && property.bathrooms && ' • '}
                          {property.bathrooms && `${property.bathrooms} bath`}
                        </p>
                      )}
                    </div>
                    <Home className="w-8 h-8 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="col-span-full">
              <CardContent className="p-8 text-center">
                <Home className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="mb-2">No properties found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Add your first property to start creating inspections'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => handleOpenDialog()} className="touch-active">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Property
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Property Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProperty ? 'Edit Property' : 'Add Property'}</DialogTitle>
            <DialogDescription>
              Enter the property details below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Property Name *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., 123 Main Street Apartment"
                className="bg-input-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address1">Address Line 1 *</Label>
              <Input
                id="address1"
                value={formData.address_line1}
                onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                placeholder="Street address"
                className="bg-input-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address2">Address Line 2</Label>
              <Input
                id="address2"
                value={formData.address_line2}
                onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                placeholder="Apartment, suite, etc."
                className="bg-input-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="bg-input-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode *</Label>
                <Input
                  id="postcode"
                  value={formData.postcode}
                  onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                  className="bg-input-background"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  min="0"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  className="bg-input-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  min="0"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  className="bg-input-background"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional property information..."
                rows={3}
                className="bg-input-background"
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {editingProperty && (
              <Button
                variant="destructive"
                onClick={(e) => {
                  setShowDialog(false);
                  handleDeleteClick(e, editingProperty);
                }}
                className="sm:mr-auto touch-active"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Property
              </Button>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:ml-auto">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="touch-active">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createProperty.isPending || updateProperty.isPending}
                className="bg-primary hover:bg-primary/90 active:bg-primary/80 touch-active"
              >
                {createProperty.isPending || updateProperty.isPending
                  ? 'Saving...'
                  : editingProperty
                  ? 'Update Property'
                  : 'Add Property'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{propertyToDelete?.title}</strong> and all associated inspections. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="touch-active">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteProperty.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground touch-active"
            >
              {deleteProperty.isPending ? 'Deleting...' : 'Delete Property'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
