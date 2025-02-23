import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngaiszrgqqzpaoflidqv.supabase.co'; // Replace with your Supabase Project URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nYWlzenJncXF6cGFvZmxpZHF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc4ODkyOTcsImV4cCI6MjA1MzQ2NTI5N30.S-uTJJMAc5KY9SJGHwQHeP4fnqOTwEn66sY5gMtqnxI'
export const supabase = createClient(supabaseUrl, supabaseKey);