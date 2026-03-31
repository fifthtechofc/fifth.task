import { Button } from "@/components/ui/button"
import { CheckCheck } from "lucide-react"

interface ButtonSaveProps {
  label?: string
  onClick?: () => void
  className?: string
}

const ButtonSaveDemo = ({
  label = "Save Changes",
  onClick,
  className,
}: ButtonSaveProps) => {
  return (
    <Button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 bg-background text-foreground hover:bg-muted cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 ${className ?? ""}`}
    >
      <CheckCheck className="size-4" />
      {label}
    </Button>
  )
}

export default ButtonSaveDemo

