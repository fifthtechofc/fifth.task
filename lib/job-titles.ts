/** Cargos exibidos no cadastro (valor enviado como `job_title` no signup). */
export const PREDEFINED_JOB_TITLES = [
  'Product Lead',
  'Frontend Engineer',
  'Backend Engineer',
  'Product Designer',
  'People Ops',
  'Data Analyst',
  'Gerente de Projetos',
  'Analista de Negócios',
  'QA / Testes',
  'DevOps',
  'CTO',
  'COO',
  'Marketing',
  'Outro (definir depois no perfil)',
] as const

export type PredefinedJobTitle = (typeof PREDEFINED_JOB_TITLES)[number]

export const JOB_TITLE_DESCRIPTIONS: Record<PredefinedJobTitle, string> = {
  'Product Lead':
    'Conduz discovery e alinhamento do produto, conectando estratégia, time e metas do workspace.',
  'Frontend Engineer':
    'Cuida da experiência no app, performance e consistência visual das telas e componentes.',
  'Backend Engineer':
    'Mantém APIs e integrações estáveis, com foco em arquitetura, segurança e confiabilidade.',
  'Product Designer':
    'Desenha fluxos e interfaces, garantindo clareza, acessibilidade e consistência de UX.',
  'People Ops':
    'Acompanha rituais do time, onboarding e saúde operacional para sustentar o ritmo de entrega.',
  'Data Analyst':
    'Transforma dados em insights, apoiando indicadores, previsões e decisões do workspace.',
  'Gerente de Projetos':
    'Organiza prazos, prioridades e riscos, facilitando comunicação e execução entre áreas.',
  'Analista de Negócios':
    'Traduz necessidades do negócio em requisitos claros, conectando stakeholders e soluções.',
  'QA / Testes':
    'Garante qualidade com testes e validações, prevenindo regressões e melhorando a confiança.',
  DevOps:
    'Automatiza deploy e infraestrutura, melhorando observabilidade, segurança e performance.',
  CTO:
    'Lidera a visão técnica, arquitetura e qualidade da engenharia, alinhando tecnologia às metas do produto.',
  COO:
    'Organiza operações e processos internos para escalar entregas com previsibilidade e eficiência.',
  Marketing:
    'Conduz posicionamento, aquisição de clientes e estratégias para fortalecimento da marca e comunicação do produto no mercado.',
  'Outro (definir depois no perfil)':
    'Perfil em configuração. Defina seu cargo no perfil para exibir uma descrição mais precisa.',
}

/**
 * Cargos comuns fora do cadastro (ex.: perfis antigos ou títulos livres no banco).
 * Chaves em minúsculas para comparação case-insensitive.
 */
export const EXTRA_ROLE_DESCRIPTIONS: Record<string, string> = {
  cto:
    'Lidera a visão técnica, arquitetura e qualidade da engenharia, alinhando tecnologia às metas do produto.',
  ceo:
    'Define estratégia e prioridades do negócio, garantindo direção clara e sustentabilidade do workspace.',
  coo:
    'Organiza operações e processos internos para escalar entregas com previsibilidade e eficiência.',
  cfo:
    'Cuida da saúde financeira, planejamento e governança dos recursos do negócio.',
  cpo:
    'Articula visão de produto, roadmap e valor entregue ao usuário em conjunto com as áreas.',
  cmo:
    'Conduz posicionamento, aquisição e narrativa da marca junto ao mercado e aos clientes.',
  marketing:
    'Conduz posicionamento, aquisição de clientes e estratégias para fortalecimento da marca e comunicação do produto no mercado.',
  'engenheiro de software':
    'Desenvolve e evolui o software do workspace, da implementação à manutenção e melhoria contínua.',
  desenvolvedor:
    'Implementa funcionalidades e correções, colaborando com o time para entregar valor de forma ágil.',
  'tech lead':
    'Referência técnica do time: define padrões, revisa soluções e apoia decisões de arquitetura.',
  'scrum master':
    'Facilita rituais ágeis e remove impedimentos para manter o fluxo de entregas saudável.',
  'ux designer':
    'Aprimora usabilidade e experiência, garantindo fluxos claros e acessíveis.',
  'ui designer':
    'Cuida da identidade visual e consistência estética das interfaces do produto.',
}

const FALLBACK_DESCRIPTION =
  'Contribui com execução e colaboração no time, alinhando entregas aos objetivos do workspace.'

export function getJobTitleDescription(jobTitle: string | undefined | null): string | null {
  if (!jobTitle?.trim()) return null

  const raw = jobTitle.trim()
  const lower = raw.toLowerCase()

  for (const [title, desc] of Object.entries(JOB_TITLE_DESCRIPTIONS)) {
    if (title.toLowerCase() === lower) return desc
  }

  const extra = EXTRA_ROLE_DESCRIPTIONS[lower]
  if (extra) return extra

  return `Atua como ${raw} no time. ${FALLBACK_DESCRIPTION}`
}
