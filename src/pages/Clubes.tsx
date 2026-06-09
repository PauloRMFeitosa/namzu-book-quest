import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Users, Send, Star } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { clubesService, type Clube, type ClubePost } from "@/services/clubes";
import { queryKeys } from "@/constants/queryKeys";

const ClubesList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: clubes = [] } = useQuery({
    queryKey: queryKeys.clubes.all,
    queryFn: clubesService.listarAtivos,
  });

  const { data: membros = [] } = useQuery({
    queryKey: queryKeys.clubes.membros(user?.id ?? ""),
    enabled: !!user,
    queryFn: () => clubesService.listarMembrosIds(user!.id),
  });

  const entrar = async (clube_id: string) => {
    try {
      await clubesService.entrar(clube_id, user!.id);
      toast.success("Bem-vindo ao clube!");
      qc.invalidateQueries({ queryKey: queryKeys.clubes.membros(user!.id) });
      qc.invalidateQueries({ queryKey: queryKeys.clubes.meus });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao entrar no clube");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Clubes</h1>
      {clubes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum clube ativo no momento.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {clubes.map((c: Clube) => {
            const membro = membros.includes(c.id);
            return (
              <div key={c.id} className="card-soft p-4 flex flex-col gap-3 hover-lift">
                <div className="flex gap-3 items-start">
                  {c.imagem_capa_url ? (
                    <img src={c.imagem_capa_url} alt="" className="w-16 h-16 rounded-xl object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center">
                      <Users className="w-7 h-7 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{c.nome}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{c.descricao}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {membro ? (
                    <Button onClick={() => navigate(`/clubes/${c.id}`)} className="flex-1 h-11 rounded-2xl bg-primary hover:bg-primary-hover">Abrir</Button>
                  ) : (
                    <Button onClick={() => entrar(c.id)} variant="outline" className="flex-1 h-11 rounded-2xl border-2">Entrar</Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ClubeDetalhe = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [conteudo, setConteudo] = useState("");

  const { data: clube } = useQuery({
    queryKey: queryKeys.clubes.detail(id!),
    enabled: !!id,
    queryFn: () => clubesService.buscarPorId(id!),
  });

  const { data: posts = [] } = useQuery({
    queryKey: queryKeys.clubes.posts(id!),
    enabled: !!id,
    queryFn: () => clubesService.listarPosts(id!),
  });

  const postar = async () => {
    if (!conteudo.trim() || !user || !id) return;
    try {
      await clubesService.criarPost({
        clube_id: id,
        user_id: user.id,
        conteudo: conteudo.trim(),
      });
      setConteudo("");
      toast.success("Post publicado!");
      qc.invalidateQueries({ queryKey: queryKeys.clubes.posts(id) });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao publicar");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => navigate("/clubes")} className="self-start flex items-center gap-1 text-muted-foreground -ml-2 p-2">
        <ArrowLeft className="w-4 h-4" /> Clubes
      </button>
      {clube && (
        <header className="card-soft p-4">
          <h1 className="text-xl font-bold">{clube.nome}</h1>
          <p className="text-sm text-muted-foreground mt-1">{clube.descricao}</p>
        </header>
      )}

      <div className="card-soft p-3 flex flex-col gap-2">
        <Textarea
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          placeholder="Compartilhe algo com o clube…"
          rows={3}
          className="rounded-xl border-0 focus-visible:ring-0 resize-none"
        />
        <Button onClick={postar} disabled={!conteudo.trim()} className="self-end h-10 rounded-xl bg-primary hover:bg-primary-hover">
          <Send className="w-4 h-4" /> Publicar
        </Button>
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Sem posts ainda. Seja o primeiro!</p>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((p: ClubePost) => (
            <div key={p.id} className="card-soft p-4">
              {p.is_destaque_curador && (
                <div className="flex items-center gap-1 text-xs text-primary font-semibold mb-2">
                  <Star className="w-3 h-3" /> Destaque do curador
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{p.conteudo}</p>
              <p className="text-[10px] text-muted-foreground mt-2">{new Date(p.created_at!).toLocaleString("pt-BR")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Clubes = () => {
  const { id } = useParams();
  return id ? <ClubeDetalhe /> : <ClubesList />;
};

export default Clubes;
