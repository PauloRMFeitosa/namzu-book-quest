-- Habilita realtime para clube_trilhas: adições, remoções e reordenações
-- feitas pelo curador na trilha passam a ser propagadas ao vivo para os
-- membros com a tela do clube aberta (mesmo padrão de usuario_leituras).

-- replica identity full: necessário para que eventos DELETE carreguem todas
-- as colunas do registro antigo e o filtro por clube_id funcione no cliente.
alter table public.clube_trilhas replica identity full;

alter publication supabase_realtime add table public.clube_trilhas;
