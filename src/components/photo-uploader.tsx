import { useState, useRef } from 'react';
import { useBatchUploadPhotos, useDeletePhoto, useUpdatePhotoCaption } from '../hooks/use-database';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { Card, CardContent } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { toast } from 'sonner@2.0.3';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import type { Photo } from '../lib/types';
import { LazyPhoto } from './lazy-photo';

// Compress image to reduce storage size
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Calculate new dimensions (max 1280px on longest side for mobile)
      const maxSize = 1280; // Reduced from 1920px
      let width = img.width;
      let height = img.height;
      
      if (width > height && width > maxSize) {
        height = (height * maxSize) / width;
        width = maxSize;
      } else if (height > maxSize) {
        width = (width * maxSize) / height;
        height = maxSize;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      // Use JPEG compression at 0.7 quality to reduce size further
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7); // Reduced from 0.8
      resolve(compressedDataUrl);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    reader.onerror = () => reject(new Error('Failed to read file'));
    
    reader.readAsDataURL(file);
  });
}



interface PhotoUploaderProps {
  inspectionId: string;
  photos: Photo[];
  section?: string;
  itemId?: string;
}

export function PhotoUploader({ inspectionId, photos, section, itemId }: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingCaption, setEditingCaption] = useState<Photo | null>(null);
  const [captionText, setCaptionText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const batchUploadPhotos = useBatchUploadPhotos();
  const deletePhoto = useDeletePhoto();
  const updateCaption = useUpdatePhotoCaption();

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        return false;
      }
      if (file.size > 50 * 1024 * 1024) {
        // 50MB limit
        toast.error(`${file.name} is too large (max 50MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Show uploading toast for multiple files
    if (validFiles.length > 1) {
      toast.info(`Processing ${validFiles.length} photos...`);
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Compress all files in parallel with progress tracking
      const compressionProgress = new Map<number, number>();
      
      const readFilePromises = validFiles.map(async (file, i) => {
        compressionProgress.set(i, 0);

        // Simulate progress during compression
        const progressInterval = setInterval(() => {
          compressionProgress.set(i, Math.min((compressionProgress.get(i) || 0) + 10, 70));
          
          // Calculate overall progress (compression is 70% of total)
          const totalProgress = Array.from(compressionProgress.values()).reduce((a, b) => a + b, 0);
          const avgProgress = totalProgress / validFiles.length;
          setUploadProgress(Math.min(avgProgress, 70));
        }, 100);

        try {
          // Compress the image
          const dataUrl = await compressImage(file);
          
          clearInterval(progressInterval);
          compressionProgress.set(i, 70);
          
          return { 
            file, 
            dataUrl, 
            index: i 
          };
        } catch (error) {
          clearInterval(progressInterval);
          throw new Error(`Failed to process ${file.name}`);
        }
      });

      // Wait for all files to be compressed in parallel
      const fileData = await Promise.all(readFilePromises);
      
      setUploadProgress(75);

      // Step 2: Batch upload all photos in ONE database operation
      const photosToUpload = fileData.map(({ file, dataUrl, index }) => ({
        file,
        dataUrl,
        section,
        item_id: itemId,
        order_index: photos.length + index,
      }));

      setUploadProgress(85);

      await batchUploadPhotos.mutateAsync({
        inspection_id: inspectionId,
        photos: photosToUpload,
      });

      setUploadProgress(100);

      // Show success toast
      toast.success(`${validFiles.length} photo${validFiles.length > 1 ? 's' : ''} uploaded successfully`);
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload photos');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (photo: Photo) => {
    if (!confirm('Delete this photo?')) return;

    try {
      await deletePhoto.mutateAsync(photo);
      toast.success('Photo deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete photo');
    }
  };

  const handleUpdateCaption = async () => {
    if (!editingCaption) return;

    try {
      await updateCaption.mutateAsync({
        id: editingCaption.id,
        caption: captionText,
        inspection_id: inspectionId,
      });
      toast.success('Caption updated');
      setEditingCaption(null);
      setCaptionText('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update caption');
    }
  };

  const openCaptionDialog = (photo: Photo) => {
    setEditingCaption(photo);
    setCaptionText(photo.caption || '');
  };



  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 sm:flex-none sm:w-auto touch-active"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Photos
        </Button>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Uploading photos...</span>
            <span className="text-muted-foreground">{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* Photos Grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-square relative bg-muted">
                  <LazyPhoto 
                    photo={photo} 
                    inspectionId={inspectionId}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 w-8 p-0 touch-active"
                      onClick={() => handleDelete(photo)}
                      title="Delete photo"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-2">
                  <button
                    onClick={() => openCaptionDialog(photo)}
                    className="text-xs text-left w-full hover:text-primary active:text-primary min-h-[44px] flex items-center"
                  >
                    {photo.caption || 'Add caption...'}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-3">No photos uploaded yet</p>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="touch-active"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Photos
          </Button>
        </div>
      )}

      {/* Caption Dialog */}
      <Dialog open={!!editingCaption} onOpenChange={(open) => {
        if (!open) {
          setEditingCaption(null);
          setCaptionText('');
        }
      }}> 
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Photo Caption</DialogTitle>
            <DialogDescription>
              Add a description for this photo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingCaption && (
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <LazyPhoto 
                  photo={editingCaption} 
                  inspectionId={inspectionId}
                  className="w-full h-full object-contain"
                  alt="Preview"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="caption">Caption</Label>
              <Input
                id="caption"
                value={captionText}
                onChange={(e) => setCaptionText(e.target.value)}
                placeholder="Enter photo caption..."
                className="bg-input-background"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCaption(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCaption}
              disabled={updateCaption.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {updateCaption.isPending ? 'Saving...' : 'Save Caption'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
