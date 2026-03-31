 "use client"
 
 /**
 * Wizard multietapas para criar um board + colunas iniciais.
 * Baseado no padrão shadcn + framer-motion; usa @/lib/utils para `cn`.
 */
import * as React from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { supabase } from "@/lib/supabase"
import { createBoard, createBoardColumn, getOrCreateBoardByTitle, updateBoard } from "@/lib/kanban"
import { Button } from "@/components/ui/button"
import { useDashboardLoading } from "@/components/ui/dashboard-shell"
import { HorizontalScroll } from "@/components/kanban/horizontal-scroll"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { ColorPicker } from "@/components/ui/color-picker"
import { cn } from "@/lib/utils"

const steps = [
  { id: "board", title: "Quadro" },
  { id: "columns", title: "Colunas" },
  { id: "review", title: "Revisão" },
] as const

type ColumnTemplate = "empty" | "simple" | "scrum" | "custom"

interface BoardWizardData {
  title: string
  description: string
  columnTemplate: ColumnTemplate
  customColumns: string
  backgroundColor: string
  logoUrl: string | null
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

function columnTitlesFromTemplate(template: ColumnTemplate, customText: string): string[] {
  switch (template) {
    case "empty":
      return []
    case "simple":
      return ["A fazer", "Fazendo", "Concluído"]
    case "scrum":
      return ["Backlog", "A fazer", "Em andamento", "Revisão", "Concluído"]
    case "custom":
      return customText
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
    default:
      return []
  }
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

const contentVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -50, transition: { duration: 0.2 } },
}

export function BoardCreateMultistepForm() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = React.useState(0)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [formData, setFormData] = React.useState<BoardWizardData>({
    title: "",
    description: "",
    columnTemplate: "simple",
    customColumns: "",
    backgroundColor: "#0f172a",
    logoUrl: null,
  })

  const { setLoading: setDashboardLoading, showAlert } = useDashboardLoading()

  const updateFormData = <K extends keyof BoardWizardData>(field: K, value: BoardWizardData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) setCurrentStep((p) => p + 1)
  }

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep((p) => p - 1)
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return formData.title.trim() !== ""
      case 1:
        if (formData.columnTemplate === "custom") {
          return columnTitlesFromTemplate("custom", formData.customColumns).length > 0
        }
        return true
      default:
        return true
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setDashboardLoading(true)
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error("Usuário não autenticado.")
      }

      const t = formData.title.trim()
      const titles = columnTitlesFromTemplate(formData.columnTemplate, formData.customColumns)

      let boardId: string | null = null
      try {
        const created = await createBoard({
          title: t,
          description: formData.description,
          createdBy: user.id,
          backgroundColor: formData.backgroundColor,
        })
        boardId = created.id
      } catch {
        const existing = await getOrCreateBoardByTitle({
          title: t,
          description: formData.description,
          createdBy: user.id,
        })
        boardId = existing.id
      }

      if (!boardId) throw new Error("Não foi possível criar o board.")

      // se o usuário já escolheu uma logo, salva logo_url
      if (formData.logoUrl) {
        await updateBoard({ id: boardId, logoUrl: formData.logoUrl })
      }

      for (let i = 0; i < titles.length; i++) {
        await createBoardColumn({
          boardId,
          title: titles[i],
          position: i + 1,
        })
      }

      const slug = slugify(t) || "board"
      const message =
        titles.length > 0
          ? `Quadro criado com ${titles.length} coluna(s).`
          : "Quadro criado. Adicione colunas no Kanban."

      showAlert({
        variant: "success",
        title: "Quadro criado com sucesso",
        description: message,
      })
      router.push(`/boards/${slug}?id=${encodeURIComponent(boardId)}`)
      router.refresh()

      // Mantém o loader do dashboard ativo até a próxima tela assumir o controle.
      return
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar o quadro.")
      setIsSubmitting(false)
      setDashboardLoading(false)
    }
  }

  const progressPct =
    steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 100

  const previewColumns = columnTitlesFromTemplate(
    formData.columnTemplate,
    formData.customColumns,
  )

  const previewColors = [
    "bg-sky-500",
    "bg-amber-500",
    "bg-violet-500",
    "bg-emerald-500",
    "bg-rose-500",
    "bg-slate-500",
  ] as const

  const effectiveLogoUrl = formData.logoUrl ?? "/Logo.png"
  const isDefaultLogo = !formData.logoUrl

  return (
    <div className="relative mx-auto flex w-full max-w-6xl gap-10 py-0">
      <div className="hidden flex-[0.9] flex-col space-y-6 md:flex">
        <motion.h1
          className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          Criar novo quadro
        </motion.h1>
        <motion.p
          className="max-w-md text-sm text-muted-foreground"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          Defina o nome, descrição e colunas iniciais do seu quadro. Você também pode enviar uma logo
          personalizada agora para deixá-lo com a cara do seu time.
        </motion.p>

        <motion.div
          className="mt-8 flex h-64 items-center justify-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
        >
          <div className="relative h-60 w-[22rem] max-w-sm">
            <div className="absolute -left-3 -top-2 h-44 w-80 overflow-hidden rounded-3xl border border-white/10 bg-black/70 shadow-[0_18px_36px_rgba(0,0,0,0.8)]">
              <img
                src="/exemplo2.png"
                alt="Exemplo de quadro vazio"
                className="h-full w-full object-cover object-[70%_center]"
              />
            </div>
            <div className="absolute right-0 -bottom-6 h-48 w-[21rem] overflow-hidden rounded-3xl border border-white/10 bg-black/80 shadow-[0_22px_50px_rgba(0,0,0,0.95)]">
              <img
                src="/exemplo1.png"
                alt="Exemplo de quadro com tarefas"
                className="h-full w-full object-cover object-[60%_center]"
              />
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex-[1.6] min-w-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
        <Card className="flex min-h-[520px] flex-col overflow-hidden rounded-3xl border shadow-md">
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={contentVariants}
              >
                {currentStep === 0 && (
                  <>
                    <CardHeader>
                      <CardTitle>Nome do quadro</CardTitle>
                      <CardDescription>
                        Como esse projeto vai aparecer no menu lateral e no topo do Kanban.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <motion.div variants={fadeInUp} className="space-y-2">
                        <Label htmlFor="board-title">Título</Label>
                        <Input
                          id="board-title"
                          placeholder="Ex: Sprint"
                          value={formData.title}
                          onChange={(e) => updateFormData("title", e.target.value)}
                          className="transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </motion.div>
                      <motion.div variants={fadeInUp} className="space-y-2">
                        <Label htmlFor="board-desc">Descrição (opcional)</Label>
                        <Textarea
                          id="board-desc"
                          placeholder="Objetivo do quadro, time ou marcos…"
                          value={formData.description}
                          onChange={(e) => updateFormData("description", e.target.value)}
                          className="min-h-[100px] transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </motion.div>

                      <motion.div variants={fadeInUp} className="space-y-2">
                        <Label>Logo do quadro</Label>
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-black/40 shadow-[0_0_18px_rgba(255,255,255,0.35)]">
                            <img
                              src={formData.logoUrl ?? "/Logo.png"}
                              alt="Preview da logo"
                              className={`h-8 w-8 object-contain ${
                                formData.logoUrl ? "" : "brightness-0 invert"
                              }`}
                            />
                          </div>
                          <label className="inline-flex cursor-pointer items-center rounded-md border border-white/15 bg-black/40 px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-black/60">
                            <span>Enviar logo</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return

                                try {
                                  const path = `wizard-temp/${Date.now()}-${file.name}`
                                  const { error: uploadError } = await supabase.storage
                                    .from("board-logos")
                                    .upload(path, file, { upsert: true })
                                  if (uploadError) throw uploadError

                                  const { data } = supabase.storage
                                    .from("board-logos")
                                    .getPublicUrl(path)
                                  if (data?.publicUrl) {
                                    updateFormData("logoUrl", data.publicUrl)
                                  }
                                } catch {
                                  // feedback de erro pode ser adicionado com toast se necessário
                                } finally {
                                  e.target.value = ""
                                }
                              }}
                            />
                          </label>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Se nenhuma logo for enviada, usamos a padrão do sistema.
                        </p>
                      </motion.div>
                    </CardContent>
                  </>
                )}

                {currentStep === 1 && (
                  <>
                    <CardHeader>
                      <CardTitle>Colunas iniciais</CardTitle>
                      <CardDescription>
                        Escolha um modelo ou defina nomes personalizados (um por linha).
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="mt-4 space-y-4">
                      <motion.div variants={fadeInUp} className="space-y-2">
                        <Label>Modelo</Label>
                        <RadioGroup
                          value={formData.columnTemplate}
                          onValueChange={(v) => updateFormData("columnTemplate", v as ColumnTemplate)}
                          className="space-y-2"
                        >
                          {[
                            { value: "empty" as const, label: "Vazio — crio as colunas depois no Kanban" },
                            { value: "simple" as const, label: "Simples: A fazer · Fazendo · Concluído" },
                            {
                              value: "scrum" as const,
                              label: "Scrum: Backlog · A fazer · Em andamento · Revisão · Concluído",
                            },
                            { value: "custom" as const, label: "Personalizado (uma coluna por linha)" },
                          ].map((opt, index) => (
                            <motion.div
                              key={opt.value}
                              className="flex cursor-pointer items-center space-x-2 rounded-md border p-3 transition-colors hover:bg-accent"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{
                                opacity: 1,
                                x: 0,
                                transition: { delay: 0.08 * index, duration: 0.3 },
                              }}
                            >
                              <RadioGroupItem value={opt.value} id={`col-${opt.value}`} />
                              <Label htmlFor={`col-${opt.value}`} className="w-full cursor-pointer">
                                {opt.label}
                              </Label>
                            </motion.div>
                          ))}
                        </RadioGroup>
                      </motion.div>
                      {formData.columnTemplate === "custom" && (
                        <motion.div variants={fadeInUp} className="space-y-2">
                          <Label htmlFor="custom-cols">Nomes das colunas</Label>
                          <Textarea
                            id="custom-cols"
                            placeholder={"Ideias\nA fazer\nConcluído"}
                            value={formData.customColumns}
                            onChange={(e) => updateFormData("customColumns", e.target.value)}
                            className="min-h-[120px] font-mono text-sm transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        </motion.div>
                      )}
                    </CardContent>
                  </>
                )}

                {currentStep === 2 && (
                  <>
                    <CardHeader>
                      <CardTitle>Revisar e criar</CardTitle>
                      <CardDescription>Veja uma prévia de como o quadro será criado.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <motion.div
                        variants={fadeInUp}
                        className="rounded-2xl border border-white/10 bg-black/40 p-4"
                      >
                        {previewColumns.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Este quadro será criado <span className="font-semibold">sem colunas</span>. Você
                            poderá adicioná-las depois diretamente no Kanban.
                          </p>
                        ) : (
                          <>
                            <div className="mb-2 text-center">
                              <p className="text-sm font-semibold text-foreground">
                                {formData.title.trim() || "Quadro sem título"}
                              </p>
                              {formData.description.trim() && (
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {formData.description.trim()}
                                </p>
                              )}
                            </div>
                            <HorizontalScroll className="mt-1 h-56 rounded-2xl border border-white/15 bg-zinc-950/70 px-3 py-3">
                              <div className="flex h-full items-stretch gap-3">
                                {previewColumns.map((col, index) => (
                                  <div
                                    key={col}
                                    className="flex w-48 flex-shrink-0 flex-col rounded-xl border border-white/15 bg-zinc-900/80 p-3"
                                  >
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={cn(
                                            "h-2.5 w-2.5 rounded-full",
                                            previewColors[index % previewColors.length],
                                          )}
                                        />
                                        <p className="truncate text-xs font-semibold text-foreground">
                                          {col}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="h-9 rounded-md bg-zinc-800/90" />
                                      <div className="h-9 rounded-md bg-zinc-800/70" />
                                      <div className="h-9 rounded-md bg-zinc-800/60" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </HorizontalScroll>
                          </>
                        )}
                      </motion.div>
                    </CardContent>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <CardFooter className="mt-auto flex justify-between pb-4 pt-6">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0 || isSubmitting}
                className="flex items-center gap-1 rounded-2xl transition-all duration-300"
              >
                <ChevronLeft className="h-4 w-4" /> Voltar
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                type="button"
                onClick={currentStep === steps.length - 1 ? handleSubmit : nextStep}
                disabled={!isStepValid() || isSubmitting}
                className="flex items-center gap-1 rounded-2xl transition-all duration-300"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Criando…
                  </>
                ) : (
                  <>
                    {currentStep === steps.length - 1 ? "Criar quadro" : "Próximo"}
                    {currentStep === steps.length - 1 ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </>
                )}
              </Button>
            </motion.div>
          </CardFooter>
        </Card>
        </motion.div>
      </div>
    </div>
  )
}

export default BoardCreateMultistepForm
