import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zfnupulpecotitgqunak.supabase.co';
const SUPABASE_ANON_KEY = 'ey...'; // sua anon key correta

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const setAuthToken = (token: string | null) => {
  if (token) {
    supabase.rest.headers['Authorization'] = `Bearer ${token}`;
  } else {
    delete supabase.rest.headers['Authorization'];
  }
};

export const invokeEdgeFunction = async <T>(functionName: string, body: any): Promise<T> => {
  const { data, error } = await supabase.functions.invoke(functionName, { body });

  if (error) throw error;
  return data as T;
};
