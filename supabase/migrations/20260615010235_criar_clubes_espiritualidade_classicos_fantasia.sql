
DO $$
DECLARE
  curador UUID := 'a633d6a8-bf66-44f4-bdf2-df764e01fa0e'; -- paulormf@gmail.com

  clube_espiritualidade UUID := gen_random_uuid();
  clube_classicos       UUID := gen_random_uuid();
  clube_fantasia        UUID := gen_random_uuid();

BEGIN

  -- =====================
  -- CLUBES
  -- =====================
  INSERT INTO clubes (id, nome, descricao, curador_id, objetivo, regras, duracao_tipo, preco_centavos, is_ativo, categoria, visibilidade) VALUES

  (clube_espiritualidade,
   'Clube de Espiritualidade',
   'Um espaço para explorar o interior: meditação, consciência, propósito e a busca pelo sentido da existência. Aqui a espiritualidade é vivida com respeito a todas as tradições.',
   curador,
   'Aprofundar a vida interior e o autoconhecimento através de obras que tocam a alma.',
   'Respeite todas as crenças e tradições. Compartilhe com abertura e sem julgamento.',
   'continuo', 0, true, 'espiritualidade', 'publico'),

  (clube_classicos,
   'Clube dos Clássicos',
   'As obras que definiram a literatura mundial. De Tolstói a Machado de Assis, revisitamos os grandes clássicos com olhos contemporâneos.',
   curador,
   'Ler e redescobrir os grandes clássicos da literatura universal e brasileira.',
   'Contextualize a época da obra. Não há resposta errada — classicos são fontes inesgotáveis.',
   'continuo', 0, true, 'classicos', 'publico'),

  (clube_fantasia,
   'Clube de Fantasia',
   'Mundos mágicos, jornadas do herói e universos impossíveis. Para quem acredita que a fantasia revela verdades que o realismo não alcança.',
   curador,
   'Explorar o gênero fantástico e suas metáforas sobre a condição humana.',
   'Spoilers apenas com aviso. Toda teoria é bem-vinda. Imaginação não tem limite aqui.',
   'continuo', 0, true, 'fantasia', 'publico');

  -- =====================
  -- TRILHAS
  -- =====================

  -- Espiritualidade
  INSERT INTO clube_trilhas (clube_id, obra_id, ordem) VALUES
  (clube_espiritualidade, '53745c38-9c3c-433d-8cd7-602d685de755', 1), -- O Poder do Agora
  (clube_espiritualidade, '17b0ba80-d01b-46cb-8407-5f9d941282f6', 2), -- Um novo mundo
  (clube_espiritualidade, 'bf80f7ba-a428-4489-ae12-c41c1bed0db8', 3); -- A morada da alma

  -- Clássicos
  INSERT INTO clube_trilhas (clube_id, obra_id, ordem) VALUES
  (clube_classicos, '0b3f28cf-8e5a-4450-8b69-65cfc85db06e', 1), -- Dom Casmurro
  (clube_classicos, '197e2b10-1d13-4c00-a4a1-00ac68f901ce', 2), -- Guerra e Paz
  (clube_classicos, 'a16c8a4d-805b-4d45-8adf-28f66190b2a1', 3); -- Hamlet

  -- Fantasia
  INSERT INTO clube_trilhas (clube_id, obra_id, ordem) VALUES
  (clube_fantasia, '2fe43272-a024-441e-808d-8b497c46d8f3', 1), -- O Alquimista
  (clube_fantasia, '0805b09f-d694-4c2e-949f-3bc8f6a497cb', 2), -- A bruxa de Portobello
  (clube_fantasia, 'ee9b8beb-6cb3-4dd0-909d-84ddf1e44419', 3); -- A Divina Comédia

  -- =====================
  -- POSTS DE BOAS-VINDAS (curador = paulormf, destaque)
  -- =====================
  INSERT INTO clube_posts (clube_id, user_id, conteudo, is_destaque_curador) VALUES

  (clube_espiritualidade, curador,
   '🌿 Bem-vindos ao Clube de Espiritualidade!

Este espaço nasceu com uma intenção simples: criar um lugar onde a leitura vira prática, e a prática vira transformação.

Mas um clube de leitura só vive de verdade quando as pessoas falam. E é exatamente isso que peço a você: depois de cada capítulo, cada passagem que te tocou ou te incomodou — escreva aqui. Não precisa ser uma resenha elaborada. Pode ser uma frase, uma dúvida, uma lembrança que veio à tona.

Quando você registra suas impressões, duas coisas acontecem: você aprofunda o que leu, e oferece ao outro um espelho que ele talvez precise. Já descobri leituras inteiras dentro dos comentários de outros membros.

Começamos com *O Poder do Agora*, de Eckhart Tolle. Compartilhe o que ressoa em você. Estou aqui para ler cada palavra. 🙏',
   true),

  (clube_classicos, curador,
   '📖 Bem-vindos ao Clube dos Clássicos!

Há um mito perigoso sobre os clássicos: o de que eles existem para serem admirados de longe, como peças de museu. Discordo completamente.

Os clássicos resistiram ao tempo porque falam de algo que não muda: a experiência humana em sua forma mais honesta. Ciúme, poder, amor, traição, redenção — tudo está lá, escrito com uma precisão que a maioria da literatura contemporânea ainda não alcançou.

Por isso, quero te pedir uma coisa: não leia em silêncio. Anote, sublinhe, e principalmente — compartilhe aqui suas impressões. O que te surpreendeu? O que te irritou? Que personagem você reconheceu em alguém que conhece?

Começamos com *Dom Casmurro*. Capitu é culpada ou inocente? Não respondo — mas quero muito saber o que você pensa. 😄',
   true),

  (clube_fantasia, curador,
   '✨ Bem-vindos ao Clube de Fantasia!

Tem gente que acha que fantasia é fuga da realidade. Eu acho exatamente o contrário: é a única linguagem capaz de dizer certas verdades sem que a gente levante a guarda.

*O Alquimista* não é sobre um pastor espanhol. *A Divina Comédia* não é sobre um homem perdido numa floresta. São mapas internos. Alegorias da jornada que cada um de nós está fazendo — consciente ou não.

E é por isso que suas impressões importam tanto quanto o texto em si. Quando você escreve o que sentiu lendo, você completa a obra. O autor planta a semente, mas é o leitor que escolhe o solo.

Então escreva aqui: o que te chamou atenção? Que imagem ficou com você depois de fechar o livro? Que parte você releu sem querer?

Esse clube é feito de histórias dentro de histórias. A sua também faz parte. 🐉',
   true);

END $$;
