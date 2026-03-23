import { useMemo, useState } from "react";
import type { AppConfig, BalanceResult, Player, StarLevel } from "./types/domain";
import { generateBalancedTeams } from "./utils/balancer";
import { parsePlayersFromTemplate } from "./utils/parser";
import { normalizePlayerName, sanitizeStars, validateConfig, validatePlayersCount } from "./utils/validators";

const DEFAULT_CONFIG: AppConfig = {
  numberOfTeams: 2,
  playersPerTeam: 5,
};

function starsToText(stars: number): string {
  return "⭐".repeat(Math.max(1, Math.round(stars)));
}

function App() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [players, setPlayers] = useState<Player[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [starsInput, setStarsInput] = useState<StarLevel>(3);
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState<string>("");
  const [result, setResult] = useState<BalanceResult | null>(null);

  const requiredPlayers = useMemo(
    () => config.numberOfTeams * config.playersPerTeam,
    [config.numberOfTeams, config.playersPerTeam],
  );

  function addManualPlayer() {
    const name = normalizePlayerName(nameInput);
    if (!name) {
      setMessage("Informe o nome do jogador.");
      return;
    }

    const nextPlayer: Player = {
      id: crypto.randomUUID(),
      name,
      stars: sanitizeStars(starsInput),
    };

    setPlayers((prev) => [...prev, nextPlayer]);
    setNameInput("");
    setStarsInput(3);
    setResult(null);
    setMessage("Jogador adicionado.");
  }

  function importFromText() {
    try {
      const parsed = parsePlayersFromTemplate(importText);
      if (!parsed.players.length) {
        setMessage("Nenhum jogador válido encontrado na importação.");
        return;
      }
      setPlayers(parsed.players);
      setResult(null);
      setMessage(
        `Importados ${parsed.players.length} jogadores.` +
          (parsed.ignoredLines.length ? ` Linhas ignoradas: ${parsed.ignoredLines.length}.` : ""),
      );
    } catch {
      setMessage("Falha ao importar a lista. Verifique o formato e tente novamente.");
    }
  }

  function updatePlayer(playerId: string, patch: Partial<Pick<Player, "name" | "stars">>) {
    setPlayers((prev) =>
      prev.map((player) => {
        if (player.id !== playerId) {
          return player;
        }
        return {
          ...player,
          name: patch.name === undefined ? player.name : normalizePlayerName(patch.name),
          stars: patch.stars === undefined ? player.stars : sanitizeStars(patch.stars),
        };
      }),
    );
    setResult(null);
  }

  function removePlayer(playerId: string) {
    setPlayers((prev) => prev.filter((player) => player.id !== playerId));
    setResult(null);
  }

  function resetSession() {
    setPlayers([]);
    setImportText("");
    setMessage("Sessão resetada.");
    setResult(null);
  }

  function createTeams() {
    const configError = validateConfig(config);
    if (configError) {
      setMessage(configError);
      return;
    }

    const playersError = validatePlayersCount(config, players);
    if (playersError) {
      setMessage(playersError);
      return;
    }

    const balanced = generateBalancedTeams(players, config.numberOfTeams, config.playersPerTeam);
    setResult(balanced);
    setMessage("Times gerados com sucesso.");
  }

  return (
    <main className="app">
      <header className="app-header">
        <img className="brand-logo" src="/logo-cn.png" alt="Logo Racha CN" />
        <h1>Racha Comunidade das Nações</h1>
        <p>Monte times equilibrados por estrelas para sua pelada.</p>
      </header>

      <section className="card">
        <h2>Configuração do Racha</h2>
        <div className="row">
          <label>
            <span>Quantidade de times</span>
            <input
              type="number"
              min={2}
              value={config.numberOfTeams}
              onChange={(event) =>
                setConfig((prev) => ({
                  ...prev,
                  numberOfTeams: Number(event.target.value || 0),
                }))
              }
            />
          </label>
          <label>
            <span>Jogadores por time</span>
            <input
              type="number"
              min={1}
              value={config.playersPerTeam}
              onChange={(event) =>
                setConfig((prev) => ({
                  ...prev,
                  playersPerTeam: Number(event.target.value || 0),
                }))
              }
            />
          </label>
        </div>
        <p className="hint">Necessário: {requiredPlayers} jogadores.</p>
      </section>

      <section className="card">
        <h2>Cadastro Manual</h2>
        <div className="row">
          <label className="grow">
            <span>Nome</span>
            <input value={nameInput} onChange={(event) => setNameInput(event.target.value)} placeholder="Ex: Pedro" />
          </label>
          <label>
            <span>Estrelas</span>
            <select
              value={starsInput}
              onChange={(event) => setStarsInput(Number(event.target.value) as StarLevel)}
            >
              <option value={1}>1 ⭐ – Iniciante</option>
              <option value={2}>2 ⭐⭐ – Regular</option>
              <option value={3}>3 ⭐⭐⭐ – Intermediário</option>
              <option value={4}>4 ⭐⭐⭐⭐ – Avançado</option>
              <option value={5}>5 ⭐⭐⭐⭐⭐ – Craque</option>
            </select>
          </label>
          <button type="button" onClick={addManualPlayer}>
            Adicionar
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Importar Lista (Template)</h2>
        <textarea
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          rows={10}
          placeholder="Cole aqui a lista no padrão do Template.md"
        />
        <div className="actions">
          <button type="button" onClick={importFromText}>
            Importar jogadores
          </button>
        </div>
      </section>

      <section className="card">
        <h2>
          Jogadores Cadastrados ({players.length}/{requiredPlayers})
        </h2>
        {players.length === 0 ? (
          <p className="hint">Nenhum jogador cadastrado.</p>
        ) : (
          <div className="player-list">
            {players.map((player) => (
              <div key={player.id} className="player-row">
                <input value={player.name} onChange={(event) => updatePlayer(player.id, { name: event.target.value })} />
                <select
                  value={player.stars}
                  onChange={(event) => updatePlayer(player.id, { stars: Number(event.target.value) as StarLevel })}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                </select>
                <span className="stars">{starsToText(player.stars)}</span>
                <button type="button" className="danger" onClick={() => removePlayer(player.id)}>
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="actions">
          <button type="button" onClick={createTeams}>
            Gerar Times
          </button>
          <button type="button" className="muted" onClick={resetSession}>
            Resetar sessão
          </button>
        </div>
      </section>

      {message ? <p className="message">{message}</p> : null}

      {result ? (
        <section className="card">
          <h2>Resultado</h2>
          <p className="hint">
            Diferença de soma: {result.scoreGap} | Diferença de média: {result.averageGap.toFixed(2)}
          </p>
          <div className="teams-grid">
            {result.teams.map((team) => (
              <article key={team.id} className="team-card">
                <h3>{team.name}</h3>
                <p>
                  Total: <strong>{team.totalStars}</strong> | Média: <strong>{team.averageStars.toFixed(2)}</strong>
                </p>
                <ul>
                  {team.players.map((player) => (
                    <li key={player.id}>
                      {player.name} - {starsToText(player.stars)}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

export default App;
