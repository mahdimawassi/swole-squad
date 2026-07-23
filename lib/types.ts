export type GoalMode = 'daily' | 'total';

export type User = {
  id: string;
  email: string | null;
  name: string;
  avatar_color: string;
  secret_token: string;
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
  created_at?: string;
};

export type Member = {
  participant_id: string;
  user_id: string;
  name: string;
  avatar_color: string;
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
