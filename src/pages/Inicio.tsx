import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import Home from "./Home";
import MeuClube from "./MeuClube";

// A rota "/" depende do modo de navegação: com o foco no organizador ligado,
// a entrada é "Meu clube"; com a flag desligada, volta a Home antiga.
const Inicio = () => {
  const { flags } = useFeatureFlags();
  return flags.show_navegacao_foco ? <MeuClube /> : <Home />;
};

export default Inicio;
