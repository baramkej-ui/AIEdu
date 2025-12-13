export type LevelTestGrade = {
  writing: string;
  reading: string;
};

export type HistoryItem = {
  id: string;
  date: string;
  activity: string;
  score?: string;
  duration?: string;
  historyId?: string;
};

export type Student = {
  id: string;
  name: string;
  avatarUrl: string;
  email: string;
  role: string;
  totalLogins: number;
  lastLogin: string;
  levelTest: LevelTestGrade;
  levelTestHistory: HistoryItem[];
  rolePlayHistory: HistoryItem[];
};