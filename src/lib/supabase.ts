import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;

// Singleton pattern: ensure only one Supabase client instance exists
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient(supabaseUrl, publicAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage, // Explicitly use localStorage for persistence
        storageKey: 'ab-property-inspection-auth', // Custom storage key
      },
      global: {
        headers: {
          'x-client-info': 'ab-property-inspection-app',
        },
      },
      db: {
        schema: 'public',
      },
      realtime: {
        // Disable realtime unless needed (reduces connections)
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    
    console.log('✅ Supabase client initialized (single instance)');
  }
  
  return supabaseInstance;
}

// Export the singleton instance
export const supabase = getSupabaseClient();

// Utility to verify the client is the same instance
export function getSupabaseInstance() {
  return supabaseInstance;
}

// Check if the instance is initialized
export function isSupabaseInitialized(): boolean {
  return supabaseInstance !== null;
}

// Session persistence monitoring (development only)
// Safely check for development environment
const isDevelopment = typeof import.meta !== 'undefined' && 
                      import.meta.env && 
                      import.meta.env.DEV;

if (isDevelopment) {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log(`🔐 Auth state changed: ${event}`, {
      userId: session?.user?.id,
      expiresAt: session?.expires_at,
    });
  });
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          role: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          role?: string;
          created_at?: string;
        };
      };
      properties: {
        Row: {
          id: string;
          title: string;
          address_line1: string;
          address_line2: string | null;
          city: string;
          postcode: string;
          country: string;
          bedrooms: number | null;
          bathrooms: number | null;
          notes: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          address_line1: string;
          address_line2?: string | null;
          city: string;
          postcode: string;
          country?: string;
          bedrooms?: number | null;
          bathrooms?: number | null;
          notes?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          address_line1?: string;
          address_line2?: string | null;
          city?: string;
          postcode?: string;
          country?: string;
          bedrooms?: number | null;
          bathrooms?: number | null;
          notes?: string | null;
          created_by?: string;
          created_at?: string;
        };
      };
      inspections: {
        Row: {
          id: string;
          property_id: string;
          type: 'routine' | 'fire_safety' | 'check_in' | 'check_out';
          status: 'draft' | 'in_progress' | 'completed';
          assigned_to: string | null;
          started_at: string;
          completed_at: string | null;
          created_by: string;
          updated_at: string;
          summary_notes: string | null;
          reference_code: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          type: 'routine' | 'fire_safety' | 'check_in' | 'check_out';
          status?: 'draft' | 'in_progress' | 'completed';
          assigned_to?: string | null;
          started_at?: string;
          completed_at?: string | null;
          created_by: string;
          updated_at?: string;
          summary_notes?: string | null;
          reference_code: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          type?: 'routine' | 'fire_safety' | 'check_in' | 'check_out';
          status?: 'draft' | 'in_progress' | 'completed';
          assigned_to?: string | null;
          started_at?: string;
          completed_at?: string | null;
          created_by?: string;
          updated_at?: string;
          summary_notes?: string | null;
          reference_code?: string;
        };
      };
      inspection_items: {
        Row: {
          id: string;
          inspection_id: string;
          section: string;
          question: string;
          answer_text: string | null;
          answer_boolean: boolean | null;
          answer_select: string | null;
          notes: string | null;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          inspection_id: string;
          section: string;
          question: string;
          answer_text?: string | null;
          answer_boolean?: boolean | null;
          answer_select?: string | null;
          notes?: string | null;
          order_index: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          inspection_id?: string;
          section?: string;
          question?: string;
          answer_text?: string | null;
          answer_boolean?: boolean | null;
          answer_select?: string | null;
          notes?: string | null;
          order_index?: number;
          created_at?: string;
        };
      };
      photos: {
        Row: {
          id: string;
          inspection_id: string;
          section: string | null;
          item_id: string | null;
          storage_key: string;
          original_filename: string;
          width: number | null;
          height: number | null;
          size_bytes: number;
          exif_taken_at: string | null;
          caption: string | null;
          order_index: number;
          uploaded_by: string;
          processing_status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          inspection_id: string;
          section?: string | null;
          item_id?: string | null;
          storage_key: string;
          original_filename: string;
          width?: number | null;
          height?: number | null;
          size_bytes: number;
          exif_taken_at?: string | null;
          caption?: string | null;
          order_index: number;
          uploaded_by: string;
          processing_status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          inspection_id?: string;
          section?: string | null;
          item_id?: string | null;
          storage_key?: string;
          original_filename?: string;
          width?: number | null;
          height?: number | null;
          size_bytes?: number;
          exif_taken_at?: string | null;
          caption?: string | null;
          order_index?: number;
          uploaded_by?: string;
          processing_status?: string;
          created_at?: string;
        };
      };
      preview_tokens: {
        Row: {
          id: string;
          inspection_id: string;
          token: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          inspection_id: string;
          token: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          inspection_id?: string;
          token?: string;
          expires_at?: string;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          entity_type: string;
          entity_id: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          entity_type: string;
          entity_id: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: string;
          entity_type?: string;
          entity_id?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
    };
  };
}
