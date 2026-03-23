import type { ParseResult, Player, StarLevel } from "../types/domain";
import { normalizePlayerName, sanitizeStars } from "./validators";

function createPlayer(name: string, stars: StarLevel): Player {
  return {
    id: crypto.randomUUID(),
    name,
    stars,
  };
}

export function parsePlayersFromTemplate(rawText: string): ParseResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const players: Player[] = [];
  const ignoredLines: string[] = [];
  const fallbackCandidates: string[] = [];
  let inPlayersSection = false;
  let sawPlayersMarker = false;

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper.includes("JOGADORES")) {
      inPlayersSection = true;
      sawPlayersMarker = true;
      continue;
    }
    if (upper.includes("SUPLENTES")) {
      break;
    }

    if (!inPlayersSection) {
      // Suporta também colagem sem cabeçalhos (somente lista numerada).
      fallbackCandidates.push(line);
      continue;
    }

    const parsedLine = parsePlayerLine(line);
    if (!parsedLine) {
      ignoredLines.push(line);
      continue;
    }
    players.push(createPlayer(parsedLine.name, parsedLine.stars));
  }

  // Fallback quando o usuário cola só as linhas dos jogadores sem cabeçalho.
  if (!players.length && !sawPlayersMarker) {
    for (const line of fallbackCandidates) {
      const parsedLine = parsePlayerLine(line);
      if (!parsedLine) {
        ignoredLines.push(line);
        continue;
      }
      players.push(createPlayer(parsedLine.name, parsedLine.stars));
    }
  }

  return { players, ignoredLines };
}

function parsePlayerLine(line: string): { name: string; stars: StarLevel } | null {
  const starsCount = (line.match(/⭐/g) ?? []).length;
  if (starsCount === 0) {
    return null;
  }

  const withoutOrder = line.replace(/^\d+\.\s*/, "").trim();
  const cleanedName = normalizePlayerName(
    withoutOrder
      .replaceAll(/⭐️|⭐/g, "")
      .replaceAll("✅", "")
      .replaceAll(/\bPH\b/gi, "")
      .replaceAll(/[()]/g, " ")
      .replaceAll(/\s{2,}/g, " ")
      .trim(),
  );

  if (!cleanedName) {
    return null;
  }

  return {
    name: cleanedName,
    stars: sanitizeStars(starsCount) as StarLevel,
  };
}
