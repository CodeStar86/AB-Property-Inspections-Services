import { useState } from 'react';
import { usePhotoData } from '../hooks/use-database';
import type { Photo } from '../lib/types';

interface LazyPhotoProps {
  photo: Photo; // Photo metadata without base64
  inspectionId: string;
  className?: string;
  alt?: string;
}

export function LazyPhoto({ photo, inspectionId, className = '', alt }: LazyPhotoProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Only fetch the actual photo data (with base64) when component renders
  const { data: photoData, isLoading, error } = usePhotoData(inspectionId, photo.id);
  
  // Show loading state while fetching data
  if (isLoading || !photoData?.storage_key) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Show error state if fetch failed
  if (error || imageError) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <p className="text-sm text-muted-foreground">Failed to load image</p>
      </div>
    );
  }
  
  return (
    <div className={`relative ${className}`}>
      {/* Loading spinner overlay while image is loading */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
      
      {/* Actual image */}
      <img
        src={photoData.storage_key}
        alt={alt || photo.caption || 'Inspection photo'}
        className={`${className} ${!imageLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
        loading="eager"
      />
    </div>
  );
}
