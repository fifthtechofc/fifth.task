import CourseDesignCard, { CardData } from "@/components/ui/course-design-cards"

const projectCards: CardData[] = [
  {
    id: 1,
    colorClass: "green",
    date: "Feb 2, 2021",
    title: "web designing",
    description: "Prototyping",
    progressPercent: "90%",
    progressValue: "90%",
    imgSrc1:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80",
    imgAlt1: "User 1",
    imgSrc2:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80",
    imgAlt2: "User 2",
    countdownText: "2 days left",
  },
  {
    id: 2,
    colorClass: "orange",
    date: "Feb 05, 2021",
    title: "mobile app",
    description: "Shopping",
    progressPercent: "30%",
    progressValue: "30%",
    imgSrc1:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=240&q=80",
    imgAlt1: "User 3",
    imgSrc2:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=240&q=80",
    imgAlt2: "User 4",
    countdownText: "3 weeks left",
  },
  {
    id: 3,
    colorClass: "red",
    date: "March 03, 2021",
    title: "dashboard",
    description: "Medical",
    progressPercent: "50%",
    progressValue: "50%",
    imgSrc1:
      "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=240&q=80",
    imgAlt1: "User 5",
    imgSrc2:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=240&q=80",
    imgAlt2: "User 6",
    countdownText: "3 weeks left",
  },
  {
    id: 4,
    colorClass: "blue",
    date: "March 08, 2021",
    title: "web designing",
    description: "Wireframing",
    progressPercent: "20%",
    progressValue: "20%",
    imgSrc1:
      "https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=240&q=80",
    imgAlt1: "Erik Longman",
    imgSrc2:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=240&q=80",
    imgAlt2: "Jane Doe",
    countdownText: "3 weeks left",
  },
]

export default function ProjectsPage() {
  return (
    <section className="relative min-h-full p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
            Projetos
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground md:text-4xl">
            Workspace de projetos ativos
          </h1>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            Visualize entregas em andamento, progresso atual e pessoas
            envolvidas em cada iniciativa do workspace.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
          {projectCards.map((card) => (
            <CourseDesignCard key={card.id} data={card} />
          ))}
        </div>
      </div>
    </section>
  )
}
