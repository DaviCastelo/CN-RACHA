import type { BalanceResult, Player, Team } from "../types/domain";

interface TeamBucket {
  id: string;
  name: string;
  players: Player[];
}

interface ObjectiveMetrics {
  totalVariance: number;
  averageVariance: number;
  starDistributionPenalty: number;
  strongWeakPenalty: number;
  scoreGap: number;
  averageGap: number;
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

function variance(values: number[]): number {
  if (!values.length) {
    return 0;
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
}

function getStarCounts(players: Player[]): number[] {
  const counts = [0, 0, 0, 0, 0];
  for (const player of players) {
    counts[player.stars - 1] += 1;
  }
  return counts;
}

function computeStarDistributionPenalty(buckets: TeamBucket[]): number {
  const totalPlayers = buckets.flatMap((bucket) => bucket.players);
  const totalCounts = getStarCounts(totalPlayers);
  const teamCount = buckets.length;

  let penalty = 0;
  for (const bucket of buckets) {
    const teamCounts = getStarCounts(bucket.players);
    for (let i = 0; i < totalCounts.length; i += 1) {
      const expected = totalCounts[i] / teamCount;
      penalty += Math.abs(teamCounts[i] - expected);
    }
  }
  return penalty;
}

function computeStrongWeakPenalty(buckets: TeamBucket[]): number {
  const strongCounts = buckets.map(
    (bucket) => bucket.players.filter((player) => player.stars >= 4).length,
  );
  const weakCounts = buckets.map(
    (bucket) => bucket.players.filter((player) => player.stars <= 2).length,
  );
  return variance(strongCounts) + variance(weakCounts);
}

function evaluateObjective(buckets: TeamBucket[]): ObjectiveMetrics {
  const teams = toTeams(buckets);
  const totals = teams.map((team) => team.totalStars);
  const avgs = teams.map((team) => team.averageStars);
  const scoreGap = Math.max(...totals) - Math.min(...totals);
  const averageGap = Math.max(...avgs) - Math.min(...avgs);

  const totalVariance = variance(totals);
  const averageVariance = variance(avgs);
  const starDistributionPenalty = computeStarDistributionPenalty(buckets);
  const strongWeakPenalty = computeStrongWeakPenalty(buckets);

  return {
    totalVariance,
    averageVariance,
    starDistributionPenalty,
    strongWeakPenalty,
    scoreGap,
    averageGap,
  };
}

function objectiveScore(metrics: ObjectiveMetrics): number {
  return (
    metrics.totalVariance * 1.25 +
    metrics.averageVariance * 1.5 +
    metrics.starDistributionPenalty * 0.7 +
    metrics.strongWeakPenalty * 0.9 +
    metrics.scoreGap * 0.8 +
    metrics.averageGap * 0.6
  );
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
  const currentMetrics = evaluateObjective(buckets);
  const currentScore = objectiveScore(currentMetrics);
  let bestSwap: BestSwap;

  for (let i = 0; i < buckets.length; i += 1) {
    for (let j = i + 1; j < buckets.length; j += 1) {
      const teamA = buckets[i];
      const teamB = buckets[j];
      for (let aIndex = 0; aIndex < teamA.players.length; aIndex += 1) {
        for (let bIndex = 0; bIndex < teamB.players.length; bIndex += 1) {
          [teamA.players[aIndex], teamB.players[bIndex]] = [teamB.players[bIndex], teamA.players[aIndex]];
            const nextMetrics = evaluateObjective(buckets);
            const nextScore = objectiveScore(nextMetrics);
            const gain = currentScore - nextScore;
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

function createInitialBuckets(players: Player[], numberOfTeams: number, playersPerTeam: number): TeamBucket[] {
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

  return buckets;
}

function cloneBuckets(buckets: TeamBucket[]): TeamBucket[] {
  return buckets.map((bucket) => ({
    ...bucket,
    players: [...bucket.players],
  }));
}

function optimizeWithLocalSwaps(initialBuckets: TeamBucket[]): TeamBucket[] {
  const buckets = cloneBuckets(initialBuckets);
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

  return buckets;
}

function getAttemptCount(totalPlayers: number): number {
  if (totalPlayers <= 10) {
    return 240;
  }
  if (totalPlayers <= 20) {
    return 180;
  }
  if (totalPlayers <= 30) {
    return 130;
  }
  return 90;
}

export function generateBalancedTeams(
  players: Player[],
  numberOfTeams: number,
  playersPerTeam: number,
): BalanceResult {
  const attemptCount = getAttemptCount(players.length);
  let bestBuckets = optimizeWithLocalSwaps(createInitialBuckets(players, numberOfTeams, playersPerTeam));
  let bestScore = objectiveScore(evaluateObjective(bestBuckets));

  for (let i = 1; i < attemptCount; i += 1) {
    const candidateBuckets = optimizeWithLocalSwaps(
      createInitialBuckets(players, numberOfTeams, playersPerTeam),
    );
    const candidateScore = objectiveScore(evaluateObjective(candidateBuckets));
    if (candidateScore < bestScore) {
      bestScore = candidateScore;
      bestBuckets = candidateBuckets;
    }
  }

  const teams = toTeams(bestBuckets);
  const { scoreGap, averageGap } = computeGaps(bestBuckets);
  return { teams, scoreGap, averageGap };
}
