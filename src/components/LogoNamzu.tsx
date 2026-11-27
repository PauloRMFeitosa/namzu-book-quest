import logoNamzu from "@/assets/logo-namzu.png";
import { cn } from "@/lib/utils";

interface Props {
  /**
   * "cor": símbolo colorido, para onde a marca se apresenta (login, convite,
   * página pública). "mono": símbolo em uma cor só, a principal do tema, para
   * dentro do app; funciona igual no claro e no escuro.
   */
  variante?: "cor" | "mono";
  className?: string;
  alt?: string;
}

export const LogoNamzu = ({ variante = "cor", className, alt = "NAMZU" }: Props) => {
  if (variante === "cor") {
    return <img src={logoNamzu} alt={alt} className={cn("object-contain", className)} />;
  }
  const mascara = `url(${logoNamzu}) center / contain no-repeat`;
  return (
    <span
      role="img"
      aria-label={alt}
      className={cn("inline-block bg-primary", className)}
      style={{ WebkitMask: mascara, mask: mascara }}
    />
  );
};
