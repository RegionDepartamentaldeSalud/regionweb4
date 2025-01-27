import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase/client';
import type { Database } from '../../lib/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export default function Account() {
  const { user } = useAuth();
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select()
          .eq('id', user.id)
          .maybeSingle();

        if (!error && data) {
          setProfile(data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-yellow-700">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Mi Cuenta</h2>
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <p className="mt-1 text-sm text-gray-900">{profile.email}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
          <p className="mt-1 text-sm text-gray-900">{profile.full_name || 'No especificado'}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Rol</label>
          <p className="mt-1 text-sm text-gray-900">{profile.role}</p>
        </div>
      </div>
    </div>
  );
}