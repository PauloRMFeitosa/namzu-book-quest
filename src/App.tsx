import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { FontSizeProvider } from "@/hooks/useFontSize";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Onboarding from "./pages/Onboarding";
import OnboardingInteresses from "./pages/OnboardingInteresses";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import RecuperarSenha from "./pages/RecuperarSenha";
import Home from "./pages/Home";
import Busca from "./pages/Busca";
import Livros from "./pages/Livros";
import Leituras from "./pages/Leituras";
import ClubesMarketplace from "./pages/clubes/Marketplace";
import ClubeDetalhe from "./pages/clubes/ClubeDetalhe";
import Perfil from "./pages/Perfil";
import Metas from "./pages/Metas";
import Historico from "./pages/Historico";
import Notificacoes from "./pages/Notificacoes";
import Configuracoes from "./pages/Configuracoes";
import TermosDeUso from "./pages/TermosDeUso";
import CadastroManual from "./pages/CadastroManual";
import ObraDetalhe from "./pages/ObraDetalhe";
import AutorDetalhe from "./pages/AutorDetalhe";
import Admin from "./pages/admin/Admin";
import Leitores from "./pages/Leitores";
import Citacoes from "./pages/Citacoes";
import PerfilPublico from "./pages/PerfilPublico";
import { AdminRoute } from "./components/AdminRoute";
import { FeatureRoute } from "./components/FeatureRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: 5 * 60 * 1000, // 5 min — evita refetch ao voltar de outra aba/app
      gcTime: 30 * 60 * 1000,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <FontSizeProvider>
      <TooltipProvider>
        <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/onboarding-interesses" element={<OnboardingInteresses />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/recuperar-senha" element={<RecuperarSenha />} />
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/busca" element={<ProtectedRoute><Busca /></ProtectedRoute>} />
        <Route path="/livros" element={<ProtectedRoute><Livros /></ProtectedRoute>} />
        <Route path="/leituras" element={<ProtectedRoute><FeatureRoute flag="show_leituras"><Leituras /></FeatureRoute></ProtectedRoute>} />
        <Route path="/leituras/:id" element={<ProtectedRoute><FeatureRoute flag="show_leituras"><Leituras /></FeatureRoute></ProtectedRoute>} />
            <Route path="/clubes" element={<ProtectedRoute><FeatureRoute flag="show_clubes"><ClubesMarketplace /></FeatureRoute></ProtectedRoute>} />
            <Route path="/clubes/:id" element={<ProtectedRoute><FeatureRoute flag="show_clubes"><ClubeDetalhe /></FeatureRoute></ProtectedRoute>} />
            <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
            <Route path="/perfis/:id" element={<ProtectedRoute><PerfilPublico /></ProtectedRoute>} />
            <Route path="/leitores" element={<ProtectedRoute><Leitores /></ProtectedRoute>} />
            <Route path="/citacoes" element={<ProtectedRoute><Citacoes /></ProtectedRoute>} />
            <Route path="/metas" element={<ProtectedRoute><FeatureRoute flag="show_metas"><Metas /></FeatureRoute></ProtectedRoute>} />
            <Route path="/historico" element={<ProtectedRoute><FeatureRoute flag="show_historico"><Historico /></FeatureRoute></ProtectedRoute>} />
            <Route path="/notificacoes" element={<ProtectedRoute><FeatureRoute flag="show_notificacoes"><Notificacoes /></FeatureRoute></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
            <Route path="/termos" element={<ProtectedRoute><TermosDeUso /></ProtectedRoute>} />
            <Route path="/cadastro-manual" element={<ProtectedRoute><CadastroManual /></ProtectedRoute>} />
            <Route path="/obras/:id" element={<ProtectedRoute><ObraDetalhe /></ProtectedRoute>} />
            <Route path="/autores/:id" element={<ProtectedRoute><AutorDetalhe /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminRoute><Admin /></AdminRoute></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      </TooltipProvider>
      </FontSizeProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
