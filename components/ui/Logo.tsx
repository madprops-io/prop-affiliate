import Image from "next/image";

interface LogoProps {
  src: string;
  alt: string;
  size?: number;
}

export default function Logo({ src, alt, size = 56 }: LogoProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        borderRadius: "0.5rem", // keeps soft edges
        overflow: "hidden",
      }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${size}px`}
        style={{
          objectFit: "cover", // fills the box
          objectPosition: "center",
        }}
      />
    </div>
  );
}
