import { lazy, Suspense } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { FontSizeProvider } from "@/hooks/useFontSize";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { FeatureRoute } from "./components/FeatureRoute";
import { SessaoLeituraModal } from "@/components/leituras/SessaoLeituraModal";
import { OnboardingAutoMerge } from "@/components/OnboardingAutoMerge";
import { PaginaCarregando } from "@/components/PaginaCarregando";

// Cada página vira um arquivo próprio, baixado só quando a rota é aberta.
// O que fica no carregamento inicial é a casca do app e a página pública.
const OnboardingInteresses = lazy(() => import("./pages/OnboardingInteresses"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const RecuperarSenha = lazy(() => import("./pages/RecuperarSenha"));
const Inicio = lazy(() => import("./pages/Inicio"));
const Busca = lazy(() => import("./pages/Busca"));
const Livros = lazy(() => import("./pages/Livros"));
const Leituras = lazy(() => import("./pages/Leituras"));
const ClubesMarketplace = lazy(() => import("./pages/clubes/Marketplace"));
const ClubeDetalhe = lazy(() => import("./pages/clubes/ClubeDetalhe"));
const AdicionarObraTrilha = lazy(() => import("./pages/clubes/AdicionarObraTrilha"));
const Perfil = lazy(() => import("./pages/Perfil"));
const Metas = lazy(() => import("./pages/Metas"));
const Historico = lazy(() => import("./pages/Historico"));
const Notificacoes = lazy(() => import("./pages/Notificacoes"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const TermosDeUso = lazy(() => import("./pages/TermosDeUso"));
const CadastroManual = lazy(() => import("./pages/CadastroManual"));
const ObraDetalhe = lazy(() => import("./pages/ObraDetalhe"));
const AutorDetalhe = lazy(() => import("./pages/AutorDetalhe"));
const Admin = lazy(() => import("./pages/admin/Admin"));
const Leitores = lazy(() => import("./pages/Leitores"));
const Citacoes = lazy(() => import("./pages/Citacoes"));
const PerfilPublico = lazy(() => import("./pages/PerfilPublico"));
const PerfilLeituraDetalhe = lazy(() => import("./pages/PerfilLeituraDetalhe"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Comecar = lazy(() => import("./pages/Comecar"));
const Convite = lazy(() => import("./pages/Convite"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "namzu-rq-cache",
});

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister,
      maxAge: 30 * 60 * 1000, // mantém cache por 30 min entre sessões
      buster: "v2",            // incrementar aqui para forçar invalidação do cache
    }}
  >
    <ThemeProvider>
      <FontSizeProvider>
      <TooltipProvider>
        <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PaginaCarregando />}>
          <Routes>
            <Route path="/comecar" element={<Comecar />} />
            <Route path="/onboarding" element={<Navigate to="/comecar" replace />} />
            <Route path="/onboarding-interesses" element={<OnboardingInteresses />} />
            <Route path="/convite/:id" element={<Convite />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/recuperar-senha" element={<RecuperarSenha />} />
            <Route path="/" element={<ProtectedRoute><Inicio /></ProtectedRoute>} />
            <Route path="/busca" element={<ProtectedRoute><FeatureRoute flag="show_busca"><Busca /></FeatureRoute></ProtectedRoute>} />
            <Route path="/livros" element={<ProtectedRoute><FeatureRoute flag="show_livros"><Livros /></FeatureRoute></ProtectedRoute>} />
        <Route path="/leituras" element={<ProtectedRoute><FeatureRoute flag="show_leituras"><Leituras /></FeatureRoute></ProtectedRoute>} />
        <Route path="/leituras/:id" element={<ProtectedRoute><FeatureRoute flag="show_leituras"><Leituras /></FeatureRoute></ProtectedRoute>} />
            <Route path="/clubes" element={<ProtectedRoute><FeatureRoute flag="show_clubes"><ClubesMarketplace /></FeatureRoute></ProtectedRoute>} />
            <Route path="/clubes/:id" element={<ProtectedRoute><FeatureRoute flag="show_clubes"><ClubeDetalhe /></FeatureRoute></ProtectedRoute>} />
            <Route path="/clubes/:id/trilha/nova" element={<ProtectedRoute><FeatureRoute flag="show_clubes"><AdicionarObraTrilha /></FeatureRoute></ProtectedRoute>} />
            <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
            <Route path="/perfis/:id" element={<ProtectedRoute><PerfilPublico /></ProtectedRoute>} />
            <Route path="/perfis/:id/livros/:usuarioLivroId" element={<ProtectedRoute><PerfilLeituraDetalhe /></ProtectedRoute>} />
            <Route path="/leitores" element={<ProtectedRoute><FeatureRoute flag="show_leitores"><Leitores /></FeatureRoute></ProtectedRoute>} />
            <Route path="/citacoes" element={<ProtectedRoute><FeatureRoute flag="show_citacoes"><Citacoes /></FeatureRoute></ProtectedRoute>} />
            <Route path="/metas" element={<ProtectedRoute><FeatureRoute flag="show_metas"><Metas /></FeatureRoute></ProtectedRoute>} />
            <Route path="/historico" element={<ProtectedRoute><FeatureRoute flag="show_historico"><Historico /></FeatureRoute></ProtectedRoute>} />
            <Route path="/notificacoes" element={<ProtectedRoute><FeatureRoute flag="show_notificacoes"><Notificacoes /></FeatureRoute></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
            <Route path="/termos" element={<TermosDeUso />} />
            <Route path="/cadastro-manual" element={<ProtectedRoute><CadastroManual /></ProtectedRoute>} />
            <Route path="/obras/:id" element={<ProtectedRoute><ObraDetalhe /></ProtectedRoute>} />
            <Route path="/autores/:id" element={<ProtectedRoute><AutorDetalhe /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminRoute><Admin /></AdminRoute></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          <SessaoLeituraModal />
          <OnboardingAutoMerge />
        </AuthProvider>
      </BrowserRouter>
      </TooltipProvider>
      </FontSizeProvider>
    </ThemeProvider>
  </PersistQueryClientProvider>
);

export default App;
