import { cn } from "@/lib/utils";
import Image from "next/image";

interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className, size = 20 }: LogoProps) {
  return (
    <div className={cn("relative", className)}>
      <Image
        src="/icon.png"
        alt="StoryRelay Logo"
        width={size}
        height={size}
        className="object-contain"
        priority
      />
    </div>
  );
}
