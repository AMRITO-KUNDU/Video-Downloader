import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: "default" | "secondary" | "outline" | "ghost" | "link" | "danger"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    const variants = {
      default: "bg-gradient-to-b from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 border border-primary/50",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-white/5",
      outline: "border border-border bg-transparent hover:bg-secondary text-foreground",
      ghost: "hover:bg-secondary hover:text-foreground",
      link: "text-primary underline-offset-4 hover:underline",
      danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    }
    
    const sizes = {
      default: "h-11 px-5 py-2",
      sm: "h-9 rounded-md px-3 text-xs",
      lg: "h-14 rounded-xl px-8 text-lg font-semibold",
      icon: "h-11 w-11",
    }

    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:transform-none disabled:shadow-none active:scale-[0.98]",
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
