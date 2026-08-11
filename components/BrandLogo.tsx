import Image from 'next/image';

interface BrandLogoProps {
  className?: string;
  nameClassName?: string;
  priority?: boolean;
}

export function BrandLogo({ className = '', nameClassName = '', priority = false }: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span className="relative aspect-square h-full shrink-0 overflow-hidden rounded-[24%]">
        <Image
          src="/brand/omni-workspace-icon-hd.png"
          alt=""
          fill
          priority={priority}
          sizes="(max-width: 768px) 80px, 48px"
          className="scale-[1.35] object-cover mix-blend-screen"
        />
      </span>
      <span
        className={`whitespace-nowrap bg-gradient-to-r from-cyan-200 via-white to-pink-300 bg-clip-text font-semibold tracking-tight text-transparent drop-shadow-[0_0_12px_rgba(34,211,238,0.2)] ${nameClassName}`}
      >
        Omni Workspace
      </span>
    </span>
  );
}
