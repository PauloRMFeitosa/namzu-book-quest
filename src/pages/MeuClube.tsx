import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Compass, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useClubes } from "@/hooks/clubes/useClubes";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { PageHero } from "@/components/PageHero";
import { Skeleton } from "@/components/ui/skeleton";
import { ClubeCard } from "@/components/clubes/marketplace/ClubeCard";
import { BotaoCriarClube } from "@/components/clubes/marketplace/BotaoCriarClube";

// Destino "Meu clube" (Fase 2):
// - um clube: abre direto nele;
// - vários: lista, com os que o usuário organiza primeiro;
// - nenhum: convida a criar o primeiro clube.
const MeuClube = () => {
  const { user } = useAuth();
  const { flags } = useFeatureFlags();
  const { isAdmin } = useIsAdmin();
  // Mesma consulta do marketplace e da Home antiga (cache compartilhado)
  const { data: todosClubes = [], isLoading } = useClubes();

  const meusClubes = useMemo(
    () =>
      todosClubes
        .filter((c) => c.is_membro || c.curador_id === user?.id)
        .sort((a, b) => Number(b.curador_id === user?.id) - Number(a.curador_id === user?.id)),
    [todosClubes, user?.id]
  );

  const podeExplorar = isAdmin || flags.show_clubes;

  // Quem chega de "Criar meu clube" (?criar=1) vai direto para a página de criação.
  const [search] = useSearchParams();
  if (search.get("criar") === "1") return <Navigate to="/clubes/novo" replace />;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28 rounded-[var(--radius)]" />
        <Skeleton className="h-44 rounded-[var(--radius)]" />
      </div>
    );
  }

  if (meusClubes.length === 1) {
    return <Navigate to={`/clubes/${meusClubes[0].id}`} replace />;
  }

  const linkExplorar = podeExplorar && (
    <Link
      to="/clubes"
      className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:underline"
    >
      <Compass className="w-4 h-4" />
      Explorar clubes
    </Link>
  );

  if (meusClubes.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          icon={Users}
          badge="Meu clube"
          tom="clube"
          title={<>Seu clube de leitura <span className="text-gradient-warm">começa aqui</span></>}
          description="Crie o clube, convide os membros e acompanhe a leitura de todos em um só lugar."
        />
        <div className="card-soft p-6 flex flex-col items-center text-center gap-4">
          <Users className="w-10 h-10 text-primary" />
          <div>
            <p className="font-semibold">Você ainda não tem um clube</p>
            <p className="text-sm text-muted-foreground mt-1">
              Leva poucos minutos: dê um nome, escolha o livro e compartilhe o link.
            </p>
          </div>
          <BotaoCriarClube />
          {linkExplorar}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        icon={Users}
        badge="Meu clube"
          tom="clube"
        title={<>Meus <span className="text-gradient-warm">clubes</span></>}
        description="Escolha um clube para continuar."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {meusClubes.map((c) => (
          <ClubeCard key={c.id} clube={c} ehCurador={c.curador_id === user?.id} />
        ))}
      </div>
      <div className="flex flex-col items-center gap-4">
        <BotaoCriarClube />
        {linkExplorar}
      </div>
    </div>
  );
};

export default MeuClube;
