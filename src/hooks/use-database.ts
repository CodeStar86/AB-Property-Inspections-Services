import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kvStore } from '../lib/kv-client';
import { photoCache } from '../lib/photo-cache';
import type { Property, Inspection, InspectionItem, Photo, User } from '../lib/types';
import { generateReferenceCode, generateDynamicTemplate } from '../lib/types';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// KV Store keys
const KEYS = {
  properties: (id?: string) => id ? `property:${id}` : 'property:',
  inspections: (id?: string) => id ? `inspection:${id}` : 'inspection:',
  inspectionItems: (inspectionId: string) => `inspection-items:${inspectionId}`,
  photoIndex: (inspectionId: string) => `photo-index:${inspectionId}`, // Lightweight metadata only
  photoData: (inspectionId: string, photoId: string) => `photo-data:${inspectionId}:${photoId}`, // Full photo with base64
  previewToken: (token: string) => `preview-token:${token}`,
  users: (id?: string) => id ? `user:${id}` : 'user:',
};

// Properties
export function useProperties(searchQuery?: string) {
  return useQuery({
    queryKey: ['properties', searchQuery],
    queryFn: async () => {
      const properties = await kvStore.getByPrefix(KEYS.properties()) as Property[];
      
      let results = properties;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        results = properties.filter(p => 
          p.title.toLowerCase().includes(q) || 
          p.postcode.toLowerCase().includes(q)
        );
      }
      
      return results.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
  });
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: ['property', id],
    queryFn: async () => {
      const property = await kvStore.get(KEYS.properties(id));
      if (!property) throw new Error('Property not found');
      return property as Property;
    },
    enabled: !!id,
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (property: Omit<Property, 'id' | 'created_at' | 'created_by'> & { created_by: string }) => {
      const newProperty: Property = {
        ...property,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };
      
      await kvStore.set(KEYS.properties(newProperty.id), newProperty);
      return newProperty;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Property>;
    }) => {
      const existing = await kvStore.get(KEYS.properties(id));
      if (!existing) throw new Error('Property not found');
      
      const updated = { ...existing, ...updates };
      await kvStore.set(KEYS.properties(id), updated);
      return updated as Property;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property', data.id] });
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/property/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete property' }));
        throw new Error(error.error || 'Failed to delete property');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
    },
  });
}

// Inspections
export function useInspections(filters?: {
  status?: string;
  type?: string;
  property_id?: string;
}) {
  return useQuery({
    queryKey: ['inspections', filters],
    queryFn: async () => {
      const inspections = await kvStore.getByPrefix(KEYS.inspections()) as Inspection[];
      
      let results = inspections;
      
      if (filters?.status) {
        results = results.filter(i => i.status === filters.status);
      }
      if (filters?.type) {
        results = results.filter(i => i.type === filters.type);
      }
      if (filters?.property_id) {
        results = results.filter(i => i.property_id === filters.property_id);
      }
      
      // Attach property data
      const properties = await kvStore.getByPrefix(KEYS.properties()) as Property[];
      const resultsWithProperty = results.map(inspection => ({
        ...inspection,
        property: properties.find(p => p.id === inspection.property_id) || {} as Property,
      }));
      
      return resultsWithProperty.sort((a, b) => 
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      ) as (Inspection & { property: Property })[];
    },
  });
}

export function useInspection(id: string) {
  return useQuery({
    queryKey: ['inspection', id],
    queryFn: async () => {
      const inspection = await kvStore.get(KEYS.inspections(id));
      if (!inspection) throw new Error('Inspection not found');
      
      const property = await kvStore.get(KEYS.properties(inspection.property_id));
      const items = (await kvStore.get(KEYS.inspectionItems(id))) || [];
      
      // Don't fetch photos here - they're loaded separately to avoid timeout
      
      return {
        ...inspection,
        property: property || {} as Property,
        items: items.sort((a: InspectionItem, b: InspectionItem) => a.order_index - b.order_index),
        photos: [], // Photos loaded separately
      } as Inspection & { property: Property; items: InspectionItem[]; photos: Photo[] };
    },
    enabled: !!id,
    staleTime: 30000,
    gcTime: 300000,
  });
}

// Fetch lightweight photo metadata only (no base64 data)
export function useInspectionPhotos(inspectionId: string) {
  return useQuery({
    queryKey: ['inspection-photos', inspectionId],
    queryFn: async () => {
      // Fetch lightweight photo index with metadata only
      const photoIndex = await kvStore.get(KEYS.photoIndex(inspectionId)) as Photo[];
      return Array.isArray(photoIndex) ? photoIndex.sort((a: Photo, b: Photo) => a.order_index - b.order_index) : [];
    },
    enabled: !!inspectionId,
    staleTime: 30000,
    gcTime: 300000,
  });
}

// Fetch individual photo data (with base64) on demand
export function usePhotoData(inspectionId: string, photoId: string) {
  return useQuery({
    queryKey: ['photo-data', inspectionId, photoId],
    queryFn: async () => {
      // First, try to get from browser cache (IndexedDB)
      const cachedDataUrl = await photoCache.get(inspectionId, photoId);
      
      if (cachedDataUrl) {
        // Return cached photo immediately - no server fetch!
        return { storage_key: cachedDataUrl } as Photo;
      }
      
      // Not in cache - fetch from server
      console.log(`[PhotoData] Fetching from server: ${photoId}`);
      const photoData = await kvStore.get(KEYS.photoData(inspectionId, photoId)) as Photo;
      
      // Store in browser cache for next time
      if (photoData?.storage_key) {
        await photoCache.set(inspectionId, photoId, photoData.storage_key);
      }
      
      return photoData;
    },
    enabled: !!inspectionId && !!photoId,
    staleTime: Infinity, // Never expire - cache is managed by IndexedDB
    gcTime: Infinity, // Keep in React Query cache forever
  });
}

// Batch fetch all photo data for an inspection (for preview/print)
export async function batchFetchPhotoData(
  inspectionId: string, 
  photoIds: string[],
  onProgress?: (loaded: number, total: number) => void
): Promise<Photo[]> {
  if (!photoIds.length) return [];
  
  console.log(`[BatchFetch] Starting for ${photoIds.length} photos...`);
  const startTime = performance.now();
  
  // Step 1: Check IndexedDB cache first (FAST - no network!)
  const cachedPhotos = await photoCache.batchGet(inspectionId, photoIds);
  const cachedCount = cachedPhotos.size;
  
  onProgress?.(cachedCount, photoIds.length);
  
  // Step 2: Identify missing photos that need server fetch
  const missingPhotoIds = photoIds.filter(id => !cachedPhotos.has(id));
  
  if (missingPhotoIds.length === 0) {
    console.log(`[BatchFetch] ✅ All ${photoIds.length} photos from cache! (${(performance.now() - startTime).toFixed(0)}ms)`);
    // Convert cached data to Photo objects
    return photoIds.map(photoId => ({
      id: photoId,
      storage_key: cachedPhotos.get(photoId)!,
    } as Photo));
  }
  
  console.log(`[BatchFetch] Cache: ${cachedCount}/${photoIds.length}, fetching ${missingPhotoIds.length} from server...`);
  
  // Step 3: Fetch missing photos from server
  const keys = missingPhotoIds.map(photoId => KEYS.photoData(inspectionId, photoId));
  const serverPhotos = await kvStore.mget(keys);
  
  // Step 4: Store fetched photos in IndexedDB cache for next time
  const storePromises = serverPhotos.map((photo, index) => {
    if (photo?.storage_key) {
      const photoId = missingPhotoIds[index];
      return photoCache.set(inspectionId, photoId, photo.storage_key);
    }
  });
  await Promise.all(storePromises);
  
  onProgress?.(photoIds.length, photoIds.length);
  
  // Step 5: Combine cached + server photos in original order
  const photoMap = new Map<string, Photo>();
  
  // Add cached photos
  cachedPhotos.forEach((dataUrl, photoId) => {
    photoMap.set(photoId, { id: photoId, storage_key: dataUrl } as Photo);
  });
  
  // Add server photos
  serverPhotos.forEach((photo, index) => {
    if (photo) {
      photoMap.set(missingPhotoIds[index], photo as Photo);
    }
  });
  
  const result = photoIds.map(id => photoMap.get(id)).filter(Boolean) as Photo[];
  
  const elapsed = performance.now() - startTime;
  console.log(`[BatchFetch] ✅ Complete: ${result.length}/${photoIds.length} photos in ${elapsed.toFixed(0)}ms`);
  
  // Preload images in browser memory for instant display
  result.forEach((photo) => {
    if (photo?.storage_key) {
      const img = new Image();
      img.src = photo.storage_key;
    }
  });
  
  return result;
}

export function useCreateInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      property_id,
      type,
      created_by,
    }: {
      property_id: string;
      type: Inspection['type'];
      created_by: string;
    }) => {
      const reference_code = generateReferenceCode();
      const newInspection: Inspection = {
        id: crypto.randomUUID(),
        property_id,
        type,
        status: 'draft',
        reference_code,
        created_by,
        assigned_to: created_by,
        started_at: new Date().toISOString(),
        completed_at: null,
        updated_at: new Date().toISOString(),
        summary_notes: null,
      };
      
      await kvStore.set(KEYS.inspections(newInspection.id), newInspection);
      
      // Get property details for dynamic template generation
      const property = await kvStore.get(KEYS.properties(property_id)) as Property | null;
      const bedrooms = property?.bedrooms || 0;
      const bathrooms = property?.bathrooms || 0;
      
      // Create template items with dynamic bedroom/bathroom sections
      const template = generateDynamicTemplate(type, bedrooms, bathrooms);
      if (template) {
        const items: InspectionItem[] = [];
        let orderIndex = 0;
        
        // Get current date for auto-fill
        const currentDate = new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        
        // Build full property address
        const propertyAddress = property
          ? [
              property.address_line1,
              property.address_line2,
              property.city,
              property.postcode,
              property.country,
            ]
              .filter(Boolean)
              .join(', ')
          : '';

        for (const section of template.sections) {
          for (const q of section.questions) {
            // Auto-populate certain fields
            let autoFillValue: string | null = null;
            const questionLower = q.question.toLowerCase();
            
            // Auto-fill property address fields
            if (
              questionLower.includes('property address') ||
              questionLower.includes('address')
            ) {
              autoFillValue = propertyAddress;
            }
            // Auto-fill date fields
            else if (
              questionLower.includes('date of inspection') ||
              questionLower.includes('date of check-in') ||
              questionLower.includes('date of check-out')
            ) {
              autoFillValue = currentDate;
            }
            
            items.push({
              id: crypto.randomUUID(),
              inspection_id: newInspection.id,
              section: section.title,
              question: q.question,
              question_type: q.type,
              question_options: q.options,
              answer_text: autoFillValue,
              answer_boolean: null,
              answer_select: null,
              notes: null,
              order_index: orderIndex++,
              created_at: new Date().toISOString(),
            });
          }
        }
        
        await kvStore.set(KEYS.inspectionItems(newInspection.id), items);
      }
      
      // Photos will be stored individually, no need to initialize
      
      return newInspection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
    },
  });
}

export function useUpdateInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Inspection>;
    }) => {
      const existing = await kvStore.get(KEYS.inspections(id));
      if (!existing) throw new Error('Inspection not found');
      
      const updated = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      await kvStore.set(KEYS.inspections(id), updated);
      return updated as Inspection;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      queryClient.invalidateQueries({ queryKey: ['inspection', data.id] });
    },
  });
}

export function useUpdateInspectionItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<InspectionItem>;
    }) => {
      // Find the inspection that contains this item
      const inspections = await kvStore.getByPrefix(KEYS.inspections()) as Inspection[];
      let inspectionId: string | null = null;
      
      for (const inspection of inspections) {
        const items = (await kvStore.get(KEYS.inspectionItems(inspection.id))) || [];
        const itemIndex = items.findIndex((item: InspectionItem) => item.id === id);
        
        if (itemIndex !== -1) {
          inspectionId = inspection.id;
          items[itemIndex] = { ...items[itemIndex], ...updates };
          await kvStore.set(KEYS.inspectionItems(inspection.id), items);
          return { item: items[itemIndex] as InspectionItem, inspectionId: inspection.id };
        }
      }
      
      throw new Error('Inspection item not found');
    },
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['inspection'] });
      
      // Get the previous inspection data
      const previousInspections = queryClient.getQueriesData({ queryKey: ['inspection'] });
      
      // Optimistically update the cache
      queryClient.setQueriesData({ queryKey: ['inspection'] }, (old: any) => {
        if (!old?.items) return old;
        
        return {
          ...old,
          items: old.items.map((item: InspectionItem) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        };
      });
      
      return { previousInspections };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousInspections) {
        context.previousInspections.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Don't invalidate - rely on optimistic updates
      // This prevents the cursor jump issue
    },
  });
}

export function useAddInspectionSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      inspectionId,
      sectionType,
      sectionNumber,
    }: {
      inspectionId: string;
      sectionType: string;
      sectionNumber?: number;
    }) => {
      const items = (await kvStore.get(KEYS.inspectionItems(inspectionId))) || [];
      
      // Determine section title
      let sectionTitle = '';
      let questions: { question: string; type: 'text' | 'boolean' | 'select'; options?: string[] }[] = [];
      
      if (sectionType === 'bedroom') {
        sectionTitle = `🛏️ Bedroom ${sectionNumber || 'Additional'}`;
        questions = [
          { question: `Is this bedroom clean and tidy?`, type: 'boolean' },
          { question: 'Overall Condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor'] },
          { question: 'Walls and ceiling condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'] },
          { question: 'Floor/Carpet condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'] },
          { question: 'Windows and frames', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'] },
          { question: 'Curtains/Blinds present and working?', type: 'boolean' },
          { question: 'Door and handles', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'] },
          { question: 'Light fixtures working?', type: 'boolean' },
          { question: 'Power sockets working?', type: 'boolean' },
          { question: 'Heating/Radiator working?', type: 'boolean' },
          { question: 'If furnished - Bed condition', type: 'select', options: ['N/A', 'Excellent', 'Good', 'Fair', 'Poor'] },
          { question: 'If furnished - Wardrobe condition', type: 'select', options: ['N/A', 'Excellent', 'Good', 'Fair', 'Poor'] },
          { question: 'Any damages or repairs needed?', type: 'text' },
        ];
      } else if (sectionType === 'bathroom') {
        sectionTitle = `🚿 Bathroom ${sectionNumber || 'Additional'}`;
        questions = [
          { question: `Is this bathroom clean?`, type: 'boolean' },
          { question: 'Overall Condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor'] },
          { question: 'Toilet working correctly?', type: 'boolean' },
          { question: 'Basin/Sink working correctly?', type: 'boolean' },
          { question: 'Bath working correctly?', type: 'boolean' },
          { question: 'Shower working correctly?', type: 'boolean' },
          { question: 'Taps - any leaks or drips?', type: 'boolean' },
          { question: 'Tiles condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Missing/Damaged'] },
          { question: 'Sealant/Grouting condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Mouldy'] },
          { question: 'Floor condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'] },
          { question: 'Extractor fan working?', type: 'boolean' },
          { question: 'Mirror present and undamaged?', type: 'boolean' },
          { question: 'Cabinet/Storage condition', type: 'select', options: ['N/A', 'Excellent', 'Good', 'Fair', 'Poor'] },
          { question: 'Any damages or repairs needed?', type: 'text' },
        ];
      } else if (sectionType === 'living_room') {
        sectionTitle = `🛋️ Living Room ${sectionNumber || 'Additional'}`;
        questions = [
          { question: 'Are walls, ceiling, and flooring clean and free of damage?', type: 'boolean' },
          { question: 'Are windows, curtains, or blinds in good working order?', type: 'boolean' },
          { question: 'If furnished, are all listed items present and undamaged?', type: 'boolean' },
          { question: 'Light fixtures working?', type: 'boolean' },
          { question: 'Power sockets working?', type: 'boolean' },
          { question: 'Heating/Radiator working?', type: 'boolean' },
          { question: 'Any damages or repairs needed?', type: 'text' },
        ];
      } else if (sectionType === 'kitchen') {
        sectionTitle = `🍳 Kitchen ${sectionNumber || 'Additional'}`;
        questions = [
          { question: 'Are all appliances clean and working (fridge, oven, hob, washing machine)?', type: 'boolean' },
          { question: 'Are cupboards and worktops clean, dry, and free from damage?', type: 'boolean' },
          { question: 'Are sink and taps free of leaks and limescale?', type: 'boolean' },
          { question: 'Is extractor fan working and clean?', type: 'boolean' },
          { question: 'Floor condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'] },
          { question: 'Any damages or repairs needed?', type: 'text' },
        ];
      } else if (sectionType === 'other') {
        sectionTitle = `📦 Additional Room ${sectionNumber || ''}`;
        questions = [
          { question: 'Room name/description', type: 'text' },
          { question: 'Overall condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor'] },
          { question: 'Walls and ceiling condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'] },
          { question: 'Floor condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'] },
          { question: 'Any damages or repairs needed?', type: 'text' },
        ];
      }
      
      // Find the highest order_index
      const maxOrderIndex = items.length > 0 ? Math.max(...items.map((item: InspectionItem) => item.order_index)) : -1;
      
      // Create new items for this section
      const newItems: InspectionItem[] = questions.map((q, index) => ({
        id: crypto.randomUUID(),
        inspection_id: inspectionId,
        section: sectionTitle,
        question: q.question,
        question_type: q.type,
        question_options: q.options,
        answer_text: null,
        answer_boolean: null,
        answer_select: null,
        notes: null,
        order_index: maxOrderIndex + index + 1,
        created_at: new Date().toISOString(),
      }));
      
      // Add new items to existing items
      const updatedItems = [...items, ...newItems];
      await kvStore.set(KEYS.inspectionItems(inspectionId), updatedItems);
      
      return { sectionTitle, newItems };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inspection', variables.inspectionId] });
    },
  });
}

export function useCompleteInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const existing = await kvStore.get(KEYS.inspections(id));
      if (!existing) throw new Error('Inspection not found');
      
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      const completedAt = new Date().toISOString();
      const updated = {
        ...existing,
        status: 'completed',
        completed_at: completedAt,
        updated_at: completedAt,
      };
      
      await kvStore.set(KEYS.inspections(id), updated);
      await kvStore.set(KEYS.previewToken(token), {
        inspection_id: id,
        token,
        expires_at: expiresAt.toISOString(),
      });
      
      return { inspection: updated as Inspection, token };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      queryClient.invalidateQueries({ queryKey: ['inspection', data.inspection.id] });
    },
  });
}

export function useDeleteInspections() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/inspections/bulk-delete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ ids }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete inspections' }));
        throw new Error(error.error || 'Failed to delete inspections');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
    },
  });
}

// Photos
export function useUploadPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      inspection_id,
      file,
      dataUrl,
      section,
      item_id,
      caption,
      order_index,
    }: {
      inspection_id: string;
      file?: File;
      dataUrl?: string;
      section?: string;
      item_id?: string;
      caption?: string;
      order_index: number;
    }) => {
      // If dataUrl is provided, use it; otherwise convert file
      let finalDataUrl = dataUrl;
      let fileName = 'unknown';
      let fileSize = 0;
      
      if (!finalDataUrl && file) {
        const reader = new FileReader();
        finalDataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        fileName = file.name;
        fileSize = file.size;
      } else if (file) {
        fileName = file.name;
        fileSize = file.size;
      }
      
      const photoId = crypto.randomUUID();
      const newPhoto: Photo = {
        id: photoId,
        inspection_id,
        section: section || null,
        item_id: item_id || null,
        storage_key: finalDataUrl!,
        original_filename: fileName,
        width: null,
        height: null,
        size_bytes: fileSize,
        exif_taken_at: null,
        caption: caption || null,
        order_index,
        uploaded_by: 'user',
        processing_status: 'done',
        created_at: new Date().toISOString(),
      };
      
      // Get existing photo index
      const existingIndex = (await kvStore.get(KEYS.photoIndex(inspection_id))) || [];
      
      // Create metadata-only version for index
      const photoMetadata = { ...newPhoto, storage_key: '' };
      
      // Update index, store full photo data, and cache in browser
      await Promise.all([
        kvStore.set(KEYS.photoIndex(inspection_id), [...existingIndex, photoMetadata]),
        kvStore.set(KEYS.photoData(inspection_id, photoId), newPhoto),
        photoCache.set(inspection_id, photoId, newPhoto.storage_key), // Cache immediately
      ]);
      
      return photoMetadata;
    },
    onMutate: async (variables) => {
      // Optimistically add photo to cache immediately
      const photoId = crypto.randomUUID();
      const newPhoto: Photo = {
        id: photoId,
        inspection_id: variables.inspection_id,
        section: variables.section || null,
        item_id: variables.item_id || null,
        storage_key: variables.dataUrl || '',
        original_filename: variables.file?.name || 'unknown',
        width: null,
        height: null,
        size_bytes: variables.file?.size || 0,
        exif_taken_at: null,
        caption: variables.caption || null,
        order_index: variables.order_index,
        uploaded_by: 'user',
        processing_status: 'done',
        created_at: new Date().toISOString(),
      };

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['inspection-photos', variables.inspection_id] });
      
      // Snapshot the previous value
      const previousPhotos = queryClient.getQueryData(['inspection-photos', variables.inspection_id]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['inspection-photos', variables.inspection_id], (old: Photo[] | undefined) => {
        return [...(old || []), newPhoto];
      });
      
      return { previousPhotos, optimisticPhotoId: photoId };
    },
    onError: (err, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousPhotos) {
        queryClient.setQueryData(['inspection-photos', variables.inspection_id], context.previousPhotos);
      }
    },
    onSuccess: (data, variables, context) => {
      // Update the optimistic photo with the real one from the server
      queryClient.setQueryData(['inspection-photos', variables.inspection_id], (old: Photo[] | undefined) => {
        return (old || []).map((p: Photo) => 
          p.id === context?.optimisticPhotoId ? data : p
        );
      });
    },
  });
}

export function useBatchUploadPhotos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      inspection_id,
      photos: photosToUpload,
    }: {
      inspection_id: string;
      photos: Array<{
        file: File;
        dataUrl: string;
        section?: string;
        item_id?: string;
        caption?: string;
        order_index: number;
      }>;
    }) => {
      // Create all photo objects with unique IDs
      const newPhotos: Photo[] = photosToUpload.map((photoData) => ({
        id: crypto.randomUUID(),
        inspection_id,
        section: photoData.section || null,
        item_id: photoData.item_id || null,
        storage_key: photoData.dataUrl,
        original_filename: photoData.file.name,
        width: null,
        height: null,
        size_bytes: photoData.file.size,
        exif_taken_at: null,
        caption: photoData.caption || null,
        order_index: photoData.order_index,
        uploaded_by: 'user',
        processing_status: 'done',
        created_at: new Date().toISOString(),
      }));
      
      // Get existing photo index
      const existingIndex = (await kvStore.get(KEYS.photoIndex(inspection_id))) || [];
      
      // Create metadata-only versions for the index (no base64)
      const newPhotoMetadata = newPhotos.map(photo => ({
        ...photo,
        storage_key: '', // Don't store base64 in index
      }));
      
      // Update photo index with new metadata
      const updatedIndex = [...existingIndex, ...newPhotoMetadata];
      
      // Write in parallel: index + individual photo data + browser cache
      await Promise.all([
        kvStore.set(KEYS.photoIndex(inspection_id), updatedIndex),
        ...newPhotos.map((photo) => 
          Promise.all([
            kvStore.set(KEYS.photoData(inspection_id, photo.id), photo),
            photoCache.set(inspection_id, photo.id, photo.storage_key), // Cache immediately
          ])
        ),
      ]);
      
      return newPhotoMetadata;
    },
    onMutate: async (variables) => {
      // Optimistically add all photos to cache immediately
      const newPhotos: Photo[] = variables.photos.map((photoData) => ({
        id: crypto.randomUUID(),
        inspection_id: variables.inspection_id,
        section: photoData.section || null,
        item_id: photoData.item_id || null,
        storage_key: photoData.dataUrl,
        original_filename: photoData.file.name,
        width: null,
        height: null,
        size_bytes: photoData.file.size,
        exif_taken_at: null,
        caption: photoData.caption || null,
        order_index: photoData.order_index,
        uploaded_by: 'user',
        processing_status: 'done',
        created_at: new Date().toISOString(),
      }));

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['inspection-photos', variables.inspection_id] });
      
      // Snapshot the previous value
      const previousPhotos = queryClient.getQueryData(['inspection-photos', variables.inspection_id]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['inspection-photos', variables.inspection_id], (old: Photo[] | undefined) => {
        return [...(old || []), ...newPhotos];
      });
      
      return { previousPhotos, optimisticPhotoIds: newPhotos.map(p => p.id) };
    },
    onError: (err, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousPhotos) {
        queryClient.setQueryData(['inspection-photos', variables.inspection_id], context.previousPhotos);
      }
    },
    onSuccess: (data, variables, context) => {
      // Replace optimistic photos with real ones from the server
      queryClient.setQueryData(['inspection-photos', variables.inspection_id], (old: Photo[] | undefined) => {
        const optimisticIds = new Set(context?.optimisticPhotoIds || []);
        const nonOptimisticPhotos = (old || []).filter((p: Photo) => !optimisticIds.has(p.id));
        return [...nonOptimisticPhotos, ...data];
      });
    },
  });
}

export function useDeletePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (photo: Photo) => {
      // Get existing index
      const existingIndex = (await kvStore.get(KEYS.photoIndex(photo.inspection_id))) || [];
      
      // Remove photo from index
      const updatedIndex = existingIndex.filter((p: Photo) => p.id !== photo.id);
      
      // Delete from server, index, photo data, and browser cache in parallel
      await Promise.all([
        kvStore.set(KEYS.photoIndex(photo.inspection_id), updatedIndex),
        kvStore.delete(KEYS.photoData(photo.inspection_id, photo.id)),
        photoCache.delete(photo.inspection_id, photo.id), // Clear browser cache
      ]);
      
      return photo;
    },
    onMutate: async (photo) => {
      // Optimistically remove photo from cache
      await queryClient.cancelQueries({ queryKey: ['inspection-photos', photo.inspection_id] });
      
      const previousPhotos = queryClient.getQueryData(['inspection-photos', photo.inspection_id]);
      
      queryClient.setQueryData(['inspection-photos', photo.inspection_id], (old: Photo[] | undefined) => {
        return (old || []).filter((p: Photo) => p.id !== photo.id);
      });
      
      return { previousPhotos };
    },
    onError: (err, photo, context) => {
      // Rollback on error
      if (context?.previousPhotos) {
        queryClient.setQueryData(['inspection-photos', photo.inspection_id], context.previousPhotos);
      }
    },
  });
}

export function useUpdatePhotoCaption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, caption, inspection_id }: { id: string; caption: string; inspection_id: string }) => {
      // Get existing index and photo data
      const existingIndex = (await kvStore.get(KEYS.photoIndex(inspection_id))) || [];
      const photoData = await kvStore.get(KEYS.photoData(inspection_id, id));
      
      if (!photoData) {
        throw new Error('Photo not found');
      }
      
      // Update caption in both index and photo data
      const updatedIndex = existingIndex.map((p: Photo) => 
        p.id === id ? { ...p, caption } : p
      );
      const updatedPhoto = { ...photoData, caption };
      
      // Save both
      await Promise.all([
        kvStore.set(KEYS.photoIndex(inspection_id), updatedIndex),
        kvStore.set(KEYS.photoData(inspection_id, id), updatedPhoto),
      ]);
      
      return { ...updatedPhoto, storage_key: '' } as Photo; // Return metadata only
    },
    onMutate: async ({ id, caption, inspection_id }) => {
      // Optimistically update caption in cache
      await queryClient.cancelQueries({ queryKey: ['inspection-photos', inspection_id] });
      
      const previousPhotos = queryClient.getQueryData(['inspection-photos', inspection_id]);
      
      queryClient.setQueryData(['inspection-photos', inspection_id], (old: Photo[] | undefined) => {
        return (old || []).map((p: Photo) => 
          p.id === id ? { ...p, caption } : p
        );
      });
      
      return { previousPhotos };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousPhotos) {
        queryClient.setQueryData(['inspection-photos', variables.inspection_id], context.previousPhotos);
      }
    },
  });
}

// Users (Admin functions)
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const users = await kvStore.getByPrefix(KEYS.users()) as User[];
      return users.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/admin/user/${userId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete user' }));
        throw new Error(error.error || 'Failed to delete user');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUserData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/admin/user/${userId}/data`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete user data' }));
        throw new Error(error.error || 'Failed to delete user data');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
    },
  });
}
