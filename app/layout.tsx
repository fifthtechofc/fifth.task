import "./globals.css"
import BackgroundPlus from "@/components/ui/background-plus"

export const metadata = {
  title: "FifthTask", 
  description: "Sistema de gestão da empresa",
  icons: {
    icon: "/icon.png", 
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <BackgroundPlus plusColor="#ffffff22" plusSize={52} />
        <div className="relative z-10 min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}