import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  preload?: boolean;
  sizes?: string;
};

export default function BrandLogo({
  className = "h-10 w-40",
  preload = false,
  sizes = "160px",
}: BrandLogoProps) {
  return (
    <span className={`relative inline-flex shrink-0 items-center ${className}`}>
      <Image
        src="/newlogo.png"
        alt="TractionFlo"
        fill
        preload={preload}
        sizes={sizes}
        className="object-contain"
      />
    </span>
  );
}
