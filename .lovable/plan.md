# Biblioteca Digital — Matola Gare Secundária

Plataforma escolar completa, inicia totalmente vazia, gerenciada por administrador (efronjoao9@gmail.com).

## Stack e infraestrutura
- Lovable Cloud (auth + DB + storage) — indispensável
- Google Maps Platform (rota, mapa, localização)
- TanStack Start + Material Design 3 (tokens em `src/styles.css`, oklch)
- PWA instalável + tema claro/escuro
- Créditos "efRon QR" no rodapé

## Base de dados (migrations Lovable Cloud)

Tabelas principais (todas iniciam vazias, RLS ativo, GRANTs corretos):
- `profiles` (id, email, nome, avatar, criado_em, ultimo_acesso)
- `user_roles` (user_id, role: admin | user) + função `has_role` security definer
- `library_items` — biblioteca (capa, título, descrição, link livro, PDF, link externo, download opcional)
- `knowledge_room` — Sala do Conhecimento (miniatura, título, descrição, link vídeo/YouTube, data)
- `gallery_items` — galeria (imagem, legenda, categoria livre)
- `news` — notícias/avisos (título, corpo, imagem, data)
- `school_info` — singleton JSON (história, missão, visão, valores, horário, contactos, email, endereço, redes sociais, vídeo institucional)
- `favorites` (user_id, item_type, item_id)
- `history` — histórico de conteúdos vistos
- `sessions_log` — quem entrou, quando, IP, user_agent (para ver online)
- `online_presence` — heartbeat (user_id, last_seen) para "online agora"

Trigger: ao criar usuário com email `efronjoao9@gmail.com` (verificado), atribuir role `admin` automaticamente.

## Rotas públicas
- `/` — Home Google-style com barra de pesquisa inteligente global, atalhos para todas as áreas
- `/biblioteca` — grid de cartões; vazio → mensagem elegante "Ainda não existem conteúdos publicados..."
- `/sala-do-conhecimento` — vídeos (thumbnail, assistir, compartilhar, favoritar)
- `/galeria` — lightbox tela cheia com animações
- `/noticias` — cards de comunicados
- `/sobre` — sobre a escola
- `/visitar` — história, missão, visão, galeria, horário, contactos
- `/localizacao` — mapa Google Maps + "Como Chegar" (geolocalização + rota, distância, tempo, passos, abrir no Maps) + mapa Moçambique destacando Matola Gare
- `/auth` — login/registo (email/senha + Google OAuth)

## Rotas autenticadas (`_authenticated`)
- `/perfil` — dados do aluno, favoritos, histórico
- `/favoritos`
- `/notificacoes`

## Painel admin (`_authenticated/_admin`)
Botão "Entrar no Painel" visível apenas para admins.
- Dashboard: usuários online agora, entradas hoje/semana, total conteúdos
- Gerir Biblioteca — CRUD com upload de capa
- Gerir Sala do Conhecimento — CRUD vídeos
- Gerir Galeria — upload múltiplo de imagens/vídeos
- Gerir Notícias — CRUD
- Editar Informações da Escola — email plataforma, contactos, redes sociais, história, missão, etc.
- Usuários — listar todos, ver quem está online, histórico de sessões (data/hora)
- Promover Administrador — input email → concede role admin
- Cada publicação com botões: Abrir, Download (opcional), Compartilhar, Favoritar

## Componentes e funcionalidades transversais
- Pesquisa global inteligente (fuzzy match em biblioteca + sala + notícias)
- Sistema de favoritos e histórico persistidos
- Notificações in-app
- Toggle tema claro/escuro (persistido)
- PWA: manifest.webmanifest, ícones, meta tags, instalável
- Presença online: heartbeat a cada 30s em rota autenticada
- Google Maps: browser key para mapa embutido + gateway para geocoding/directions
- CSS global inclui as regras que você enviou (ocultar overlays externos)
- Validação Zod em todos os formulários
- Design MD3 com tokens semânticos oklch; sem cores hardcoded

## Ordem de implementação
1. Ativar Lovable Cloud + Google Maps connector + LOVABLE_API_KEY
2. Design system MD3 em `src/styles.css` + shell/nav/tema
3. Migrations (tabelas, RLS, GRANTs, trigger admin, função has_role)
4. Auth (login/registo, Google, `/auth`, layout `_authenticated`)
5. Home + pesquisa global + rotas públicas com estados vazios
6. Servidor functions para CRUD (createServerFn com requireSupabaseAuth)
7. Painel admin completo (todas as seções acima)
8. Google Maps + rota inteligente
9. Presença online + histórico de sessões
10. PWA (manifest, ícones, meta), tema claro/escuro
11. Créditos "efRon QR", sitemap.xml, robots.txt
12. Verificação: build, smoke test com Playwright das rotas principais

Ao concluir, admin efronjoao9@gmail.com faz login → vê botão "Painel" → publica conteúdos → aparecem nas áreas correspondentes.