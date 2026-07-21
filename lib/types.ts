export type Challenge = {
  id: string;
  name: string;
  daily_goal: number;
  duration_days: number;
  start_date: string; // YYYY-MM-DD
  invite_code: string;
  created_at?: string;
};

export type Participant = {
  id: string;
  challenge_id: string;
  name: string;
  avatar_color: string;
  secret_token: string;
  created_at?: string;
};

export type LogRow = {
  id: string;
  participant_id: string;
  day_date: string; // YYYY-MM-DD
  reps: number;
};

export type ParticipantStats = {
  participant: Participant;
  total: number;
  today: number;
  streak: number;
};
