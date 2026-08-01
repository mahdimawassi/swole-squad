export type GoalMode = 'daily' | 'total';

export type User = {
  id: string;
  email: string | null;
  name: string;
  avatar_color: string;
  avatar_style?: string;
  equipped?: Record<string, string>;
  secret_token: string;
  reminders_opt_out?: boolean;
  email_reminders?: boolean;
  email_activity?: boolean;
  email_unsubscribed?: boolean;
  created_at?: string;
};

export type Challenge = {
  id: string;
  name: string;
  activity: string;
  unit_label: string;
  goal_mode: GoalMode;
  goal_amount: number;
  start_date: string; // YYYY-MM-DD
  duration_days: number;
  end_date: string; // YYYY-MM-DD
  invite_code: string;
  created_by: string | null;
  sharing_enabled?: boolean;
  group_chat_url?: string | null;
  created_at?: string;
};

export type Member = {
  participant_id: string;
  user_id: string;
  name: string;
  avatar_color: string;
  avatar_style?: string;
  equipped?: Record<string, string>;
  joined_at?: string;
};

export type LogRow = {
  id: string;
  participant_id: string;
  day_date: string; // YYYY-MM-DD
  amount: number;
};

export type MemberStats = {
  member: Member;
  total: number;
  today: number;
  streak: number;
};

// One card on the hub.
export type HubEntry = {
  challenge: Challenge;
  participant_id: string;
  total: number;
  today: number;
  streak: number;
  rank: number;
  squadSize: number;
};

// emoji -> who left it (user ids), whether I did, and how fresh the newest is
export type ReactionCell = {
  count: number;
  mine: boolean;
  who: string[];
  latest: string; // ISO timestamp of the most recent one
};

export type ReactionSummary = Record<string, ReactionCell>;
