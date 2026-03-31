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
import { createBoard, createBoardColumn, getOrCreateBoardByTitle } from "@/lib/kanban"
import { Button } from "@/components/ui/button"
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
  })

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

      for (let i = 0; i < titles.length; i++) {
        await createBoardColumn({
          boardId,
          title: titles[i],
          position: i + 1,
        })
      }

      const slug = slugify(t) || "board"
      toast.success(
        titles.length > 0
          ? `Quadro criado com ${titles.length} coluna(s).`
          : "Quadro criado. Adicione colunas no Kanban.",
      )
      router.push(`/boards/${slug}?id=${encodeURIComponent(boardId)}`)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar o quadro.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const progressPct =
    steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 100

  const previewColumns = columnTitlesFromTemplate(
    formData.columnTemplate,
    formData.customColumns,
  )

  return (
    <div className="mx-auto w-full max-w-lg py-6">
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-2 flex justify-between">
          {steps.map((step, index) => (
            <motion.div key={step.id} className="flex flex-col items-center" whileHover={{ scale: 1.1 }}>
              <motion.div
                className={cn(
                  "h-4 w-4 cursor-pointer rounded-full transition-colors duration-300",
                  index < currentStep
                    ? "bg-primary"
                    : index === currentStep
                      ? "bg-primary ring-4 ring-primary/20"
                      : "bg-muted",
                )}
                onClick={() => {
                  if (index <= currentStep) setCurrentStep(index)
                }}
                whileTap={{ scale: 0.95 }}
              />
              <motion.span
                className={cn(
                  "mt-1.5 hidden text-xs sm:block",
                  index === currentStep ? "font-medium text-primary" : "text-muted-foreground",
                )}
              >
                {step.title}
              </motion.span>
            </motion.div>
          ))}
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="overflow-hidden rounded-3xl border shadow-md">
          <div>
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
                    <CardContent className="space-y-4">
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
                      <CardDescription>Confira antes de abrir o Kanban.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <motion.div variants={fadeInUp} className="rounded-lg border bg-muted/30 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Título
                        </p>
                        <p className="mt-1 font-medium text-foreground">{formData.title.trim() || "—"}</p>
                        {formData.description.trim() && (
                          <>
                            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Descrição
                            </p>
                            <p className="mt-1 text-muted-foreground">{formData.description.trim()}</p>
                          </>
                        )}
                      </motion.div>
                      <motion.div variants={fadeInUp} className="rounded-lg border bg-muted/30 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Colunas ({previewColumns.length})
                        </p>
                        {previewColumns.length === 0 ? (
                          <p className="mt-2 text-muted-foreground">Nenhuma — você adiciona no board.</p>
                        ) : (
                          <ol className="mt-2 list-decimal space-y-1 pl-5 text-foreground">
                            {previewColumns.map((c) => (
                              <li key={c}>{c}</li>
                            ))}
                          </ol>
                        )}
                      </motion.div>
                    </CardContent>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <CardFooter className="flex justify-between pb-4 pt-6">
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
          </div>
        </Card>
      </motion.div>

      <motion.p
        className="mt-4 text-center text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        Etapa {currentStep + 1} de {steps.length}: {steps[currentStep].title}
      </motion.p>
    </div>
  )
}

export default BoardCreateMultistepForm
