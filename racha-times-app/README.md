# Racha Justo

App web para formar times de futebol equilibrados por estrelas (1 a 5), com:

- cadastro manual de jogadores;
- importação por texto no formato do `Template/Template.md`;
- edição de nome/estrelas após cadastro;
- geração automática de times balanceados por soma e média de estrelas;
- validação de quantidade exata de jogadores (`times x jogadores por time`).

## Stack

- Vite
- React
- TypeScript

## Requisitos

- Node.js `>= 22.12` (ou `>= 20.19`)

## Rodando localmente

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build
npm run preview
```

## Deploy na Vercel

1. Suba este projeto para um repositório Git.
2. No painel da Vercel, clique em **Add New Project**.
3. Importe o repositório do app.
4. Framework preset: **Vite**.
5. Build command: `npm run build`.
6. Output directory: `dist`.
7. Deploy.

## Como funciona o balanceamento

1. Ordena os jogadores por estrela (com embaralhamento para reduzir viés).
2. Distribui de forma gulosa para o time com menor soma de estrelas e vaga disponível.
3. Executa melhoria local com trocas 1x1 entre times enquanto reduzir o desequilíbrio.
