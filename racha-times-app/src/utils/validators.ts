import type { AppConfig, Player } from "../types/domain";

export function sanitizeStars(value: number): 1 | 2 | 3 | 4 | 5 {
  if (value <= 1) {
    return 1;
  }
  if (value >= 5) {
    return 5;
  }
  return Math.round(value) as 1 | 2 | 3 | 4 | 5;
}

export function validateConfig(config: AppConfig): string | null {
  if (!Number.isInteger(config.numberOfTeams) || config.numberOfTeams < 2) {
    return "Informe ao menos 2 times.";
  }
  if (!Number.isInteger(config.playersPerTeam) || config.playersPerTeam < 1) {
    return "Informe ao menos 1 jogador por time.";
  }
  return null;
}

export function validatePlayersCount(config: AppConfig, players: Player[]): string | null {
  const requiredPlayers = config.numberOfTeams * config.playersPerTeam;
  if (players.length !== requiredPlayers) {
    return `Quantidade inválida: você precisa de ${requiredPlayers} jogadores para ${config.numberOfTeams} times com ${config.playersPerTeam} por time.`;
  }
  return null;
}

export function normalizePlayerName(name: string): string {
  return name.replaceAll(/\s+/g, " ").trim();
}
