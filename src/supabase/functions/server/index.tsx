import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Create Supabase client with service role (singleton for edge function)
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false, // Server-side doesn't need session persistence
    autoRefreshToken: false,
  },
  db: {
    schema: 'public',
  },
});

console.log('✅ Edge function Supabase client initialized');

// Ensure storage bucket exists
async function ensureBucketExists() {
  try {
    const bucketName = 'inspection-photos';
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 52428800, // 50MB
      });
      console.log('Created inspection-photos bucket');
    } else {
      console.log('Bucket inspection-photos already exists');
    }
  } catch (error) {
    console.error('Error ensuring bucket exists:', error);
    // Don't throw - allow function to continue even if bucket check fails
  }
}

// Initialize bucket on startup (non-blocking)
ensureBucketExists();

// Health check endpoint (no auth required)
app.get("/health", (c) => {
  return c.json({ 
    status: "ok",
    timestamp: new Date().toISOString(),
    function: "make-server-be68fc60",
    version: "2.0"
  });
});

// Simple ping endpoint for testing
app.get("/ping", (c) => {
  return c.json({ message: "pong" });
});

// Helper function to delete a single inspection
async function deleteInspectionById(inspectionId: string) {
  console.log(`Deleting inspection: ${inspectionId}`);
  
  // Delete inspection items
  await supabase
    .from('kv_store_be68fc60')
    .delete()
    .eq('key', `inspection-items:${inspectionId}`);
  
  // Delete photos for this inspection (stored in a single record now)
  await supabase
    .from('kv_store_be68fc60')
    .delete()
    .eq('key', `inspection-photos:${inspectionId}`);
  
  // Delete the inspection record
  await supabase
    .from('kv_store_be68fc60')
    .delete()
    .eq('key', `inspection:${inspectionId}`);
  
  // Delete any preview tokens for this inspection
  const tokenPrefix = 'preview-token:';
  const { data: tokens } = await supabase
    .from('kv_store_be68fc60')
    .select('key, value')
    .gte('key', tokenPrefix)
    .lt('key', tokenPrefix + '\uffff');
  
  if (tokens) {
    for (const tokenRecord of tokens) {
      if (tokenRecord.value?.inspection_id === inspectionId) {
        await supabase
          .from('kv_store_be68fc60')
          .delete()
          .eq('key', tokenRecord.key);
      }
    }
  }
  
  console.log(`Successfully deleted inspection ${inspectionId}`);
}

// Import KV helper
import * as kv from './kv_store.tsx';

// Export all data (GDPR compliance)
app.get('/export-data', async (c) => {
  try {
    console.log('Exporting all system data');
    
    // Get all properties
    const properties = await kv.getByPrefix('property:');
    
    // Get all inspections
    const inspections = await kv.getByPrefix('inspection:');
    
    // Get all inspection items
    const inspectionItems = await kv.getByPrefix('inspection-items:');
    
    // Get all photos metadata
    const photos = await kv.getByPrefix('photos:');
    
    // Get all users
    const users = await kv.getByPrefix('user:');
    
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      data: {
        properties,
        inspections,
        inspectionItems,
        photos,
        users: users.map((u: any) => ({
          id: u.id,
          email: u.email,
          display_name: u.display_name,
          role: u.role,
          created_at: u.created_at,
        })),
      },
      counts: {
        properties: properties.length,
        inspections: inspections.length,
        users: users.length,
      },
    };
    
    console.log(`Export complete: ${JSON.stringify(exportData.counts)}`);
    
    return c.json(exportData);
  } catch (error: any) {
    console.error('Error exporting data:', error);
    return c.json({ error: error.message || 'Failed to export data' }, 500);
  }
});

// Delete inspection and all associated data
app.delete("/inspection/:id", async (c) => {
  try {
    const inspectionId = c.req.param('id');
    await deleteInspectionById(inspectionId);
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Inspection deletion error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Bulk delete inspections
app.post("/inspections/bulk-delete", async (c) => {
  try {
    const { ids } = await c.req.json();
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return c.json({ error: 'Invalid inspection IDs' }, 400);
    }
    
    console.log(`Bulk deleting ${ids.length} inspections`);
    
    // Delete each inspection
    for (const id of ids) {
      await deleteInspectionById(id);
    }
    
    return c.json({ success: true, deleted: ids.length });
  } catch (error: any) {
    console.error('Bulk deletion error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Delete property and all associated inspections
app.delete("/property/:id", async (c) => {
  try {
    const propertyId = c.req.param('id');
    console.log(`Deleting property: ${propertyId}`);
    
    // Find all inspections for this property
    const inspectionPrefix = 'inspection:';
    const { data: inspections } = await supabase
      .from('kv_store_be68fc60')
      .select('key, value')
      .gte('key', inspectionPrefix)
      .lt('key', inspectionPrefix + '\uffff');
    
    // Delete all associated inspections
    if (inspections) {
      for (const inspectionRecord of inspections) {
        if (inspectionRecord.value?.property_id === propertyId) {
          const inspectionId = inspectionRecord.key.replace('inspection:', '');
          await deleteInspectionById(inspectionId);
        }
      }
    }
    
    // Delete the property record
    await supabase
      .from('kv_store_be68fc60')
      .delete()
      .eq('key', `property:${propertyId}`);
    
    console.log(`Successfully deleted property ${propertyId} and all associated inspections`);
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Property deletion error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Admin: Delete user account
app.delete("/admin/user/:id", async (c) => {
  try {
    const userId = c.req.param('id');
    console.log(`Admin deleting user account: ${userId}`);
    
    // Verify user exists first
    const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(userId);
    if (getUserError) {
      console.error('Error fetching user:', getUserError);
      throw new Error(`User not found: ${getUserError.message}`);
    }
    console.log(`Found user to delete: ${userData.user?.email}`);
    
    // Delete user from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      console.error('Auth deletion error:', authError);
      throw new Error(`Failed to delete user from auth: ${authError.message}`);
    }
    console.log(`Successfully deleted user from auth: ${userId}`);
    
    // Delete user profile from KV store
    const { error: kvError } = await supabase
      .from('kv_store_be68fc60')
      .delete()
      .eq('key', `user:${userId}`);
    
    if (kvError) {
      console.error('KV store deletion error:', kvError);
      // Don't throw - user is already deleted from auth
    } else {
      console.log(`Successfully deleted user profile from KV store: ${userId}`);
    }
    
    console.log(`Successfully deleted user account ${userId}`);
    return c.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('User deletion error:', error);
    return c.json({ error: error.message || 'Failed to delete user' }, 500);
  }
});

// Admin: Delete all data created by a user
app.delete("/admin/user/:id/data", async (c) => {
  try {
    const userId = c.req.param('id');
    console.log(`Admin deleting all data for user: ${userId}`);
    
    let deletedCounts = {
      properties: 0,
      inspections: 0,
    };
    
    // Find and delete all properties created by this user
    const propertyPrefix = 'property:';
    const { data: properties } = await supabase
      .from('kv_store_be68fc60')
      .select('key, value')
      .gte('key', propertyPrefix)
      .lt('key', propertyPrefix + '\uffff');
    
    console.log(`Found ${properties?.length || 0} total properties in database`);
    
    if (properties) {
      for (const propertyRecord of properties) {
        const createdBy = propertyRecord.value?.created_by;
        console.log(`Checking property ${propertyRecord.key}: created_by = ${createdBy}, target userId = ${userId}`);
        
        // Match either the specific user ID or legacy 'user' entries
        if (createdBy === userId || createdBy === 'user') {
          const propertyId = propertyRecord.key.replace('property:', '');
          console.log(`Deleting property ${propertyId} (created_by: ${createdBy})`);
          
          // Find all inspections for this property
          const inspPrefix = 'inspection:';
          const { data: inspections } = await supabase
            .from('kv_store_be68fc60')
            .select('key, value')
            .gte('key', inspPrefix)
            .lt('key', inspPrefix + '\uffff');
          
          // Delete all associated inspections
          if (inspections) {
            for (const inspectionRecord of inspections) {
              if (inspectionRecord.value?.property_id === propertyId) {
                const inspectionId = inspectionRecord.key.replace('inspection:', '');
                console.log(`Deleting inspection ${inspectionId} for property ${propertyId}`);
                await deleteInspectionById(inspectionId);
                deletedCounts.inspections++;
              }
            }
          }
          
          // Delete the property
          await supabase
            .from('kv_store_be68fc60')
            .delete()
            .eq('key', propertyRecord.key);
          
          deletedCounts.properties++;
        }
      }
    }
    
    // Also delete any inspections directly created by this user (not tied to their properties)
    const allInspPrefix = 'inspection:';
    const { data: allInspections } = await supabase
      .from('kv_store_be68fc60')
      .select('key, value')
      .gte('key', allInspPrefix)
      .lt('key', allInspPrefix + '\uffff');
    
    console.log(`Found ${allInspections?.length || 0} total inspections in database`);
    
    if (allInspections) {
      for (const inspectionRecord of allInspections) {
        const createdBy = inspectionRecord.value?.created_by;
        console.log(`Checking inspection ${inspectionRecord.key}: created_by = ${createdBy}, target userId = ${userId}`);
        
        // Match either the specific user ID or legacy 'user' entries
        if (createdBy === userId || createdBy === 'user') {
          const inspectionId = inspectionRecord.key.replace('inspection:', '');
          console.log(`Deleting inspection ${inspectionId} (created_by: ${createdBy})`);
          await deleteInspectionById(inspectionId);
          deletedCounts.inspections++;
        }
      }
    }
    
    console.log(`Successfully deleted user data for ${userId}:`, deletedCounts);
    return c.json({ success: true, deleted: deletedCounts });
  } catch (error: any) {
    console.error('User data deletion error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// KV Store endpoints (bypass RLS using service role)
app.post("/kv/set", async (c) => {
  try {
    const { key, value } = await c.req.json();
    const { error } = await supabase
      .from('kv_store_be68fc60')
      .upsert({ key, value });
    
    if (error) throw error;
    return c.json({ success: true });
  } catch (error: any) {
    console.error('KV set error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post("/kv/get", async (c) => {
  try {
    const { key } = await c.req.json();
    const { data, error } = await supabase
      .from('kv_store_be68fc60')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    
    if (error) throw error;
    return c.json({ value: data?.value || null });
  } catch (error: any) {
    console.error('KV get error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post("/kv/delete", async (c) => {
  try {
    const { key } = await c.req.json();
    const { error } = await supabase
      .from('kv_store_be68fc60')
      .delete()
      .eq('key', key);
    
    if (error) throw error;
    return c.json({ success: true });
  } catch (error: any) {
    console.error('KV delete error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post("/kv/get-by-prefix", async (c) => {
  try {
    const { prefix, limit = 500 } = await c.req.json();
    
    console.log(`KV get-by-prefix: prefix="${prefix}", limit=${limit}`);
    
    // Note: Using shared supabase client instance (reuse singleton)
    // Timeout is handled at the database level
    
    // Use range query which is more efficient than LIKE for prefix searches
    const { data, error } = await supabase
      .from('kv_store_be68fc60')
      .select('key, value')
      .gte('key', prefix)
      .lt('key', prefix + '\uffff')  // Unicode max character for range
      .limit(limit)
      .order('key', { ascending: true });
    
    if (error) {
      console.error('KV get-by-prefix query error:', error);
      throw error;
    }
    
    console.log(`KV get-by-prefix: returned ${data?.length || 0} records`);
    return c.json({ values: data?.map((d) => d.value) || [] });
  } catch (error: any) {
    console.error('KV get-by-prefix error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post("/kv/mset", async (c) => {
  try {
    const { records } = await c.req.json();
    const { error } = await supabase
      .from('kv_store_be68fc60')
      .upsert(records);
    
    if (error) throw error;
    return c.json({ success: true });
  } catch (error: any) {
    console.error('KV mset error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Batch get multiple keys
app.post("/kv/mget", async (c) => {
  try {
    const { keys } = await c.req.json();
    
    if (!keys || keys.length === 0) {
      return c.json({ values: [] });
    }
    
    console.log(`KV mget: fetching ${keys.length} keys`);
    
    const { data, error } = await supabase
      .from('kv_store_be68fc60')
      .select('key, value')
      .in('key', keys);
    
    if (error) throw error;
    
    // Create a map for quick lookup
    const valueMap = new Map(data?.map(d => [d.key, d.value]) || []);
    
    // Return values in the same order as requested keys
    const values = keys.map(key => valueMap.get(key) || null);
    
    console.log(`KV mget: returned ${data?.length || 0} values`);
    return c.json({ values });
  } catch (error: any) {
    console.error('KV mget error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Initialize database tables (idempotent)
app.post("/init-db", async (c) => {
  try {
    // Create index on kv_store for faster prefix queries
    try {
      await supabase.rpc('exec_sql', {
        sql: `CREATE INDEX IF NOT EXISTS idx_kv_store_key_prefix ON kv_store_be68fc60(key text_pattern_ops);`
      });
      console.log('Created kv_store key index');
    } catch (indexError: any) {
      console.warn('Could not create kv_store index (may already exist):', indexError.message);
    }
    
    // Create users table extension (if not using auth.users)
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          display_name TEXT,
          role TEXT DEFAULT 'clerk',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS properties (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          address_line1 TEXT NOT NULL,
          address_line2 TEXT,
          city TEXT NOT NULL,
          postcode TEXT NOT NULL,
          country TEXT DEFAULT 'UK',
          bedrooms INTEGER,
          bathrooms INTEGER,
          notes TEXT,
          created_by UUID NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS inspections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
          type TEXT NOT NULL CHECK (type IN ('routine', 'fire_safety', 'check_in', 'check_out')),
          status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed')),
          assigned_to UUID,
          started_at TIMESTAMPTZ DEFAULT NOW(),
          completed_at TIMESTAMPTZ,
          created_by UUID NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          summary_notes TEXT,
          reference_code TEXT UNIQUE NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS inspection_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
          section TEXT NOT NULL,
          question TEXT NOT NULL,
          answer_text TEXT,
          answer_boolean BOOLEAN,
          answer_select TEXT,
          notes TEXT,
          order_index INTEGER NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS photos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
          section TEXT,
          item_id UUID,
          storage_key TEXT NOT NULL,
          original_filename TEXT NOT NULL,
          width INTEGER,
          height INTEGER,
          size_bytes BIGINT NOT NULL,
          exif_taken_at TIMESTAMPTZ,
          caption TEXT,
          order_index INTEGER NOT NULL,
          uploaded_by UUID NOT NULL,
          processing_status TEXT DEFAULT 'done',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS preview_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
          token TEXT UNIQUE NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          action TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);
        CREATE INDEX IF NOT EXISTS idx_inspections_property ON inspections(property_id);
        CREATE INDEX IF NOT EXISTS idx_inspections_completed ON inspections(completed_at DESC);
        CREATE INDEX IF NOT EXISTS idx_photos_inspection ON photos(inspection_id);
        CREATE INDEX IF NOT EXISTS idx_properties_postcode ON properties(postcode);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
      `
    });

    return c.json({ success: true, message: 'Database initialized' });
  } catch (error: any) {
    console.error('Database initialization error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Admin: Delete all inspections
app.delete("/admin/delete-all-inspections", async (c) => {
  try {
    console.log('Admin: Deleting all inspections');
    
    const inspectionPrefix = 'inspection:';
    const { data: inspections, error } = await supabase
      .from('kv_store_be68fc60')
      .select('key, value')
      .gte('key', inspectionPrefix)
      .lt('key', inspectionPrefix + '\uffff');
    
    if (error) {
      console.error('Query error:', error);
      return c.json({ error: `Database query failed: ${error.message}`, success: false }, 500);
    }
    
    let deletedCount = 0;
    if (inspections && inspections.length > 0) {
      console.log(`Found ${inspections.length} inspections to delete`);
      for (const inspectionRecord of inspections) {
        const inspectionId = inspectionRecord.key.replace('inspection:', '');
        await deleteInspectionById(inspectionId);
        deletedCount++;
        if (deletedCount % 10 === 0) {
          console.log(`Deleted ${deletedCount}/${inspections.length} inspections...`);
        }
      }
    } else {
      console.log('No inspections found to delete');
    }
    
    console.log(`Successfully deleted ${deletedCount} inspections`);
    return c.json({ success: true, deleted: deletedCount, message: `Deleted ${deletedCount} inspections` });
  } catch (error: any) {
    console.error('Delete all inspections error:', error);
    const errorMessage = error?.message || 'Unknown error occurred';
    return c.json({ error: errorMessage, success: false }, 500);
  }
});

// Admin: Delete all properties (and their inspections)
app.delete("/admin/delete-all-properties", async (c) => {
  try {
    console.log('Admin: Deleting all properties');
    
    const propertyPrefix = 'property:';
    const { data: properties, error } = await supabase
      .from('kv_store_be68fc60')
      .select('key, value')
      .gte('key', propertyPrefix)
      .lt('key', propertyPrefix + '\uffff');
    
    if (error) {
      console.error('Query error:', error);
      return c.json({ error: `Database query failed: ${error.message}`, success: false }, 500);
    }
    
    let deletedCount = 0;
    if (properties && properties.length > 0) {
      console.log(`Found ${properties.length} properties to delete`);
      
      for (const propertyRecord of properties) {
        const propertyId = propertyRecord.key.replace('property:', '');
        
        // Find and delete all inspections for this property
        const inspectionPrefix = 'inspection:';
        const { data: inspections } = await supabase
          .from('kv_store_be68fc60')
          .select('key, value')
          .gte('key', inspectionPrefix)
          .lt('key', inspectionPrefix + '\uffff');
        
        if (inspections) {
          for (const inspectionRecord of inspections) {
            if (inspectionRecord.value?.property_id === propertyId) {
              const inspectionId = inspectionRecord.key.replace('inspection:', '');
              await deleteInspectionById(inspectionId);
            }
          }
        }
        
        // Delete the property
        await supabase
          .from('kv_store_be68fc60')
          .delete()
          .eq('key', `property:${propertyId}`);
        
        deletedCount++;
        console.log(`Deleted property ${deletedCount}/${properties.length}`);
      }
    } else {
      console.log('No properties found to delete');
    }
    
    console.log(`Successfully deleted ${deletedCount} properties`);
    return c.json({ success: true, deleted: deletedCount, message: `Deleted ${deletedCount} properties` });
  } catch (error: any) {
    console.error('Delete all properties error:', error);
    const errorMessage = error?.message || 'Unknown error occurred';
    return c.json({ error: errorMessage, success: false }, 500);
  }
});

// Admin: Delete all photos (photo-data keys only, keeps photo-index)
app.delete("/admin/delete-all-photos", async (c) => {
  try {
    console.log('Admin: Deleting all photos from database');
    
    const photoDataPrefix = 'photo-data:';
    const { data: photos, error } = await supabase
      .from('kv_store_be68fc60')
      .select('key')
      .gte('key', photoDataPrefix)
      .lt('key', photoDataPrefix + '\uffff');
    
    if (error) {
      console.error('Query error:', error);
      return c.json({ error: `Database query failed: ${error.message}` }, 500);
    }
    
    let deletedCount = 0;
    if (photos && photos.length > 0) {
      console.log(`Found ${photos.length} photo records to delete`);
      
      // Delete in batches to avoid timeout
      const batchSize = 100;
      for (let i = 0; i < photos.length; i += batchSize) {
        const batch = photos.slice(i, i + batchSize);
        const keys = batch.map(p => p.key);
        
        const { error: deleteError } = await supabase
          .from('kv_store_be68fc60')
          .delete()
          .in('key', keys);
        
        if (deleteError) {
          console.error(`Batch delete error:`, deleteError);
          return c.json({ error: `Failed to delete batch: ${deleteError.message}` }, 500);
        }
        
        deletedCount += keys.length;
        console.log(`Deleted batch ${Math.floor(i / batchSize) + 1}: ${keys.length} photos (total: ${deletedCount})`);
      }
    } else {
      console.log('No photo records found to delete');
    }
    
    console.log(`Successfully deleted ${deletedCount} photo data records`);
    return c.json({ success: true, deleted: deletedCount, message: `Deleted ${deletedCount} photos` });
  } catch (error: any) {
    console.error('Delete all photos error:', error);
    const errorMessage = error?.message || 'Unknown error occurred';
    return c.json({ error: errorMessage, success: false }, 500);
  }
});

// Admin: Nuclear option - Delete ALL data from KV store
app.delete("/admin/delete-all-data", async (c) => {
  try {
    console.log('Admin: NUCLEAR DELETION - Deleting ALL data from KV store');
    
    // Get all records
    const { data: allRecords, error } = await supabase
      .from('kv_store_be68fc60')
      .select('key');
    
    if (error) {
      console.error('Query error:', error);
      return c.json({ error: `Database query failed: ${error.message}`, success: false }, 500);
    }
    
    let deletedCount = 0;
    if (allRecords && allRecords.length > 0) {
      console.log(`Found ${allRecords.length} total records to delete`);
      
      const keysToDelete = allRecords.map(r => r.key);
      
      // Delete in batches
      const batchSize = 500;
      for (let i = 0; i < keysToDelete.length; i += batchSize) {
        const batch = keysToDelete.slice(i, i + batchSize);
        
        const { error: deleteError } = await supabase
          .from('kv_store_be68fc60')
          .delete()
          .in('key', batch);
        
        if (deleteError) {
          console.error(`Batch delete error:`, deleteError);
          return c.json({ error: `Failed to delete batch: ${deleteError.message}`, success: false }, 500);
        }
        
        deletedCount += batch.length;
        console.log(`Deleted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records (total: ${deletedCount}/${allRecords.length})`);
      }
    } else {
      console.log('No records found to delete');
    }
    
    console.log(`Successfully deleted ${deletedCount} total records from database`);
    return c.json({ 
      success: true, 
      deleted: deletedCount,
      message: `Deleted ${deletedCount} records from KV store` 
    });
  } catch (error: any) {
    console.error('Delete all data error:', error);
    const errorMessage = error?.message || 'Unknown error occurred';
    return c.json({ error: errorMessage, success: false }, 500);
  }
});

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: err.message || 'Internal server error' }, 500);
});

// 404 handler
app.notFound((c) => {
  console.log('404 Not Found:', c.req.path);
  return c.json({ error: 'Not found', path: c.req.path }, 404);
});

Deno.serve(app.fetch);
