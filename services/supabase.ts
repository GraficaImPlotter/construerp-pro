
import { createClient } from '@supabase/supabase-js';

// Configuration with user provided credentials
// Project URL: https://zfnupulpecotitgqunak.supabase.co
const SUPABASE_URL = 'https://zfnupulpecotitgqunak.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmbnVwdWxwZWNvdGl0Z3F1bmFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NDg5ODYsImV4cCI6MjA3OTIyNDk4Nn0.bZVxoIGWihkLUNmBV-IM-1pw7LHJDh7jA-J7zGVodHA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Sets the Authorization header for the Supabase client.
 * This is crucial for RLS to work with our Custom JWT.
 */
export const setAuthToken = (token: string | null) => {
  if (token && !token.includes('fake-jwt')) {
    // Inject the custom JWT into the Authorization header ONLY if it is a real token
    // @ts-ignore - modifying internal headers to support custom auth
    supabase.rest.headers['Authorization'] = `Bearer ${token}`;
  } else {
    // If it is a fake token (simulation) or null, remove the header so Supabase uses the ANON key
    // @ts-ignore
    delete supabase.rest.headers['Authorization'];
  }
};

/**
 * Helper to call Edge Functions with the custom Authorization header
 */
export const invokeEdgeFunction = async <T,>(functionName: string, body: any, token?: string): Promise<T> => {
  console.log(`[EdgeFunction] Invoking ${functionName}`, body);

  // SIMULATION BLOCK:
  // Remove this block once you have deployed your Edge Functions to Supabase.
  // This allows the UI to function for demonstration purposes before backend deployment.
  if (functionName === 'auth-login') {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (body.nick === 'admin' && body.password === 'teste1234') {
           resolve({
             user: {
               // FIXED: ID must be a valid UUID to match Database constraints
               id: '00000000-0000-0000-0000-000000000001', 
               nick: 'admin',
               role: 'master',
               permissions: ['all'],
               created_at: new Date().toISOString()
             },
             token: 'fake-jwt-token-for-simulation-only'
           } as T);
        } else {
          reject(new Error("Invalid credentials. Try admin / teste1234"));
        }
      }, 800);
    });
  }

  if (functionName === 'emit-nfe' || functionName === 'emit-nfse') {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          status: 'authorized',
          xml_url: 'https://www.nfe.fazenda.gov.br/portal/principal.aspx', // Mock URL
          pdf_url: 'https://www.nfe.fazenda.gov.br/portal/principal.aspx', // Mock URL
          invoice_id: 'inv_' + Math.floor(Math.random() * 1000)
        } as T);
      }, 2000);
    });
  }

  if (functionName === 'upload-cert') {
     return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: 'Certificado criptografado e armazenado com sucesso.'
        } as T);
      }, 1500);
    }); 
  }
  // END SIMULATION BLOCK

  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (error) throw error;
  return data as T;
};
