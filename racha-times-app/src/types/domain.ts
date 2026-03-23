export type StarLevel = 1 | 2 | 3 | 4 | 5;

export interface Player {
  id: string;
  name: string;
  stars: StarLevel;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
  totalStars: number;
  averageStars: number;
}

export interface AppConfig {
  numberOfTeams: number;
  playersPerTeam: number;
}

export interface ParseResult {
  players: Player[];
  ignoredLines: string[];
}

export interface BalanceResult {
  teams: Team[];
  scoreGap: number;
  averageGap: number;
}
