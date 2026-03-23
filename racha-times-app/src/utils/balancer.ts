import type { BalanceResult, Player, Team } from "../types/domain";

interface TeamBucket {
  id: string;
  name: string;
  players: Player[];
}

function shuffleWithSeed<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function evaluateBucket(bucket: TeamBucket): { totalStars: number; averageStars: number } {
  const totalStars = bucket.players.reduce((sum, player) => sum + player.stars, 0);
  const averageStars = bucket.players.length ? totalStars / bucket.players.length : 0;
  return { totalStars, averageStars };
}

function toTeams(buckets: TeamBucket[]): Team[] {
  return buckets.map((bucket) => {
    const { totalStars, averageStars } = evaluateBucket(bucket);
    return {
      ...bucket,
      totalStars,
      averageStars,
    };
  });
}

function computeGaps(buckets: TeamBucket[]): { scoreGap: number; averageGap: number } {
  const teams = toTeams(buckets);
  const totals = teams.map((team) => team.totalStars);
  const avgs = teams.map((team) => team.averageStars);
  const scoreGap = Math.max(...totals) - Math.min(...totals);
  const averageGap = Math.max(...avgs) - Math.min(...avgs);
  return { scoreGap, averageGap };
}

type BestSwap =
  | {
      i: number;
      j: number;
      aIndex: number;
      bIndex: number;
      gain: number;
    }
  | undefined;

function findBestSwap(buckets: TeamBucket[]): BestSwap {
  const current = computeGaps(buckets);
  let bestSwap: BestSwap;

  for (let i = 0; i < buckets.length; i += 1) {
    for (let j = i + 1; j < buckets.length; j += 1) {
      const teamA = buckets[i];
      const teamB = buckets[j];
      for (let aIndex = 0; aIndex < teamA.players.length; aIndex += 1) {
        for (let bIndex = 0; bIndex < teamB.players.length; bIndex += 1) {
          [teamA.players[aIndex], teamB.players[bIndex]] = [teamB.players[bIndex], teamA.players[aIndex]];
          const next = computeGaps(buckets);
          const gain = current.scoreGap - next.scoreGap + (current.averageGap - next.averageGap) * 0.25;
          [teamA.players[aIndex], teamB.players[bIndex]] = [teamB.players[bIndex], teamA.players[aIndex]];

          if (!bestSwap || gain > bestSwap.gain) {
            bestSwap = { i, j, aIndex, bIndex, gain };
          }
        }
      }
    }
  }

  return bestSwap;
}

export function generateBalancedTeams(
  players: Player[],
  numberOfTeams: number,
  playersPerTeam: number,
): BalanceResult {
  const groupedByStarsDesc = [...players].sort((a, b) => b.stars - a.stars);
  const shuffledInsideTier = shuffleWithSeed(groupedByStarsDesc);

  const buckets: TeamBucket[] = Array.from({ length: numberOfTeams }, (_, index) => ({
    id: crypto.randomUUID(),
    name: `Time ${index + 1}`,
    players: [],
  }));

  for (const player of shuffledInsideTier) {
    const possibleTeams = buckets
      .filter((bucket) => bucket.players.length < playersPerTeam)
      .sort((a, b) => {
        const scoreA = evaluateBucket(a).totalStars;
        const scoreB = evaluateBucket(b).totalStars;
        return scoreA - scoreB;
      });
    possibleTeams[0].players.push(player);
  }

  // Melhoria local por trocas 1x1 enquanto reduzir o gap.
  let improved = true;
  while (improved) {
    improved = false;
    const bestSwap = findBestSwap(buckets);

    if (bestSwap && bestSwap.gain > 0) {
      const { i, j, aIndex, bIndex } = bestSwap;
      [buckets[i].players[aIndex], buckets[j].players[bIndex]] = [
        buckets[j].players[bIndex],
        buckets[i].players[aIndex],
      ];
      improved = true;
    }
  }

  const teams = toTeams(buckets);
  const { scoreGap, averageGap } = computeGaps(buckets);
  return { teams, scoreGap, averageGap };
}
