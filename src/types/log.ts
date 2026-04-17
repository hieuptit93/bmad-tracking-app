export interface RecentLog {
  id: string;
  user_id: string;
  task_name: string;
  tool_used: string;
  category: string;
  estimate_hours: number;
  actual_hours: number;
  percent_saved: number;
  rating: number | null;
  notes: string | null;
  created_at: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
}
