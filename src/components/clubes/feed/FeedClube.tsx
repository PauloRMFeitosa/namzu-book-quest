import { useEffect, useRef } from "react";
import { Loader2, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeedClube } from "@/hooks/clubes/useFeed";
import { PostComposer } from "./PostComposer";
import { PostCard } from "./PostCard";
import { ResumoDiscussaoButton } from "@/components/clubes/ai/ResumoDiscussaoButton";

interface Props {
  clubeId: string;
  isMembro: boolean;
}

export const FeedClube = ({ clubeId, isMembro }: Props) => {
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFeedClube(clubeId);

  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinel.current || !hasNextPage) return;
    const obs = new IntersectionObserver(
      ([e]) => e.isIntersecting && !isFetchingNextPage && fetchNextPage(),
      { rootMargin: "200px" },
    );
    obs.observe(sentinel.current);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const posts = data?.pages.flat() ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ResumoDiscussaoButton clubeId={clubeId} />
      </div>
      <PostComposer clubeId={clubeId} isMembro={isMembro} />

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-[var(--radius)]" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="card-soft p-10 flex flex-col items-center text-center gap-3 border border-dashed border-border/60">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
            <MessageSquareText className="w-5 h-5 text-secondary-foreground" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold">Silêncio editorial</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Ninguém abriu a conversa por aqui ainda.
              {isMembro ? " Que tal ser a primeira voz?" : " Entre no clube para começar."}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} clubeId={clubeId} />
          ))}
          <div ref={sentinel} />
          {hasNextPage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="self-center text-xs"
            >
              {isFetchingNextPage ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Carregar mais"
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
