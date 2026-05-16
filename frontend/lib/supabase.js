import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://onvklnfugvkjinzgjchp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7-JTFqYr7G6xG5Vt_11tMQ_Le88dGN3';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
