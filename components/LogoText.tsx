import { cn } from "@/lib/utils";

interface LogoTextProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function LogoText({ className, size = "md" }: LogoTextProps) {
  const sizeClasses = {
    sm: "text-body-sm",
    md: "text-title-5",
    lg: "text-title-3",
  };

  return (
    <span 
      className={cn(
        "font-serif font-semibold tracking-tight",
        sizeClasses[size],
        className
      )}
    >
      StoryRelay
    </span>
  );
}