import { useMemo, useState } from "react";
import type { ReactNode } from "react";
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
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [errorPopup, setErrorPopup] = useState<string | null>(null);
  const [result, setResult] = useState<BalanceResult | null>(null);
  const [isPlayersListOpen, setIsPlayersListOpen] = useState(false);

  const requiredPlayers = useMemo(
    () => config.numberOfTeams * config.playersPerTeam,
    [config.numberOfTeams, config.playersPerTeam],
  );
  const hasPlayers = players.length > 0;

  function showErrorPopup(errorMessage: string) {
    setMessageType("error");
    setMessage("");
    setErrorPopup(errorMessage);
  }

  function addManualPlayer() {
    const name = normalizePlayerName(nameInput);
    if (!name) {
      showErrorPopup("Informe o nome do jogador.");
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
    setMessageType("success");
    setErrorPopup(null);
    setMessage("Jogador adicionado.");
  }

  function importFromText() {
    try {
      const parsed = parsePlayersFromTemplate(importText);
      if (!parsed.players.length) {
        showErrorPopup("Nenhum jogador válido encontrado na importação.");
        return;
      }
      setPlayers(parsed.players);
      setResult(null);
      setMessageType("success");
      setErrorPopup(null);
      setMessage(
        `Importados ${parsed.players.length} jogadores.` +
          (parsed.ignoredLines.length ? ` Linhas ignoradas: ${parsed.ignoredLines.length}.` : ""),
      );
    } catch {
      showErrorPopup("Falha ao importar a lista. Verifique o formato e tente novamente.");
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
    setMessageType("success");
    setErrorPopup(null);
    setMessage("Sessão resetada.");
    setResult(null);
  }

  function createTeams() {
    const configError = validateConfig(config);
    if (configError) {
      showErrorPopup(configError);
      return;
    }

    const playersError = validatePlayersCount(config, players);
    if (playersError) {
      showErrorPopup(playersError);
      return;
    }

    const balanced = generateBalancedTeams(players, config.numberOfTeams, config.playersPerTeam);
    setResult(balanced);
    setMessageType("success");
    setErrorPopup(null);
    setMessage("Times gerados com sucesso.");
  }

  function buildTeamsShareText(teams: BalanceResult["teams"]): string {
    const header = "⚽ Racha CN - Times sorteados";
    const teamsLines = teams.map((team) => {
      const playersList = team.players.map((player) => `- ${player.name}`).join("\n");
      return `\n${team.name}\n${playersList}`;
    });
    return `${header}\n${teamsLines.join("\n")}`;
  }

  function shareOnWhatsApp() {
    if (!result) {
      return;
    }

    const messageText = buildTeamsShareText(result.teams);
    const encodedText = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  let feedbackNode: ReactNode = null;
  if (message) {
    if (messageType === "success") {
      feedbackNode = (
        <output className="message-banner message-banner-success" aria-live="polite">
          <span className="message-icon">✅</span>
          <p className="message">{message}</p>
        </output>
      );
    }
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
        <div className="players-header">
          <h2>
            Jogadores Cadastrados ({players.length}/{requiredPlayers})
          </h2>
          {hasPlayers ? (
            <button
              type="button"
              className="toggle-list"
              onClick={() => setIsPlayersListOpen((prev) => !prev)}
              aria-expanded={isPlayersListOpen}
            >
              {isPlayersListOpen ? "Ocultar lista" : "Ver jogadores"}
            </button>
          ) : null}
        </div>
        {!hasPlayers && <p className="hint">Nenhum jogador cadastrado.</p>}
        {hasPlayers && !isPlayersListOpen && (
          <p className="hint">Lista recolhida para facilitar visualização no celular.</p>
        )}
        {hasPlayers && isPlayersListOpen && (
          <div className="player-list">
            {players.map((player) => (
              <div key={player.id} className="player-row">
                <input
                  value={player.name}
                  onChange={(event) => updatePlayer(player.id, { name: event.target.value })}
                  aria-label={`Nome do jogador ${player.name}`}
                />
                <select
                  value={player.stars}
                  onChange={(event) => updatePlayer(player.id, { stars: Number(event.target.value) as StarLevel })}
                  aria-label={`Estrelas do jogador ${player.name}`}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                </select>
                <span className="stars">{starsToText(player.stars)}</span>
                <button
                  type="button"
                  className="icon-danger"
                  onClick={() => removePlayer(player.id)}
                  aria-label={`Remover jogador ${player.name}`}
                  title={`Remover ${player.name}`}
                >
                  🗑
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

      {feedbackNode}

      {errorPopup ? (
        <div className="popup-overlay">
          <dialog className="popup-card" open aria-labelledby="error-popup-title">
            <h3 id="error-popup-title">Atenção</h3>
            <p>{errorPopup}</p>
            <div className="popup-actions">
              <button type="button" className="danger" onClick={() => setErrorPopup(null)}>
                Fechar
              </button>
            </div>
          </dialog>
        </div>
      ) : null}

      {result ? (
        <section className="card">
          <h2>Resultado</h2>
          <div className="actions">
            <button type="button" className="whatsapp-button" onClick={shareOnWhatsApp}>
              Compartilhar no WhatsApp
            </button>
          </div>
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
