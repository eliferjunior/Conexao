# Konektra

**Marketplace de profissionais liberais — conexões que pulsam.**

Konektra conecta clientes e profissionais (dentistas, pet sitters, eletricistas, personal trainers, professores, cuidadores etc.) com avaliações de 1 a 5 estrelas, preço por hora, localização, verificação de documentos e **modo urgente em tempo real** (estilo Uber).

A monetização é 100% via **assinaturas dos profissionais** (Free / Plus / Infinity) — clientes nunca pagam para usar.

## Stack

Este repositório contém uma versão **vanilla HTML/CSS/JS** (sem dependências de build) que funciona 100% no navegador com `localStorage` para persistência. É um MVP demo, pensado para:

- Rodar em qualquer servidor estático (GitHub Pages, Netlify, Cloudflare Pages, Nginx).
- Ser facilmente portado para um backend real (Node/Express + Postgres + Prisma, ou Next.js + Supabase).
- Mostrar a experiência completa: cadastro, login, perfis, busca, chamadas urgentes, avaliações, assinatura, LGPD.

## Como rodar (1 comando)

```bash
# Linux / macOS
./start.sh

# Windows
start.bat

# ou, se já tiver Node
npm start
```

O atalho abre `http://localhost:8080/` automaticamente no seu navegador e usa Node, Python ou PHP — o que estiver instalado.

> ⚠️ **Não abra `index.html` dando duplo clique** (`file://`): o app usa ES modules, Web Crypto e Geolocation, que só funcionam sobre HTTP. Se você tentar, verá um aviso rosa grande com as instruções.

## Estrutura

```
index.html           landing
register.html        cadastro (cliente / profissional / ambos)
login.html           acesso
dashboard.html       painel do usuário
search.html          busca de profissionais
urgent.html          chamada urgente (SOS, estilo Uber)
profile.html         perfil público + contratação + avaliação
subscription.html    planos Free / Plus / Infinity
tests.html           suite de testes automatizados

css/styles.css       tema futurista (neon cyan/magenta em fundo espaço profundo)
js/crypto.js         PBKDF2, HMAC, SHA-256, CSPRNG
js/db.js             "banco" em localStorage
js/auth.js           cadastro, login, sessão, validação de CPF/senha
js/geo.js            geolocalização, matching do modo urgente
js/ui.js             helpers de UI
js/app.js            navegação global

docs/TERMS.html      Termos de Uso
docs/PRIVACY.html    Política de Privacidade (LGPD)
docs/SECURITY.html   Práticas de segurança

assets/logo.svg      logo Konektra
assets/favicon.svg   favicon
```

## Segurança

- Senhas: **PBKDF2-SHA256, 120.000 iterações**, salt único de 128 bits, comparação em tempo constante.
- Sessão: token assinado com **HMAC-SHA256**, expiração de 7 dias.
- CPF validado pelos dígitos verificadores.
- Consentimento explícito em Termos e LGPD no cadastro.
- Exportação completa e exclusão de conta (LGPD Art. 18).
- Documentos: apenas o hash SHA-256 é salvo localmente nesta demo (arquivo nunca trafega).

Mais detalhes em [`docs/SECURITY.html`](docs/SECURITY.html).

## Modo urgente (SOS)

Funciona como o Uber:

1. Cliente aciona o SOS, escolhe categoria, raio (km) e descrição.
2. App obtém a localização e grava uma `urgentCall` aberta.
3. Todos os profissionais **disponíveis**, com a **categoria** cadastrada e dentro do **raio** (interseção com o raio deles próprios) veem a chamada em tempo real.
4. O primeiro a aceitar fecha o match; a chamada muda para `matched` e uma reserva é criada.
5. Score de ordenação: distância (50%) + avaliação (35%) + bônus de plano (até 25%).

## Planos

| Plano     | Preço        | Chamadas urgentes/mês | Boost ranking | Selo       |
|-----------|--------------|-----------------------|---------------|------------|
| Free      | R$ 0         | 5                     | 0%            | —          |
| Plus      | R$ 39,90     | 50                    | +12%          | ✦ Plus     |
| Infinity  | R$ 89,90     | ∞                     | +25%          | ∞ Infinity |

## Testes

A suíte em [`tests.html`](tests.html) cobre:

- Hash/verificação de senha (PBKDF2) e comparação em tempo constante.
- Validação de CPF e e-mail.
- Fluxo completo de registro (cliente e profissional).
- Login bem-sucedido e falho.
- Persistência via `localStorage`.
- Matching do modo urgente (Haversine + filtros).
- Cálculo de média de avaliações.
- Fluxo de booking → done → rating.

Abra `tests.html` no navegador após subir o app. Um resumo verde/vermelho é exibido com cada teste.

## Roadmap

- Backend Node + Postgres + Prisma (portar `db.js`).
- WebSocket para chamadas urgentes (hoje usa polling local a cada 2,5s).
- Pagamento real (Stripe/PagSeguro/PIX).
- Chat in-app entre cliente e profissional.
- Notificações push (PWA + Service Worker).
- KYC com provedor externo.
- Internacionalização.

## Licença

MIT © 2026 Konektra.
