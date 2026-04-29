# FifthTask

> Desenvolvido pela **FIFTHTECH** com a identidade visual oficial da empresa.

## 🚀 Visão geral

O **FifthTask** é uma aplicação web moderna criada com **Next.js**, **React 19** e **Tailwind CSS**. O objetivo é oferecer um fluxo de trabalho colaborativo e organizado para equipes que precisam gerenciar tarefas, quadros kanban, calendário, dashboards e notificações em um único lugar.

Este sistema foi desenvolvido para seguir a identidade visual da **FIFTHTECH**, com uma interface consistente, moderna e alinhada à marca.

## ✨ Recursos principais

- 🧠 Autenticação com suporte a e-mail e controle de sessão
- 📋 Painel de controle com workspace, projetos e equipes
- 🗂️ Sistema de kanban com quadros, colunas e tarefas
- 🗓️ Calendário para eventos e compromissos
- 🔔 Notificações in-app e gerenciamento de notificações
- 👤 Perfil e configurações de usuário
- 📦 Integração com Supabase para backend e dados em tempo real

## 🧩 Tecnologias usadas

- **Next.js 16**
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Supabase**
- **Radix UI**
- **Framer Motion**
- **Nodemailer**

## 📁 Estrutura do projeto

- `app/` - rotas e páginas principais do Next.js
- `components/` - componentes reutilizáveis da interface
- `lib/` - lógica de integração, hooks e utilitários
- `styles/` - estilos globais
- `supabase/` - scripts SQL e regras de segurança
- `scripts/` - utilitários de build, como geração de favicon

## ▶️ Como rodar localmente

1. Instale as dependências:

```bash
pnpm install
```

2. Inicie o ambiente de desenvolvimento:

```bash
pnpm dev
```

3. Abra no navegador:

```bash
http://localhost:3000
```

## 🛠️ Scripts úteis

- `pnpm dev` - inicia o servidor de desenvolvimento
- `pnpm build` - gera a build de produção
- `pnpm start` - executa a aplicação em modo de produção
- `pnpm lint` - roda o Biome
- `pnpm lint:fix` - aplica correções automáticas do Biome
- `pnpm commitlint --edit <commit-msg-file>` - valida mensagens de commit no padrão Conventional Commits
- `pnpm gen:favicon` - gera favicon a partir de imagens

## 💡 Dicas

- Configure o Supabase antes de rodar a aplicação para garantir autenticação e banco de dados funcionando
- Use a pasta `supabase/` para ajustar regras de segurança e seeds
- Explore `components/ui/` para customizar a interface

## ❤️ Sobre

Este projeto é ideal para criar uma dashboard de produtividade com funcionalidades colaborativas e layout responsivo. Seu design modular permite evoluir facilmente com novos recursos e integrações.
