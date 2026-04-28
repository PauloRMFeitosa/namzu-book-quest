import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { FontSizeProvider } from "@/hooks/useFontSize";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import RecuperarSenha from "./pages/RecuperarSenha";
import Home from "./pages/Home";
import Busca from "./pages/Busca";
import Livros from "./pages/Livros";
import Leituras from "./pages/Leituras";
import Clubes from "./pages/Clubes";
import Perfil from "./pages/Perfil";
import Metas from "./pages/Metas";
import Historico from "./pages/Historico";
import Notificacoes from "./pages/Notificacoes";
import Configuracoes from "./pages/Configuracoes";
import CadastroManual from "./pages/CadastroManual";
import ObraDetalhe from "./pages/ObraDetalhe";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/recuperar-senha" element={<RecuperarSenha />} />
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/busca" element={<ProtectedRoute><Busca /></ProtectedRoute>} />
            <Route path="/livros" element={<ProtectedRoute><Livros /></ProtectedRoute>} />
            <Route path="/leituras" element={<ProtectedRoute><Leituras /></ProtectedRoute>} />
            <Route path="/leituras/:id" element={<ProtectedRoute><Leituras /></ProtectedRoute>} />
            <Route path="/clubes" element={<ProtectedRoute><Clubes /></ProtectedRoute>} />
            <Route path="/clubes/:id" element={<ProtectedRoute><Clubes /></ProtectedRoute>} />
            <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
            <Route path="/metas" element={<ProtectedRoute><Metas /></ProtectedRoute>} />
            <Route path="/historico" element={<ProtectedRoute><Historico /></ProtectedRoute>} />
            <Route path="/notificacoes" element={<ProtectedRoute><Notificacoes /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
            <Route path="/cadastro-manual" element={<ProtectedRoute><CadastroManual /></ProtectedRoute>} />
            <Route path="/obras/:id" element={<ProtectedRoute><ObraDetalhe /></ProtectedRoute>} />
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
