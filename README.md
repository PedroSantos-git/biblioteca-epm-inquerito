# Biblioteca Escolar EPM — Inquérito

Inquérito de satisfação da Biblioteca Escolar da
[Escola Profissional do Montijo](https://epmontijo.edu.pt), baseado no
[Google Forms original](https://docs.google.com/forms/d/1BG7qmKIpxKoxeYnZAw5Kzr4RBTaxSAEWOehCar7kEd0/edit).

Site estático (HTML/CSS/JS puro, sem build), com as respostas guardadas no
[Supabase](https://supabase.com) e uma área reservada de estatísticas protegida
por login (Google / Microsoft).

## Estrutura

```
index.html            inquérito público (submete respostas para o Supabase)
estatisticas.html      área reservada — login + dashboard de estatísticas
script.js               lógica do inquérito (envio de respostas)
estatisticas.js         lógica de autenticação, autorização e gráficos
supabase-config.js      URL e chave pública (anon) do projeto Supabase
styles.css / estatisticas.css   estilos
assets/img/              logótipos
```

## Como funciona

- **Inquérito (`index.html`)** — aberto a qualquer pessoa, sem login. Cada
  submissão é guardada na tabela `survey_responses`.
- **Estatísticas (`estatisticas.html`)** — pede login via Google ou Microsoft
  (Supabase Auth). Só quem tiver o email na tabela `authorized_emails` (ou for
  o administrador permanente) consegue ver os gráficos.
- **Gestão de acessos** — `pedro.mf.santos@outlook.pt` é o único administrador:
  pode adicionar/remover emails autorizados a ver estatísticas. O seu próprio
  acesso nunca pode ser removido (garantido por uma regra na base de dados, não
  só na interface).
- Toda a autorização é aplicada por **Row Level Security** no Postgres do
  Supabase — a `anon key` usada no browser é pública por definição; quem decide
  o que cada pessoa vê é a base de dados, não o JavaScript.

## Correr localmente

Não há build. Basta servir a pasta (é preciso um servidor por causa dos módulos ES):

```bash
npx serve .
```

> Abrir `index.html` diretamente com `file://` não funciona para o envio de
> respostas nem para o login, porque usa `import`/ES modules.

## Deploy

Publicado no [Vercel](https://vercel.com) com deploy automático a partir do
GitHub (branch `main`) — sem configuração de build necessária (site estático).

## Base de dados (Supabase)

Projeto: **Biblioteca Escolar** (`emwnhcnvpzeeaielkybw`, região `eu-central-1`).

Tabelas:
- `survey_responses` — uma linha por resposta ao inquérito.
- `authorized_emails` — emails com permissão para ver as estatísticas.

Login social configurado no Supabase Auth: **Google** e **Microsoft (Azure)**.
