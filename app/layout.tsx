import "./globals.css"
import NeuralBackground from "@/components/ui/flow-field-background"

export const metadata = {
  title: "FifthTask",
  description: "Sistema de gestão da empresa",
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className="bg-black">
        <div className="fixed inset-0 -z-10">
          <NeuralBackground color="#c7d1db" trailOpacity={0.2} />
        </div>
        <div className="relative z-10 min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}