// Supabase client — loaded after the CDN bundle via <script> tags in each page
// Usage anywhere: window.supabaseClient, window.DB

const SUPABASE_URL = 'https://qouefvokxptmzwiiqdwm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvdWVmdm9reHB0bXp3aWlxZHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMjY0MjksImV4cCI6MjA5MDYwMjQyOX0._tFwADixfZ6wzkqYWMKViUBjJvE4pbPaNBvcwwzwTyM';

const { createClient } = supabase;
window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.DB = {
  // Insert a new session row. Returns the new session's UUID.
  async saveSession(payload) {
    const db = window.supabaseClient;

    const { data, error } = await db
      .from('sessions')
      .insert(payload)
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  },

  // POST trades array to receipts table linked to sessionId.
  async saveReceipt(sessionId, trades) {
    const { error } = await window.supabaseClient
      .from('receipts')
      .insert({ session_id: sessionId, trades });
    if (error) throw error;
  },

  // Fetch trades array for a session from the receipts table.
  // Returns [] if no receipt exists yet.
  async getReceipt(sessionId) {
    const { data, error } = await window.supabaseClient
      .from('receipts')
      .select('trades')
      .eq('session_id', sessionId)
      .maybeSingle();
    if (error || !data) return [];
    return data.trades || [];
  },
};
