import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Leva à página de criação do clube. */
export const BotaoCriarClube = () => (
  <Button asChild size="lg" className="h-12 px-8 rounded-2xl text-base font-semibold bg-primary hover:bg-primary/90 shadow-md">
    <Link to="/clubes/novo">
      <Plus className="w-5 h-5" /> Criar meu clube de leitura
    </Link>
  </Button>
);
