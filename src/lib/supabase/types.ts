export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'admin' | 'user'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'admin' | 'user'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'admin' | 'user'
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          due_date: string
          priority: 'high' | 'medium' | 'low'
          status: 'pending' | 'in_progress' | 'completed'
          area: string
          requesting_area: string
          created_by: string
          assigned_to: string | null
          created_at: string
          updated_at: string
          document_url?: string
          document_name?: string
          document_size?: number
          document_type?: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          due_date: string
          priority: 'high' | 'medium' | 'low'
          status?: 'pending' | 'in_progress' | 'completed'
          area: string
          requesting_area: string
          created_by: string
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
          document_url?: string
          document_name?: string
          document_size?: number
          document_type?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          due_date?: string
          priority?: 'high' | 'medium' | 'low'
          status?: 'pending' | 'in_progress' | 'completed'
          area?: string
          requesting_area?: string
          created_by?: string
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
          document_url?: string
          document_name?: string
          document_size?: number
          document_type?: string
        }
      }
      office_categories: {
        Row: {
          id: string
          name: 'REGION' | 'MUNICIPIOS' | 'OTROS'
          created_at: string
        }
        Insert: {
          id?: string
          name: 'REGION' | 'MUNICIPIOS' | 'OTROS'
          created_at?: string
        }
        Update: {
          id?: string
          name?: 'REGION' | 'MUNICIPIOS' | 'OTROS'
          created_at?: string
        }
      }
      office_subcategories: {
        Row: {
          id: string
          category_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          created_at?: string
        }
      }
      office_documents: {
        Row: {
          id: string
          subcategory_id: string
          title: string
          description: string | null
          document_url: string
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          subcategory_id: string
          title: string
          description?: string | null
          document_url: string
          uploaded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          subcategory_id?: string
          title?: string
          description?: string | null
          document_url?: string
          uploaded_by?: string
          created_at?: string
        }
      }
    }
  }
}