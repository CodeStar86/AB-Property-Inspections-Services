import { useState, useEffect } from 'react';
import { useInspection, useInspectionPhotos, batchFetchPhotoData } from '../hooks/use-database';
import { Button } from '../components/ui/button';
import { LazyPhoto } from '../components/lazy-photo';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Separator } from '../components/ui/separator';
import { AlertCircle, Printer, Download, Share2, CheckCircle2, XCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';
import type { Photo, InspectionItem } from '../lib/types';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface PreviewPageProps {
  id: string;
  token?: string;
  onNavigate?: (route: { page: 'home' | 'properties' | 'inspection-edit'; id?: string }) => void;
}

export function PreviewPage({ id, token, onNavigate }: PreviewPageProps) {
  const { data: inspection, isLoading, error } = useInspection(id);
  const { data: photos = [] } = useInspectionPhotos(id);
  const [validToken, setValidToken] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [photosPrefetched, setPhotosPrefetched] = useState(false);

  useEffect(() => {
    // Validate token if provided
    if (token) {
      // Check KV store for token
      import('../lib/kv-client').then(({ kvStore }) => {
        kvStore.get(`preview-token:${token}`).then((tokenData) => {
          if (!tokenData || tokenData.inspection_id !== id) {
            setValidToken(false);
            return;
          }
          const expiresAt = new Date(tokenData.expires_at);
          if (expiresAt < new Date()) {
            setValidToken(false);
          }
        }).catch(() => {
          setValidToken(false);
        });
      });
    }
  }, [token, id]);

  // Prefetch photo data in background for faster "Open in New Window"
  useEffect(() => {
    if (photos.length > 0 && !photosPrefetched) {
      const totalPhotos = photos.length;
      
      // Show a subtle toast with progress
      const prefetchToast = toast.loading(`Caching photos: 0/${totalPhotos}...`, {
        duration: Infinity,
      });
      
      // Start prefetching photos with progress updates
      const photoIds = photos.map(p => p.id);
      batchFetchPhotoData(
        id, 
        photoIds,
        (loaded, total) => {
          toast.loading(`Caching photos: ${loaded}/${total}...`, {
            id: prefetchToast,
            duration: Infinity,
          });
        }
      )
        .then(() => {
          setPhotosPrefetched(true);
          toast.dismiss(prefetchToast);
          toast.success(`${totalPhotos} photos ready for printing!`, {
            duration: 2000,
          });
          console.log('Photos prefetched successfully');
        })
        .catch(err => {
          console.error('Error prefetching photos:', err);
          toast.dismiss(prefetchToast);
          toast.error('Some photos failed to load');
        });
    }
  }, [photos, id, photosPrefetched]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.info(`Share this link: ${url}`);
    }
  };

  const handleOpenInNewWindow = async () => {
    try {
      const photoIds = photos.map(p => p.id);
      const totalPhotos = photoIds.length;
      
      // Show loading toast with progress
      const loadingToast = toast.loading(`Loading photos: 0/${totalPhotos}...`, {
        duration: Infinity,
      });

      // Fetch all photo data with base64 before generating HTML
      // With progress updates
      const photosWithData = await batchFetchPhotoData(
        id, 
        photoIds,
        (loaded, total) => {
          toast.loading(`Loading photos: ${loaded}/${total}...`, {
            id: loadingToast,
            duration: Infinity,
          });
        }
      );
      
      // Create a map for quick lookup
      const photoDataMap = new Map(photosWithData.map(p => [p.id, p]));

      // Update toast for HTML generation
      toast.loading('Generating report...', {
        id: loadingToast,
        duration: Infinity,
      });

      // Open a new blank window
      const newWindow = window.open('', '_blank');
      if (!newWindow) {
        toast.dismiss(loadingToast);
        toast.error('Please allow popups to open preview in new window');
        return;
      }

      // Get all stylesheets from current document
      const styles = Array.from(document.styleSheets)
        .map(sheet => {
          try {
            return Array.from(sheet.cssRules)
              .map(rule => rule.cssText)
              .join('\n');
          } catch (e) {
            // External stylesheets might throw CORS errors
            return '';
          }
        })
        .join('\n');

      // Generate the full report HTML with photo data
      const reportHTML = generateReportHTML(photoDataMap);

      // Write HTML to new window
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Inspection Report - ${inspection.reference_code}</title>
            <style>
              ${styles}
              
              /* Hide browser headers and footers in print */
              @page {
                margin: 0.5cm;
                size: auto;
              }
              
              @media print {
                html, body {
                  margin: 0;
                  padding: 0;
                }
                
                /* Hide URL and other browser print artifacts */
                header, footer {
                  display: none !important;
                }
              }
            </style>
          </head>
          <body class="bg-background">
            <div class="min-h-screen bg-background">
              <main class="container mx-auto px-4 py-6 max-w-4xl">
                ${reportHTML}
              </main>
            </div>
          </body>
        </html>
      `);
      newWindow.document.close();

      // Dismiss loading and show success
      toast.dismiss(loadingToast);
      toast.success('Report opened in new window');

      // Navigate back to home page after opening new window
      if (onNavigate) {
        setTimeout(() => {
          onNavigate({ page: 'home' });
        }, 500);
      }
    } catch (error) {
      console.error('Error preparing report:', error);
      toast.error('Failed to prepare report. Please try again.');
    }
  };

  const generateReportHTML = (photoDataMap?: Map<string, Photo>) => {
    let html = '';
    
    // Header Card
    html += `
      <div class="mb-6 border-primary/20 rounded-lg border bg-card text-card-foreground shadow-sm">
        <div class="pt-6 p-6">
          <div class="space-y-4">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs transition-colors border-transparent">
                  ${inspection.reference_code}
                </div>
                <div class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs transition-colors bg-primary text-white">
                  ${inspection.status === 'completed' ? 'Completed' : inspection.status}
                </div>
              </div>
              <h2 class="mb-1 text-2xl font-semibold">${getTypeLabel(inspection.type)}</h2>
              <h3 class="text-muted-foreground text-xl">${inspection.property.title}</h3>
            </div>
            <div class="shrink-0 bg-border h-[1px] w-full"></div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-muted-foreground mb-1">Property Address</p>
                <p>${inspection.property.address_line1}</p>
                ${inspection.property.address_line2 ? `<p>${inspection.property.address_line2}</p>` : ''}
                <p>${inspection.property.city}, ${inspection.property.postcode}</p>
                <p>${inspection.property.country}</p>
              </div>
              <div>
                <p class="text-muted-foreground mb-1">Inspection Details</p>
                <p>Started: ${new Date(inspection.started_at).toLocaleDateString()}</p>
                ${inspection.completed_at ? `<p>Completed: ${new Date(inspection.completed_at).toLocaleDateString()}</p>` : ''}
                ${inspection.property.bedrooms ? `<p>Bedrooms: ${inspection.property.bedrooms}</p>` : ''}
                ${inspection.property.bathrooms ? `<p>Bathrooms: ${inspection.property.bathrooms}</p>` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Summary Notes
    if (inspection.summary_notes) {
      html += `
        <div class="mb-6 rounded-lg border bg-card text-card-foreground shadow-sm">
          <div class="pt-6 p-6">
            <h3 class="text-xl font-semibold mb-3">Summary Notes</h3>
            <p class="text-muted-foreground whitespace-pre-wrap">${inspection.summary_notes}</p>
          </div>
        </div>
      `;
    }

    // Sections
    sectionNames.forEach((sectionName) => {
      const sectionPhotos = (photos || []).filter(
        (photo) => photo.section === sectionName
      );
      
      html += `
        <div class="mb-6 print:print-page-break">
          <div class="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div class="pt-6 p-6">
              <h3 class="text-xl font-semibold mb-4 pb-2 border-b border-primary/20">${sectionName}</h3>
              <div class="space-y-4">
      `;

      sections[sectionName].forEach((item, itemIndex) => {
        html += `
          <div class="${itemIndex > 0 ? 'pt-4 border-t' : ''}">
            <h4 class="text-lg font-medium mb-2">${item.question}</h4>
            <div class="ml-0 space-y-2">
        `;

        // Render answer
        if (item.answer_boolean !== null) {
          html += `
            <div class="flex items-center gap-2">
              ${item.answer_boolean 
                ? '<svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Yes</span>'
                : '<svg class="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>No</span>'
              }
            </div>
          `;
        } else if (item.answer_select) {
          html += `
            <div class="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs transition-colors capitalize">
              ${item.answer_select}
            </div>
          `;
        } else if (item.answer_text) {
          html += `<p class="text-muted-foreground">${item.answer_text}</p>`;
        } else {
          html += `<p class="text-muted-foreground italic">Not answered</p>`;
        }

        if (item.notes) {
          html += `<p class="text-sm text-muted-foreground italic">Note: ${item.notes}</p>`;
        }

        html += `
            </div>
          </div>
        `;
      });

      // Section Photos
      if (sectionPhotos.length > 0) {
        html += `
          <div class="pt-4 border-t">
            <h4 class="text-lg font-medium mb-3">📷 Photos</h4>
            <div class="grid grid-cols-2 gap-4">
        `;
        
        sectionPhotos.forEach((photo) => {
          // Get photo data from map if available (for new window), otherwise use existing storage_key
          const photoData = photoDataMap?.get(photo.id);
          const photoUrl = photoData?.storage_key || photo.storage_key || '';
          html += `
            <div class="space-y-2">
              <div class="w-full h-[400px] max-w-[400px] bg-muted rounded-lg overflow-hidden">
                ${photoUrl 
                  ? `<img src="${photoUrl}" alt="${photo.caption || 'Section photo'}" class="w-full h-full object-cover" />`
                  : '<div class="w-full h-full flex items-center justify-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>'
                }
              </div>
              ${photo.caption ? `<p class="text-sm text-muted-foreground">${photo.caption}</p>` : ''}
            </div>
          `;
        });
        
        html += `
            </div>
          </div>
        `;
      }

      html += `
              </div>
            </div>
          </div>
        </div>
      `;
    });

    // General Photos
    const generalPhotos = (photos || []).filter(
      (photo) => !photo.section || !sectionNames.includes(photo.section)
    );
    
    if (generalPhotos.length > 0) {
      html += `
        <div class="mb-6 rounded-lg border bg-card text-card-foreground shadow-sm">
          <div class="pt-6 p-6">
            <h3 class="text-xl font-semibold mb-4 pb-2 border-b border-primary/20">📷 General Photos</h3>
            <div class="grid grid-cols-2 gap-4">
      `;
      
      generalPhotos.forEach((photo) => {
        // Get photo data from map if available (for new window), otherwise use existing storage_key
        const photoData = photoDataMap?.get(photo.id);
        const photoUrl = photoData?.storage_key || photo.storage_key || '';
        html += `
          <div class="space-y-2">
            <div class="w-full h-[400px] max-w-[400px] bg-muted rounded-lg overflow-hidden">
              ${photoUrl 
                ? `<img src="${photoUrl}" alt="${photo.caption || 'General photo'}" class="w-full h-full object-cover" />`
                : '<div class="w-full h-full flex items-center justify-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>'
              }
            </div>
            ${photo.caption ? `<p class="text-sm text-muted-foreground">${photo.caption}</p>` : ''}
          </div>
        `;
      });
      
      html += `
            </div>
          </div>
        </div>
      `;
    }

    // Footer
    html += `
      <div class="text-center text-sm text-muted-foreground py-6 border-t print:mt-8">
        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        <p class="mt-1">Clerk Inspections - Property Inspection Management System</p>
      </div>
    `;

    return html;
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/inspection/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete inspection');
      }

      toast.success('Inspection deleted successfully');
      
      // Navigate back to home page
      if (onNavigate) {
        setTimeout(() => {
          onNavigate({ page: 'home' });
        }, 500);
      }
    } catch (error: any) {
      console.error('Error deleting inspection:', error);
      toast.error(error.message || 'Failed to delete inspection');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <h2 className="mb-2">Error loading inspection</h2>
          <p className="text-muted-foreground">{error instanceof Error ? error.message : 'Unable to load inspection data'}</p>
          {onNavigate && (
            <Button 
              onClick={() => onNavigate({ page: 'home' })} 
              className="mt-4"
              variant="outline"
            >
              Return to Home
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <h2 className="mb-2">Inspection not found</h2>
          <p className="text-muted-foreground">This inspection may have been deleted or the link is invalid.</p>
          {onNavigate && (
            <Button 
              onClick={() => onNavigate({ page: 'home' })} 
              className="mt-4"
              variant="outline"
            >
              Return to Home
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (token && !validToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <h2 className="mb-2">Invalid or expired link</h2>
          <p className="text-muted-foreground">This preview link is no longer valid.</p>
        </div>
      </div>
    );
  }

  // Group items by section
  const sections = inspection.items?.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, InspectionItem[]>) || {};

  const sectionNames = Object.keys(sections);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'routine':
        return 'Routine Inspection';
      case 'fire_safety':
        return 'Fire Safety Inspection';
      case 'check_in':
        return 'Check-In Inspection';
      case 'check_out':
        return 'Check-Out Inspection';
      default:
        return type;
    }
  };

  const renderAnswer = (item: InspectionItem) => {
    if (item.answer_boolean !== null) {
      return (
        <div className="flex items-center gap-2">
          {item.answer_boolean ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span>Yes</span>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-destructive" />
              <span>No</span>
            </>
          )}
        </div>
      );
    }
    if (item.answer_select) {
      return (
        <Badge variant="outline" className="capitalize">
          {item.answer_select}
        </Badge>
      );
    }
    if (item.answer_text) {
      return <p className="text-muted-foreground">{item.answer_text}</p>;
    }
    return <p className="text-muted-foreground italic">Not answered</p>;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Print Header (only visible when printing) */}
      <div className="hidden print:block border-b-2 border-primary mb-6 pb-4">
        <h1 className="mb-2">Clerk Inspections</h1>
        <p className="text-sm text-muted-foreground">Inspection Report</p>
      </div>

      {/* Action Bar (hidden when printing) */}
      <div className="no-print sticky top-0 z-50 bg-gradient-primary border-b shadow-sm">
        <div className="container mx-auto px-4 py-3 max-w-4xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {onNavigate && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onNavigate({ page: 'home' })}
                  className="bg-white/20 hover:bg-white/30 active:bg-white/40 text-white border-white/20 touch-active"
                >
                  <ArrowLeft className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              )}
              <h1 className="text-white">Inspection Preview</h1>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleOpenInNewWindow}
                className="bg-white/20 hover:bg-white/30 active:bg-white/40 text-white border-white/20 touch-active"
              >
                <Download className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">New Window</span>
              </Button>

              {onNavigate && !token && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isDeleting}
                      className="bg-destructive/20 hover:bg-destructive/30 active:bg-destructive/40 text-white border-destructive/20 touch-active"
                    >
                      <Trash2 className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Inspection Report?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the inspection report "{inspection?.reference_code}" and all associated photos. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header Card */}
        <Card className="mb-6 border-primary/20">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{inspection.reference_code}</Badge>
                  <Badge className="bg-primary text-white">
                    {inspection.status === 'completed' ? 'Completed' : inspection.status}
                  </Badge>
                </div>
                <h2 className="mb-1">{getTypeLabel(inspection.type)}</h2>
                <h3 className="text-muted-foreground">{inspection.property.title}</h3>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Property Address</p>
                  <p>{inspection.property.address_line1}</p>
                  {inspection.property.address_line2 && <p>{inspection.property.address_line2}</p>}
                  <p>
                    {inspection.property.city}, {inspection.property.postcode}
                  </p>
                  <p>{inspection.property.country}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Inspection Details</p>
                  <p>Started: {new Date(inspection.started_at).toLocaleDateString()}</p>
                  {inspection.completed_at && (
                    <p>Completed: {new Date(inspection.completed_at).toLocaleDateString()}</p>
                  )}
                  {inspection.property.bedrooms && <p>Bedrooms: {inspection.property.bedrooms}</p>}
                  {inspection.property.bathrooms && <p>Bathrooms: {inspection.property.bathrooms}</p>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Notes */}
        {inspection.summary_notes && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h3 className="mb-3">Summary Notes</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{inspection.summary_notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Sections */}
        {sectionNames.map((sectionName, sectionIndex) => {
          const sectionPhotos = (photos || []).filter(
            (photo) => photo.section === sectionName
          );
          
          return (
            <div key={sectionName} className="mb-6 print:print-page-break">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="mb-4 pb-2 border-b border-primary/20">{sectionName}</h3>
                  <div className="space-y-4">
                    {sections[sectionName].map((item, itemIndex) => (
                      <div key={item.id} className={itemIndex > 0 ? 'pt-4 border-t' : ''}>
                        <h4 className="mb-2">{item.question}</h4>
                        <div className="ml-0 space-y-2">
                          <div>{renderAnswer(item)}</div>
                          {item.notes && (
                            <p className="text-sm text-muted-foreground italic">
                              Note: {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Section Photos */}
                    {sectionPhotos.length > 0 && (
                      <div className="pt-4 border-t">
                        <h4 className="mb-3">📷 Photos</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {sectionPhotos.map((photo) => (
                            <div key={photo.id} className="space-y-2">
                              <div className="w-full h-[400px] max-w-[400px] bg-muted rounded-lg overflow-hidden">
                                <LazyPhoto 
                                  photo={photo} 
                                  inspectionId={id}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              {photo.caption && (
                                <p className="text-sm text-muted-foreground">{photo.caption}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}

        {/* General/Uncategorized Photos */}
        {(() => {
          const generalPhotos = (photos || []).filter(
            (photo) => !photo.section || !sectionNames.includes(photo.section)
          );
          
          if (generalPhotos.length === 0) return null;
          
          return (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <h3 className="mb-4 pb-2 border-b border-primary/20">📷 General Photos</h3>
                <div className="grid grid-cols-2 gap-4">
                  {generalPhotos.map((photo) => (
                    <div key={photo.id} className="space-y-2">
                      <div className="w-full h-[400px] max-w-[400px] bg-muted rounded-lg overflow-hidden">
                        <LazyPhoto 
                          photo={photo} 
                          inspectionId={id}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {photo.caption && (
                        <p className="text-sm text-muted-foreground">{photo.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground py-6 border-t print:mt-8">
          <p>Generated by Clerk Inspections System</p>
          <p>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
        </div>
      </main>
    </div>
  );
}
