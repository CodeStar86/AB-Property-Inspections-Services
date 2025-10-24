import { useState, useEffect, useRef, useMemo } from 'react';
import { useInspection, useInspectionPhotos, useUpdateInspection, useUpdateInspectionItem, useCompleteInspection, useAddInspectionSection, batchFetchPhotoData } from '../hooks/use-database';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { PhotoUploader } from '../components/photo-uploader';
import { toast } from 'sonner@2.0.3';
import { ArrowLeft, Save, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import type { InspectionItem, Photo } from '../lib/types';

type Route = { page: 'home' } | { page: 'properties' } | { page: 'inspection-edit'; id: string } | { page: 'preview'; id: string; token?: string };

interface InspectionEditPageProps {
  id: string;
  onNavigate: (route: Route) => void;
}

export function InspectionEditPage({ id, onNavigate }: InspectionEditPageProps) {
  const { data: inspection, isLoading } = useInspection(id);
  const { data: photos = [] } = useInspectionPhotos(id);
  const updateInspection = useUpdateInspection();
  const updateItem = useUpdateInspectionItem();
  const completeInspection = useCompleteInspection();
  const addSection = useAddInspectionSection();

  const [summaryNotes, setSummaryNotes] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [localItems, setLocalItems] = useState<Record<string, Partial<InspectionItem>>>({});
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const isEditingField = useRef<Set<string>>(new Set());
  const [showAddRoomDialog, setShowAddRoomDialog] = useState(false);
  const [selectedRoomType, setSelectedRoomType] = useState<string>('bedroom');

  useEffect(() => {
    if (inspection) {
      setSummaryNotes(inspection.summary_notes || '');
      // Initialize local items state only if not already set
      setLocalItems(prev => {
        const initial: Record<string, Partial<InspectionItem>> = {};
        inspection.items?.forEach(item => {
          const fieldKey = `${item.id}-answer_text`;
          const notesKey = `${item.id}-notes`;
          
          // Keep existing local state if user is actively typing
          // Otherwise sync with server data
          initial[item.id] = {
            answer_text: isEditingField.current.has(fieldKey) 
              ? prev[item.id]?.answer_text 
              : item.answer_text,
            notes: isEditingField.current.has(notesKey)
              ? prev[item.id]?.notes
              : item.notes,
          };
        });
        return initial;
      });
    }
  }, [inspection?.id]); // Only re-run if inspection ID changes, not on every update

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSave = async () => {
    if (!inspection) return;

    try {
      await updateInspection.mutateAsync({
        id: inspection.id,
        updates: {
          summary_notes: summaryNotes || null,
          status: inspection.status === 'draft' ? 'in_progress' : inspection.status,
        },
      });
      setHasUnsavedChanges(false);
      toast.success('Inspection saved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save inspection');
    }
  };

  const handleComplete = async () => {
    if (!inspection) return;

    if (!confirm('Complete this inspection? A preview will be generated for printing/sharing.')) {
      return;
    }

    try {
      const result = await completeInspection.mutateAsync(inspection.id);
      toast.success('Inspection completed!');
      
      // Pre-cache all photos in the background for instant "New Window" loading
      const photoIds = photos.map(p => p.id);
      if (photoIds.length > 0) {
        // Don't await - let it run in background
        batchFetchPhotoData(inspection.id, photoIds).then(() => {
          console.log('✅ Photos pre-cached after completion');
        }).catch(err => {
          console.error('⚠️ Photo pre-cache failed (non-critical):', err);
        });
      }
      
      // Navigate to preview page with token in the same window
      onNavigate({ page: 'preview', id: inspection.id, token: result.token });
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete inspection');
    }
  };

  const handleAddRoom = async () => {
    if (!inspection) return;
    
    try {
      // Count existing rooms of this type to determine the number
      const existingSections = sectionNames.filter(name => {
        if (selectedRoomType === 'bedroom') return name.includes('Bedroom');
        if (selectedRoomType === 'bathroom') return name.includes('Bathroom');
        if (selectedRoomType === 'living_room') return name.includes('Living Room');
        if (selectedRoomType === 'kitchen') return name.includes('Kitchen');
        return false;
      });
      
      const sectionNumber = existingSections.length + 1;
      
      await addSection.mutateAsync({
        inspectionId: inspection.id,
        sectionType: selectedRoomType,
        sectionNumber,
      });
      
      toast.success('Room added successfully!');
      setShowAddRoomDialog(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add room');
    }
  };

  const handleItemUpdate = async (itemId: string, updates: Partial<InspectionItem>) => {
    try {
      await updateItem.mutateAsync({ id: itemId, updates });
      setHasUnsavedChanges(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update item');
    }
  };

  const handleTextUpdate = (itemId: string, field: 'answer_text' | 'notes', value: string) => {
    const fieldKey = `${itemId}-${field}`;
    
    // Mark this field as being edited
    isEditingField.current.add(fieldKey);
    
    // Update local state immediately for instant UI feedback
    setLocalItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
    setHasUnsavedChanges(true);

    // Clear existing timer
    if (debounceTimers.current[fieldKey]) {
      clearTimeout(debounceTimers.current[fieldKey]);
    }

    // Set new timer to update database after 500ms of no typing
    debounceTimers.current[fieldKey] = setTimeout(() => {
      handleItemUpdate(itemId, { [field]: value });
      delete debounceTimers.current[fieldKey];
      // Remove editing flag after update completes
      setTimeout(() => {
        isEditingField.current.delete(fieldKey);
      }, 100);
    }, 500);
  };

  // Group items by section - memoized to prevent recalculation on every render
  // MUST be called before any conditional returns to satisfy Rules of Hooks
  const sections = useMemo(() => {
    return inspection?.items?.reduce((acc, item) => {
      if (!acc[item.section]) {
        acc[item.section] = [];
      }
      acc[item.section].push(item);
      return acc;
    }, {} as Record<string, InspectionItem[]>) || {};
  }, [inspection?.items]);

  const sectionNames = useMemo(() => Object.keys(sections), [sections]);

  // Memoize photos by item_id for efficient filtering
  const photosByItemId = useMemo(() => {
    const map = new Map<string, Photo[]>();
    photos?.forEach(photo => {
      if (photo.item_id) {
        if (!map.has(photo.item_id)) {
          map.set(photo.item_id, []);
        }
        map.get(photo.item_id)!.push(photo);
      }
    });
    return map;
  }, [photos]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-gradient-primary sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3">
            <Skeleton className="h-6 w-48" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 max-w-4xl">
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <h2 className="mb-2">Inspection not found</h2>
          <Button onClick={() => onNavigate({ page: 'home' })}>Go to Home</Button>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="border-b bg-gradient-primary sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (hasUnsavedChanges && !confirm('You have unsaved changes. Leave anyway?')) {
                    return;
                  }
                  onNavigate({ page: 'home' });
                }}
                className="text-white hover:bg-white/20 active:bg-white/30 shrink-0 touch-active"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-white truncate">{inspection.property.title}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs text-white border-white/40">
                    {inspection.reference_code}
                  </Badge>
                  <Badge className={`text-xs ${getStatusColor(inspection.status)}`}>
                    {inspection.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <Tabs defaultValue={sectionNames[0] || 'summary'} className="space-y-4">
          <div className="sticky top-0 z-10 bg-background pb-3 -mx-4 px-4">
            <div className="flex items-center justify-between mb-2 px-4">
              <h2 className="text-sm text-muted-foreground">Sections</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddRoomDialog(true)}
                className="h-8"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Room
              </Button>
            </div>
            <div className="relative">
              <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
                <TabsList className="inline-flex h-auto items-center gap-2 bg-transparent p-0 border-b border-border w-full min-w-max">
                  {sectionNames.map((section) => {
                    // Extract emoji from section name if it exists
                    const emojiMatch = section.match(/^([\p{Emoji}]+)\s*/u);
                    const emoji = emojiMatch ? emojiMatch[1] : '';
                    const cleanName = section.replace(/^[\p{Emoji}\s]+/u, '');
                    
                    return (
                      <TabsTrigger 
                        key={section} 
                        value={section} 
                        className="relative flex-shrink-0 bg-transparent px-3 py-3 text-xs sm:text-sm transition-colors border-0 shadow-none rounded-none text-muted-foreground data-[state=active]:text-[#2EC4B6] data-[state=active]:bg-transparent hover:text-foreground data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-[#2EC4B6] max-w-[120px] sm:max-w-none truncate"
                        title={cleanName}
                      >
                        <span className="truncate">{cleanName}</span>
                      </TabsTrigger>
                    );
                  })}
                  <TabsTrigger 
                    value="summary" 
                    className="relative flex-shrink-0 bg-transparent px-3 py-3 text-xs sm:text-sm transition-colors border-0 shadow-none rounded-none text-muted-foreground data-[state=active]:text-[#2EC4B6] data-[state=active]:bg-transparent hover:text-foreground data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-[#2EC4B6]"
                  >
                    Summary
                  </TabsTrigger>
                </TabsList>
              </div>
              {/* Scroll fade indicators */}
              <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-background to-transparent" />
            </div>
          </div>

          {/* Section Tabs */}
          {sectionNames.map((sectionName) => {
            return (
              <TabsContent key={sectionName} value={sectionName} className="space-y-4">
                {sections[sectionName].map((item) => (
                  <Card key={item.id}>
                    <CardHeader>
                      <CardTitle>
                        {item.question}
                      </CardTitle>
                    </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Render based on question type - with fallback for old inspections */}
                    {(item.question_type === 'boolean' || 
                      (!item.question_type && (
                        item.question.toLowerCase().includes('working') ||
                        item.question.toLowerCase().includes('tested') ||
                        item.question.toLowerCase().includes('present') ||
                        item.question.toLowerCase().includes('clear') ||
                        item.question.toLowerCase().includes('?')
                      ))) ? (
                      <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1 gap-1">
                        <button
                          type="button"
                          onClick={() => handleItemUpdate(item.id, { answer_boolean: true })}
                          className={`min-h-[44px] px-6 py-2 rounded-md transition-all touch-manipulation select-none active:scale-95 ${
                            item.answer_boolean 
                              ? 'bg-primary text-primary-foreground shadow-sm' 
                              : 'bg-transparent text-muted-foreground hover:text-foreground active:bg-muted/50'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => handleItemUpdate(item.id, { answer_boolean: false })}
                          className={`min-h-[44px] px-6 py-2 rounded-md transition-all touch-manipulation select-none active:scale-95 ${
                            item.answer_boolean === false
                              ? 'bg-primary text-primary-foreground shadow-sm' 
                              : 'bg-transparent text-muted-foreground hover:text-foreground active:bg-muted/50'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    ) : (item.question_type === 'select' && item.question_options) || 
                       (!item.question_type && (
                         item.question.toLowerCase().includes('condition') ||
                         item.question.toLowerCase().includes('rating') ||
                         item.question.toLowerCase().includes('overall')
                       )) ? (
                      <Select
                        value={item.answer_select || ''}
                        onValueChange={(value) =>
                          handleItemUpdate(item.id, { answer_select: value })
                        }
                      >
                        <SelectTrigger className="bg-input-background">
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          {item.question_options ? (
                            item.question_options.map((option) => (
                              <SelectItem key={option.toLowerCase()} value={option.toLowerCase()}>
                                {option}
                              </SelectItem>
                            ))
                          ) : (
                            <>
                              <SelectItem value="excellent">Excellent</SelectItem>
                              <SelectItem value="good">Good</SelectItem>
                              <SelectItem value="fair">Fair</SelectItem>
                              <SelectItem value="poor">Poor</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="space-y-1">
                        {item.answer_text && (
                          item.question.toLowerCase().includes('address') || 
                          item.question.toLowerCase().includes('date of')
                        ) && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              ✓ Auto-filled
                            </span>
                          </div>
                        )}
                        <Textarea
                          value={localItems[item.id]?.answer_text ?? item.answer_text ?? ''}
                          onChange={(e) =>
                            handleTextUpdate(item.id, 'answer_text', e.target.value)
                          }
                          placeholder="Enter your answer..."
                          rows={2}
                          className="bg-input-background"
                        />
                      </div>
                    )}
                    {/* Notes */}
                    <Textarea
                      value={localItems[item.id]?.notes ?? item.notes ?? ''}
                      onChange={(e) =>
                        handleTextUpdate(item.id, 'notes', e.target.value)
                      }
                      placeholder="Additional notes..."
                      rows={2}
                      className="bg-input-background"
                    />
                    {/* Photo Upload for this question */}
                    <div className="pt-2 border-t border-border">
                      <PhotoUploader
                        inspectionId={inspection.id}
                        photos={photosByItemId.get(item.id) || []}
                        section={sectionName}
                        itemId={item.id}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            );
          })}

          {/* Summary Tab */}
          <TabsContent value="summary">
            <Card>
              <CardHeader>
                <CardTitle>Summary Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={summaryNotes}
                  onChange={(e) => {
                    setSummaryNotes(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Add overall summary notes for this inspection..."
                  rows={8}
                  className="bg-input-background"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white shadow-lg z-50 no-print">
        <div className="container mx-auto px-4 py-3 max-w-4xl">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSave}
              disabled={updateInspection.isPending}
              variant="outline"
              className="flex-1 touch-active"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateInspection.isPending ? 'Saving...' : 'Save Draft'}
            </Button>
            {inspection.status !== 'completed' && (
              <Button
                onClick={handleComplete}
                disabled={completeInspection.isPending}
                className="flex-1 bg-primary hover:bg-primary/90 active:bg-primary/80 touch-active"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {completeInspection.isPending ? 'Completing...' : 'Complete Inspection'}
              </Button>
            )}
            {inspection.status === 'completed' && (
              <Button
                onClick={() => {
                  // Navigate to preview page (authenticated view)
                  onNavigate({ page: 'preview', id: inspection.id });
                }}
                className="flex-1 bg-primary hover:bg-primary/90 active:bg-primary/80 touch-active"
              >
                View Preview
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Add Room Dialog */}
      <Dialog open={showAddRoomDialog} onOpenChange={setShowAddRoomDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Additional Room</DialogTitle>
            <DialogDescription>
              Select the type of room you want to add to this inspection.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Room Type</Label>
              <Select value={selectedRoomType} onValueChange={setSelectedRoomType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bedroom">🛏️ Bedroom</SelectItem>
                  <SelectItem value="bathroom">🚿 Bathroom</SelectItem>
                  <SelectItem value="living_room">🛋️ Living Room</SelectItem>
                  <SelectItem value="kitchen">🍳 Kitchen</SelectItem>
                  <SelectItem value="other">📦 Other Room</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRoomDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRoom} disabled={addSection.isPending}>
              {addSection.isPending ? 'Adding...' : 'Add Room'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
