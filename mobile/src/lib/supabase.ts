import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Polyfill uniquement sur mobile (pas web)
if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}

// Clés Supabase
const SUPABASE_URL = "https://kzwkauprdpkrrwotwost.supabase.co";

// Clé anonyme (publique) - sécurisée pour le client, protégée par RLS
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6d2thdXByZHBrcnJ3b3R3b3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwODU2MjAsImV4cCI6MjA4NDY2MTYyMH0.fOxeKaxgHYHdnGUxN2alWNqIeIE0TRHp9PmbEE_jJ3g";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
