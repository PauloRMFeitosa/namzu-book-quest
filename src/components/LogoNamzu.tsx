import logoClaro from "@/assets/logo-namzu.svg";
import logoEscuro from "@/assets/logo-namzu-escuro.svg";
import { cn } from "@/lib/utils";

interface Props {
  /**
   * "cor": símbolo colorido, para onde a marca se apresenta (login, convite,
   * página pública). No tema escuro, o azul do símbolo troca pelo azul claro
   * do guia, que não some no fundo. "mono": símbolo em uma cor só, a principal
   * do tema, para dentro do app.
   */
  variante?: "cor" | "mono";
  className?: string;
  /** Vazio quando a logo é só enfeite ao lado do nome escrito. */
  alt?: string;
}

export const LogoNamzu = ({ variante = "cor", className, alt = "NAMZU" }: Props) => {
  if (variante === "cor") {
    return (
      <>
        <img src={logoClaro} alt={alt} className={cn("object-contain dark:hidden", className)} />
        <img src={logoEscuro} alt={alt} className={cn("object-contain hidden dark:block", className)} />
      </>
    );
  }
  const mascara = `url(${logoClaro}) center / contain no-repeat`;
  return (
    <span
      role="img"
      aria-label={alt}
      className={cn("inline-block bg-primary", className)}
      style={{ WebkitMask: mascara, mask: mascara }}
    />
  );
};
