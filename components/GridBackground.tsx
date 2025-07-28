import { cn } from "@/lib/utils";

interface GridBackgroundProps {
  className?: string;
  gridSize?: number;
  gridColor?: string;
  opacity?: number;
  fade?: boolean;
  dots?: boolean;
}

export default function GridBackground({
  className,
  gridSize = 20,
  gridColor = "#73737320",
  opacity = 0.5,
  fade = true,
  dots = false,
}: GridBackgroundProps) {
  if (dots) {
    // Dot pattern using radial gradient
    return (
      <div
        className={cn(
          "absolute inset-0 h-full w-full -z-10",
          fade && "bg-gradient-to-br from-background via-background/95 to-secondary/20",
          className
        )}
        style={{
          backgroundImage: `radial-gradient(${gridColor} 1px, transparent 1px)`,
          backgroundSize: `${gridSize}px ${gridSize}px`,
          opacity,
        }}
      />
    );
  }

  // Grid pattern using linear gradients (latest 2025 approach)
  return (
    <div
      className={cn(
        "absolute inset-0 h-full w-full -z-10",
        fade && "bg-gradient-to-br from-background via-background/95 to-secondary/20",
        className
      )}
      style={{
        backgroundImage: `
          linear-gradient(to right, ${gridColor} 1px, transparent 1px),
          linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)
        `,
        backgroundSize: `${gridSize}px ${gridSize}px`,
        opacity,
      }}
    />
  );
}

// Alternative component with Tailwind CSS classes (for better performance)
export function TailwindGridBackground({
  className,
  size = "20",
  centerFade = false,
}: {
  className?: string;
  size?: "16" | "20" | "24" | "32" | "48" | "64" | "80";
  centerFade?: boolean;
}) {
  const sizeMap = {
    "16": "bg-[size:16px_16px]",
    "20": "bg-[size:20px_20px]", 
    "24": "bg-[size:24px_24px]",
    "32": "bg-[size:32px_32px]",
    "48": "bg-[size:48px_48px]",
    "64": "bg-[size:64px_64px]",
    "80": "bg-[size:80px_80px]",
  };

  return (
    <div className={cn("absolute inset-0 h-full w-full -z-10", className)}>
      {/* Base grid */}
      <div
        className={cn(
          "absolute inset-0 h-full w-full",
          "bg-[linear-gradient(to_right,#73737320_1px,transparent_1px),linear-gradient(to_bottom,#73737320_1px,transparent_1px)]",
          sizeMap[size]
        )}
      />
      
      {/* Center fade overlay */}
      {centerFade && (
        <div 
          className="absolute inset-0 h-full w-full"
          style={{
            background: `radial-gradient(circle at center, 
              rgba(255, 255, 255, 1) 0%, 
              rgba(255, 255, 255, 0.8) 20%, 
              rgba(255, 255, 255, 0.4) 40%, 
              rgba(255, 255, 255, 0.1) 60%, 
              transparent 80%
            )`
          }}
        />
      )}
    </div>
  );
}

// Premium animated grid (with subtle animation)
export function AnimatedGridBackground({ 
  className,
  animation = "fade"
}: { 
  className?: string;
  animation?: "move" | "fade" | "pulse";
}) {
  const animationClass = {
    move: "grid-animate",
    fade: "grid-fade", 
    pulse: "grid-pulse"
  }[animation];

  return (
    <div className={cn("absolute inset-0 h-full w-full -z-10 overflow-hidden", className)}>
      {/* Static base grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:20px_20px]" />
      
      {/* Animated overlay grid */}
      <div 
        className={cn(
          "absolute inset-0 bg-[linear-gradient(to_right,#73737315_1px,transparent_1px),linear-gradient(to_bottom,#73737315_1px,transparent_1px)] bg-[size:20px_20px]",
          animationClass
        )}
      />
    </div>
  );
}

// Enhanced responsive grid background  
export function ResponsiveGridBackground({ 
  className,
  animated = false
}: { 
  className?: string;
  animated?: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 h-full w-full -z-10",
        "bg-[linear-gradient(to_right,#73737320_1px,transparent_1px),linear-gradient(to_bottom,#73737320_1px,transparent_1px)]",
        "bg-[size:20px_20px] grid-responsive",
        animated && "grid-fade",
        className
      )}
    />
  );
}

// Large grid with center spotlight effect (perfect for content focus)
export function LargeGridWithSpotlight({
  className,
  size = "64",
  spotlightSize = "40%",
}: {
  className?: string;
  size?: "48" | "64" | "80" | "96";
  spotlightSize?: "30%" | "40%" | "50%" | "60%";
}) {
  const sizeMap = {
    "48": "bg-[size:48px_48px]",
    "64": "bg-[size:64px_64px]",
    "80": "bg-[size:80px_80px]",
    "96": "bg-[size:96px_96px]",
  };

  return (
    <div className={cn("absolute inset-0 h-full w-full -z-10", className)}>
      {/* Large grid pattern with CSS mask for dramatic fade */}
      <div
        className={cn(
          "absolute inset-0 h-full w-full",
          "bg-[linear-gradient(to_right,#73737340_1px,transparent_1px),linear-gradient(to_bottom,#73737340_1px,transparent_1px)]",
          sizeMap[size]
        )}
        style={{
          mask: `radial-gradient(ellipse ${spotlightSize} at center, 
            transparent 0%, 
            transparent 15%, 
            rgba(0, 0, 0, 0.1) 25%, 
            rgba(0, 0, 0, 0.3) 35%, 
            rgba(0, 0, 0, 0.6) 45%, 
            rgba(0, 0, 0, 0.8) 55%, 
            rgba(0, 0, 0, 0.95) 70%, 
            black 85%
          )`,
          WebkitMask: `radial-gradient(ellipse ${spotlightSize} at center, 
            transparent 0%, 
            transparent 15%, 
            rgba(0, 0, 0, 0.1) 25%, 
            rgba(0, 0, 0, 0.3) 35%, 
            rgba(0, 0, 0, 0.6) 45%, 
            rgba(0, 0, 0, 0.8) 55%, 
            rgba(0, 0, 0, 0.95) 70%, 
            black 85%
          )`
        }}
      />
    </div>
  );
}

// Alternative with strong contrast
export function DramaticGridSpotlight({
  className,
  size = "64",
  spotlightSize = "40%",
}: {
  className?: string;
  size?: "48" | "64" | "80" | "96";
  spotlightSize?: "30%" | "40%" | "50%" | "60%";
}) {
  const sizeMap = {
    "48": "bg-[size:48px_48px]",
    "64": "bg-[size:64px_64px]",
    "80": "bg-[size:80px_80px]",
    "96": "bg-[size:96px_96px]",
  };

  return (
    <div className={cn("absolute inset-0 h-full w-full -z-10", className)}>
      {/* Visible grid lines */}
      <div
        className={cn(
          "absolute inset-0 h-full w-full",
          "bg-[linear-gradient(to_right,#73737350_1px,transparent_1px),linear-gradient(to_bottom,#73737350_1px,transparent_1px)]",
          sizeMap[size]
        )}
      />
      
      {/* Strong white overlay in center */}
      <div 
        className="absolute inset-0 h-full w-full"
        style={{
          background: `radial-gradient(circle ${spotlightSize} at center, 
            rgba(255, 255, 255, 0.95) 0%, 
            rgba(255, 255, 255, 0.8) 20%, 
            rgba(255, 255, 255, 0.5) 40%, 
            rgba(255, 255, 255, 0.2) 60%, 
            transparent 80%
          )`
        }}
      />
    </div>
  );
}