import { Skeleton } from "@/components/ui/skeleton";

export const CarregandoCriacao = () => (
  <div className="flex flex-col gap-4 max-w-2xl w-full mx-auto">
    <Skeleton className="h-9 w-64 rounded-xl" />
    <Skeleton className="h-40 rounded-2xl" />
    <Skeleton className="h-28 rounded-2xl" />
  </div>
);
