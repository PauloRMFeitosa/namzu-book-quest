// Mostrado enquanto o arquivo de uma página é baixado (carregamento por rota).
export const PaginaCarregando = () => (
  <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-label="Carregando">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);
