
DO $$
DECLARE
  curador UUID := 'a633d6a8-bf66-44f4-bdf2-df764e01fa0e'; -- paulormf@gmail.com

  -- IDs dos clubes
  clube_ficcao      UUID := gen_random_uuid();
  clube_filosofia   UUID := gen_random_uuid();
  clube_historia    UUID := gen_random_uuid();
  clube_negocios    UUID := gen_random_uuid();
  clube_autoajuda   UUID := gen_random_uuid();
  clube_infantil    UUID := gen_random_uuid();
  clube_biografia   UUID := gen_random_uuid();

BEGIN

  -- =====================
  -- INSERIR CLUBES
  -- =====================
  INSERT INTO clubes (id, nome, descricao, curador_id, objetivo, regras, duracao_tipo, preco_centavos, is_ativo, categoria, visibilidade) VALUES

  (clube_ficcao, 'Clube de Ficção', 
   'Um espaço para amantes de histórias fictícias — do realismo mágico à ficção literária contemporânea. Explore mundos, personagens e narrativas que expandem a imaginação.',
   curador, 
   'Ler e discutir obras de ficção de diferentes épocas e estilos, ampliando o repertório literário dos membros.',
   'Respeite as opiniões alheias. Evite spoilers sem aviso. Participe das discussões com generosidade.',
   'continuo', 0, true, 'ficcao', 'publico'),

  (clube_filosofia, 'Clube de Filosofia',
   'Leituras que questionam, provocam e iluminam. De Platão aos contemporâneos, exploramos o pensamento humano em sua forma mais profunda.',
   curador,
   'Desenvolver o pensamento crítico através da leitura filosófica compartilhada.',
   'Argumente com fundamento. Ouça com atenção. Toda pergunta é bem-vinda.',
   'continuo', 0, true, 'filosofia', 'publico'),

  (clube_historia, 'Clube de História',
   'Das civilizações antigas ao mundo moderno — leituras que nos ajudam a entender quem somos através do que fomos.',
   curador,
   'Explorar a história humana por meio de obras que conectam passado e presente.',
   'Contextualize seus comentários. Evite anacronismos. Curiosidade é sempre bem-vinda.',
   'continuo', 0, true, 'historia', 'publico'),

  (clube_negocios, 'Clube de Negócios',
   'Estratégia, liderança, empreendedorismo e inovação. Leituras para quem quer entender e transformar o mundo dos negócios.',
   curador,
   'Compartilhar aprendizados práticos e estratégicos das melhores obras sobre negócios e gestão.',
   'Aplique o que leu. Compartilhe experiências reais. Troque perspectivas com generosidade.',
   'continuo', 0, true, 'negocios', 'publico'),

  (clube_autoajuda, 'Clube de Desenvolvimento Pessoal',
   'Hábitos, mentalidade, propósito e bem-estar. Livros que ajudam a construir uma vida mais plena e intencional.',
   curador,
   'Apoiar o crescimento pessoal dos membros através de leituras transformadoras.',
   'Compartilhe suas reflexões com autenticidade. Respeite o ritmo de cada um.',
   'continuo', 0, true, 'desenvolvimento', 'publico'),

  (clube_infantil, 'Clube Infantojuvenil',
   'Aventuras, fantasia e descobertas para crianças e jovens. Um espaço onde a imaginação não tem limites.',
   curador,
   'Incentivar o hábito da leitura nas novas gerações com obras clássicas e contemporâneas.',
   'Mantenha o ambiente leve e acolhedor. Sugestões de pais e responsáveis são bem-vindas.',
   'continuo', 0, true, 'infantojuvenil', 'publico'),

  (clube_biografia, 'Clube de Biografias',
   'Vidas que inspiram, ensinam e surpreendem. Conheça as histórias reais por trás de pessoas extraordinárias.',
   curador,
   'Aprender com trajetórias humanas reais, descobrindo padrões, erros e conquistas de pessoas notáveis.',
   'Contextualize a época de cada personagem. Respeite diferentes legados. Traga sua perspectiva.',
   'continuo', 0, true, 'biografia', 'publico');

  -- =====================
  -- TRILHAS DE LEITURA
  -- =====================

  -- Ficção
  INSERT INTO clube_trilhas (clube_id, obra_id, ordem) VALUES
  (clube_ficcao, '2cf02c1d-ec98-4f6e-a8b8-60d7e4da5d7e', 1), -- A Biblioteca da Meia-Noite
  (clube_ficcao, '301b12cf-de00-404f-a6f5-cc08a94f2b10', 2), -- A Criada
  (clube_ficcao, 'ee9b8beb-6cb3-4dd0-909d-84ddf1e44419', 3); -- A Divina Comédia

  -- Filosofia
  INSERT INTO clube_trilhas (clube_id, obra_id, ordem) VALUES
  (clube_filosofia, '00c54f6e-924e-473b-bd02-be13c0037003', 1), -- A República
  (clube_filosofia, 'b3b794ee-8e9e-4d5c-8ca9-349481112e71', 2), -- Sobre a brevidade da vida
  (clube_filosofia, '950aa95d-5295-4139-99d3-53bb45ce318a', 3); -- O homem revoltado

  -- História
  INSERT INTO clube_trilhas (clube_id, obra_id, ordem) VALUES
  (clube_historia, '79cf35e3-f264-4402-bda0-79f430c3a1bb', 1), -- Meditações - Marco Aurélio
  (clube_historia, 'f9461f93-a000-4b37-9606-cca5d844e6d8', 2), -- A Vida na Antiga Grécia
  (clube_historia, '675faee0-9cf0-46c7-a9b1-bd4229ecefc3', 3); -- Qual o valor da história hoje?

  -- Negócios
  INSERT INTO clube_trilhas (clube_id, obra_id, ordem) VALUES
  (clube_negocios, '6e1eb1ec-ea2c-4d5a-86c0-201d1e293f15', 1), -- A Estratégia Oceano Azul
  (clube_negocios, 'a9d3b10f-cb52-4adf-9597-087c7f4b22f1', 2), -- 10x é mais fácil que 2x
  (clube_negocios, 'a2d4af29-12c8-49a3-b10a-c26845bb1b19', 3); -- A lógica do Cisne Negro

  -- Autoajuda / Desenvolvimento
  INSERT INTO clube_trilhas (clube_id, obra_id, ordem) VALUES
  (clube_autoajuda, 'ceced20b-5fd8-462c-a5c9-8a021114b66f', 1), -- Hábitos Atômicos
  (clube_autoajuda, '560ea55b-a7b6-4fc6-bb76-d39997351f4b', 2), -- Ikigai
  (clube_autoajuda, '2eda225c-ef08-4ae3-8c81-e98899027d5e', 3); -- Disciplina é destino

  -- Infantojuvenil
  INSERT INTO clube_trilhas (clube_id, obra_id, ordem) VALUES
  (clube_infantil, 'bc899f19-659c-431d-9fa9-676d6e0351be', 1), -- O Pequeno Príncipe
  (clube_infantil, '1e89910e-a637-4190-a908-a7a261422c39', 2), -- Alice no País das Maravilhas
  (clube_infantil, 'e41b1ba2-cac8-4958-9f3e-e2df9edf0597', 3); -- As Viagens de Gulliver

  -- Biografia
  INSERT INTO clube_trilhas (clube_id, obra_id, ordem) VALUES
  (clube_biografia, 'ce3cadeb-5a59-49b3-a2f7-e153537cec15', 1), -- Em busca de sentido
  (clube_biografia, '20ae6a2e-dccc-4f22-90c3-f49577967cb5', 2), -- Ainda Estou Aqui
  (clube_biografia, '874cabb4-33b3-4a24-8a98-c666896f6fee', 3); -- Autobiografia de Agatha Christie

END $$;
