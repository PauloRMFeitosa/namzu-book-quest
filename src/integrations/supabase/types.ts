export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      autores: {
        Row: {
          aliases: Json
          data_falecimento: string | null
          data_nascimento: string | null
          data_ultima_conciliacao: string | null
          descricao: string | null
          foto_url: string | null
          id: string
          nacionalidade: string | null
          nome_cadastro: string | null
          nome_completo: string
          nome_normalizado: string | null
          nome_ordenacao: string
          status_conciliacao: string
          tentativas_conciliacao: number
        }
        Insert: {
          aliases?: Json
          data_falecimento?: string | null
          data_nascimento?: string | null
          data_ultima_conciliacao?: string | null
          descricao?: string | null
          foto_url?: string | null
          id?: string
          nacionalidade?: string | null
          nome_cadastro?: string | null
          nome_completo: string
          nome_normalizado?: string | null
          nome_ordenacao: string
          status_conciliacao?: string
          tentativas_conciliacao?: number
        }
        Update: {
          aliases?: Json
          data_falecimento?: string | null
          data_nascimento?: string | null
          data_ultima_conciliacao?: string | null
          descricao?: string | null
          foto_url?: string | null
          id?: string
          nacionalidade?: string | null
          nome_cadastro?: string | null
          nome_completo?: string
          nome_normalizado?: string | null
          nome_ordenacao?: string
          status_conciliacao?: string
          tentativas_conciliacao?: number
        }
        Relationships: []
      }
      autores_candidatos_wikidata: {
        Row: {
          autor_id: string
          created_at: string
          dados_externos: Json
          data_falecimento: string | null
          data_nascimento: string | null
          descricao: string | null
          foto_url: string | null
          id: string
          nacionalidade: string | null
          nome: string
          qid: string
          score_namzu: number
          updated_at: string
          url_wikidata: string
        }
        Insert: {
          autor_id: string
          created_at?: string
          dados_externos: Json
          data_falecimento?: string | null
          data_nascimento?: string | null
          descricao?: string | null
          foto_url?: string | null
          id?: string
          nacionalidade?: string | null
          nome: string
          qid: string
          score_namzu: number
          updated_at?: string
          url_wikidata: string
        }
        Update: {
          autor_id?: string
          created_at?: string
          dados_externos?: Json
          data_falecimento?: string | null
          data_nascimento?: string | null
          descricao?: string | null
          foto_url?: string | null
          id?: string
          nacionalidade?: string | null
          nome?: string
          qid?: string
          score_namzu?: number
          updated_at?: string
          url_wikidata?: string
        }
        Relationships: [
          {
            foreignKeyName: "autores_candidatos_wikidata_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "autores"
            referencedColumns: ["id"]
          },
        ]
      }
      clube_canais: {
        Row: {
          clube_id: string | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number | null
          privado: boolean | null
          tipo: string | null
        }
        Insert: {
          clube_id?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number | null
          privado?: boolean | null
          tipo?: string | null
        }
        Update: {
          clube_id?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          privado?: boolean | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clube_canais_clube_id_fkey"
            columns: ["clube_id"]
            isOneToOne: false
            referencedRelation: "clubes"
            referencedColumns: ["id"]
          },
        ]
      }
      clube_conteudo_acessos: {
        Row: {
          acessado_em: string | null
          conteudo_id: string
          user_id: string
        }
        Insert: {
          acessado_em?: string | null
          conteudo_id: string
          user_id: string
        }
        Update: {
          acessado_em?: string | null
          conteudo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clube_conteudo_acessos_conteudo_id_fkey"
            columns: ["conteudo_id"]
            isOneToOne: false
            referencedRelation: "clube_conteudos"
            referencedColumns: ["id"]
          },
        ]
      }
      clube_conteudos: {
        Row: {
          clube_id: string
          created_at: string | null
          descricao: string | null
          id: string
          liberado_apos_dias: number | null
          ordem_liberacao: number
          tipo: string
          titulo: string
          url_conteudo: string
        }
        Insert: {
          clube_id: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          liberado_apos_dias?: number | null
          ordem_liberacao: number
          tipo: string
          titulo: string
          url_conteudo: string
        }
        Update: {
          clube_id?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          liberado_apos_dias?: number | null
          ordem_liberacao?: number
          tipo?: string
          titulo?: string
          url_conteudo?: string
        }
        Relationships: [
          {
            foreignKeyName: "clube_conteudos_clube_id_fkey"
            columns: ["clube_id"]
            isOneToOne: false
            referencedRelation: "clubes"
            referencedColumns: ["id"]
          },
        ]
      }
      clube_gamificacao: {
        Row: {
          clube_id: string
          nivel: number
          updated_at: string | null
          xp_proximo_nivel: number
          xp_total: number
        }
        Insert: {
          clube_id: string
          nivel?: number
          updated_at?: string | null
          xp_proximo_nivel?: number
          xp_total?: number
        }
        Update: {
          clube_id?: string
          nivel?: number
          updated_at?: string | null
          xp_proximo_nivel?: number
          xp_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "clube_gamificacao_clube_id_fkey"
            columns: ["clube_id"]
            isOneToOne: true
            referencedRelation: "clubes"
            referencedColumns: ["id"]
          },
        ]
      }
      clube_membros: {
        Row: {
          clube_id: string
          data_entrada: string | null
          papel: string
          status: string
          user_id: string
        }
        Insert: {
          clube_id: string
          data_entrada?: string | null
          papel?: string
          status?: string
          user_id: string
        }
        Update: {
          clube_id?: string
          data_entrada?: string | null
          papel?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clube_membros_clube_id_fkey"
            columns: ["clube_id"]
            isOneToOne: false
            referencedRelation: "clubes"
            referencedColumns: ["id"]
          },
        ]
      }
      clube_mensagens: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          editado: boolean | null
          id: string
          mensagem: string
          reply_to_id: string | null
          thread_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          editado?: boolean | null
          id?: string
          mensagem: string
          reply_to_id?: string | null
          thread_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          editado?: boolean | null
          id?: string
          mensagem?: string
          reply_to_id?: string | null
          thread_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clube_mensagens_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "clube_mensagens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clube_mensagens_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "clube_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      clube_metricas: {
        Row: {
          ativos_30d: number | null
          ativos_7d: number | null
          clube_id: string
          engagement_score: number | null
          membros_count: number | null
          profundidade_score: number | null
          retention_score: number | null
          updated_at: string | null
        }
        Insert: {
          ativos_30d?: number | null
          ativos_7d?: number | null
          clube_id: string
          engagement_score?: number | null
          membros_count?: number | null
          profundidade_score?: number | null
          retention_score?: number | null
          updated_at?: string | null
        }
        Update: {
          ativos_30d?: number | null
          ativos_7d?: number | null
          clube_id?: string
          engagement_score?: number | null
          membros_count?: number | null
          profundidade_score?: number | null
          retention_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clube_metricas_clube_id_fkey"
            columns: ["clube_id"]
            isOneToOne: true
            referencedRelation: "clubes"
            referencedColumns: ["id"]
          },
        ]
      }
      clube_post_curtidas: {
        Row: {
          created_at: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clube_post_curtidas_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "clube_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      clube_posts: {
        Row: {
          clube_id: string
          conteudo: string
          created_at: string | null
          curtidas_count: number | null
          id: string
          imagem_url: string | null
          is_destaque_curador: boolean | null
          obra_id: string | null
          parent_post_id: string | null
          tipo: string
          user_id: string
        }
        Insert: {
          clube_id: string
          conteudo: string
          created_at?: string | null
          curtidas_count?: number | null
          id?: string
          imagem_url?: string | null
          is_destaque_curador?: boolean | null
          obra_id?: string | null
          parent_post_id?: string | null
          tipo?: string
          user_id: string
        }
        Update: {
          clube_id?: string
          conteudo?: string
          created_at?: string | null
          curtidas_count?: number | null
          id?: string
          imagem_url?: string | null
          is_destaque_curador?: boolean | null
          obra_id?: string | null
          parent_post_id?: string | null
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clube_posts_clube_id_fkey"
            columns: ["clube_id"]
            isOneToOne: false
            referencedRelation: "clubes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clube_posts_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clube_posts_parent_post_id_fkey"
            columns: ["parent_post_id"]
            isOneToOne: false
            referencedRelation: "clube_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      clube_progresso: {
        Row: {
          capitulo_atual: string | null
          clube_id: string
          data_conclusao: string | null
          obra_id: string
          pagina_atual: number | null
          percentual: number | null
          status: string
          user_id: string
        }
        Insert: {
          capitulo_atual?: string | null
          clube_id: string
          data_conclusao?: string | null
          obra_id: string
          pagina_atual?: number | null
          percentual?: number | null
          status?: string
          user_id: string
        }
        Update: {
          capitulo_atual?: string | null
          clube_id?: string
          data_conclusao?: string | null
          obra_id?: string
          pagina_atual?: number | null
          percentual?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clube_progresso_clube_id_fkey"
            columns: ["clube_id"]
            isOneToOne: false
            referencedRelation: "clubes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clube_progresso_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      clube_tags: {
        Row: {
          clube_id: string
          tag_id: string
        }
        Insert: {
          clube_id: string
          tag_id: string
        }
        Update: {
          clube_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clube_tags_clube_id_fkey"
            columns: ["clube_id"]
            isOneToOne: false
            referencedRelation: "clubes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clube_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      clube_temporadas_ranking: {
        Row: {
          clube_id: string
          created_at: string | null
          id: string
          posicao: number | null
          semana_fim: string
          semana_inicio: string
          updated_at: string | null
          user_id: string
          xp_na_semana: number
        }
        Insert: {
          clube_id: string
          created_at?: string | null
          id?: string
          posicao?: number | null
          semana_fim: string
          semana_inicio: string
          updated_at?: string | null
          user_id: string
          xp_na_semana?: number
        }
        Update: {
          clube_id?: string
          created_at?: string | null
          id?: string
          posicao?: number | null
          semana_fim?: string
          semana_inicio?: string
          updated_at?: string | null
          user_id?: string
          xp_na_semana?: number
        }
        Relationships: [
          {
            foreignKeyName: "clube_temporadas_ranking_clube_id_fkey"
            columns: ["clube_id"]
            isOneToOne: false
            referencedRelation: "clubes"
            referencedColumns: ["id"]
          },
        ]
      }
      clube_threads: {
        Row: {
          canal_id: string | null
          created_at: string | null
          criado_por: string | null
          fixado: boolean | null
          id: string
          locked: boolean | null
          titulo: string
        }
        Insert: {
          canal_id?: string | null
          created_at?: string | null
          criado_por?: string | null
          fixado?: boolean | null
          id?: string
          locked?: boolean | null
          titulo: string
        }
        Update: {
          canal_id?: string | null
          created_at?: string | null
          criado_por?: string | null
          fixado?: boolean | null
          id?: string
          locked?: boolean | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "clube_threads_canal_id_fkey"
            columns: ["canal_id"]
            isOneToOne: false
            referencedRelation: "clube_canais"
            referencedColumns: ["id"]
          },
        ]
      }
      clube_trilhas: {
        Row: {
          clube_id: string
          data_fim_sugerida: string | null
          data_inicio_sugerida: string | null
          id: string
          obra_id: string
          ordem: number
        }
        Insert: {
          clube_id: string
          data_fim_sugerida?: string | null
          data_inicio_sugerida?: string | null
          id?: string
          obra_id: string
          ordem: number
        }
        Update: {
          clube_id?: string
          data_fim_sugerida?: string | null
          data_inicio_sugerida?: string | null
          id?: string
          obra_id?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "clube_trilhas_clube_id_fkey"
            columns: ["clube_id"]
            isOneToOne: false
            referencedRelation: "clubes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clube_trilhas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      clubes: {
        Row: {
          categoria: string | null
          created_at: string | null
          curador_id: string
          descricao: string | null
          duracao_tipo: string
          id: string
          imagem_capa_url: string | null
          is_ativo: boolean | null
          nome: string
          objetivo: string | null
          preco_centavos: number | null
          regras: string | null
          updated_at: string
          visibilidade: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          curador_id: string
          descricao?: string | null
          duracao_tipo?: string
          id?: string
          imagem_capa_url?: string | null
          is_ativo?: boolean | null
          nome: string
          objetivo?: string | null
          preco_centavos?: number | null
          regras?: string | null
          updated_at?: string
          visibilidade?: string
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          curador_id?: string
          descricao?: string | null
          duracao_tipo?: string
          id?: string
          imagem_capa_url?: string | null
          is_ativo?: boolean | null
          nome?: string
          objetivo?: string | null
          preco_centavos?: number | null
          regras?: string | null
          updated_at?: string
          visibilidade?: string
        }
        Relationships: []
      }
      conexoes: {
        Row: {
          created_at: string | null
          seguido_id: string
          seguidor_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          seguido_id: string
          seguidor_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          seguido_id?: string
          seguidor_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conexoes_seguido_id_fkey"
            columns: ["seguido_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conexoes_seguidor_id_fkey"
            columns: ["seguidor_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["user_id"]
          },
        ]
      }
      conquistas: {
        Row: {
          categoria: string | null
          codigo: string
          descricao: string
          icone_url: string | null
          id: string
          meta_categoria: string | null
          meta_valor: number | null
          nome: string
          raridade: string
          xp_recompensa: number | null
        }
        Insert: {
          categoria?: string | null
          codigo: string
          descricao: string
          icone_url?: string | null
          id?: string
          meta_categoria?: string | null
          meta_valor?: number | null
          nome: string
          raridade?: string
          xp_recompensa?: number | null
        }
        Update: {
          categoria?: string | null
          codigo?: string
          descricao?: string
          icone_url?: string | null
          id?: string
          meta_categoria?: string | null
          meta_valor?: number | null
          nome?: string
          raridade?: string
          xp_recompensa?: number | null
        }
        Relationships: []
      }
      convites: {
        Row: {
          clube_id: string | null
          codigo: string
          created_at: string | null
          criado_por: string | null
          expira_em: string | null
          id: string
          max_usos: number | null
          usos: number | null
        }
        Insert: {
          clube_id?: string | null
          codigo: string
          created_at?: string | null
          criado_por?: string | null
          expira_em?: string | null
          id?: string
          max_usos?: number | null
          usos?: number | null
        }
        Update: {
          clube_id?: string | null
          codigo?: string
          created_at?: string | null
          criado_por?: string | null
          expira_em?: string | null
          id?: string
          max_usos?: number | null
          usos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "convites_clube_id_fkey"
            columns: ["clube_id"]
            isOneToOne: false
            referencedRelation: "clubes"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_assinantes: {
        Row: {
          assinatura_id: string
          fim_em: string | null
          inicio_em: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          assinatura_id: string
          fim_em?: string | null
          inicio_em?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          assinatura_id?: string
          fim_em?: string | null
          inicio_em?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_assinantes_assinatura_id_fkey"
            columns: ["assinatura_id"]
            isOneToOne: false
            referencedRelation: "creator_assinaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_assinaturas: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          creator_id: string | null
          descricao: string | null
          id: string
          nome_plano: string
          periodo: string | null
          preco_centavos: number
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          creator_id?: string | null
          descricao?: string | null
          id?: string
          nome_plano: string
          periodo?: string | null
          preco_centavos: number
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          creator_id?: string | null
          descricao?: string | null
          id?: string
          nome_plano?: string
          periodo?: string | null
          preco_centavos?: number
        }
        Relationships: []
      }
      denuncias: {
        Row: {
          created_at: string | null
          denunciado_user_id: string | null
          denunciante_user_id: string | null
          entidade_id: string | null
          entidade_tipo: string | null
          id: string
          motivo: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          denunciado_user_id?: string | null
          denunciante_user_id?: string | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string
          motivo?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          denunciado_user_id?: string | null
          denunciante_user_id?: string | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string
          motivo?: string | null
          status?: string | null
        }
        Relationships: []
      }
      edicoes: {
        Row: {
          atualizado_em: string | null
          capa_url: string | null
          created_at: string | null
          editora: string
          fonte_dados: string
          formato: string
          id: string
          idioma: string
          isbn_13: string | null
          isbn10: string | null
          num_paginas: number | null
          obra_id: string
          preco_capa_centavos: number | null
          titulo_edicao: string
          updated_at: string | null
        }
        Insert: {
          atualizado_em?: string | null
          capa_url?: string | null
          created_at?: string | null
          editora: string
          fonte_dados?: string
          formato: string
          id?: string
          idioma?: string
          isbn_13?: string | null
          isbn10?: string | null
          num_paginas?: number | null
          obra_id: string
          preco_capa_centavos?: number | null
          titulo_edicao: string
          updated_at?: string | null
        }
        Update: {
          atualizado_em?: string | null
          capa_url?: string | null
          created_at?: string | null
          editora?: string
          fonte_dados?: string
          formato?: string
          id?: string
          idioma?: string
          isbn_13?: string | null
          isbn10?: string | null
          num_paginas?: number | null
          obra_id?: string
          preco_capa_centavos?: number | null
          titulo_edicao?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "edicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      edicoes_fontes_externas: {
        Row: {
          chave_externa: string | null
          created_at: string
          dados_externos: Json | null
          data_sincronizacao: string | null
          edicao_id: string
          fonte: string
          id: string
          identificador_externo: string
          updated_at: string
          url_externa: string | null
        }
        Insert: {
          chave_externa?: string | null
          created_at?: string
          dados_externos?: Json | null
          data_sincronizacao?: string | null
          edicao_id: string
          fonte: string
          id?: string
          identificador_externo: string
          updated_at?: string
          url_externa?: string | null
        }
        Update: {
          chave_externa?: string | null
          created_at?: string
          dados_externos?: Json | null
          data_sincronizacao?: string | null
          edicao_id?: string
          fonte?: string
          id?: string
          identificador_externo?: string
          updated_at?: string
          url_externa?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "edicoes_fontes_externas_edicao_id_fkey"
            columns: ["edicao_id"]
            isOneToOne: false
            referencedRelation: "edicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_participantes: {
        Row: {
          evento_id: string
          joined_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          evento_id: string
          joined_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          evento_id?: string
          joined_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evento_participantes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          clube_id: string | null
          created_at: string | null
          criador_id: string | null
          descricao: string | null
          fim_em: string | null
          gravado: boolean | null
          id: string
          inicio_em: string
          limite_participantes: number | null
          tipo: string | null
          titulo: string
          url_evento: string | null
        }
        Insert: {
          clube_id?: string | null
          created_at?: string | null
          criador_id?: string | null
          descricao?: string | null
          fim_em?: string | null
          gravado?: boolean | null
          id?: string
          inicio_em: string
          limite_participantes?: number | null
          tipo?: string | null
          titulo: string
          url_evento?: string | null
        }
        Update: {
          clube_id?: string | null
          created_at?: string | null
          criador_id?: string | null
          descricao?: string | null
          fim_em?: string | null
          gravado?: boolean | null
          id?: string
          inicio_em?: string
          limite_participantes?: number | null
          tipo?: string | null
          titulo?: string
          url_evento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_clube_id_fkey"
            columns: ["clube_id"]
            isOneToOne: false
            referencedRelation: "clubes"
            referencedColumns: ["id"]
          },
        ]
      }
      fontes_externas: {
        Row: {
          created_at: string
          dados_externos: Json | null
          data_sincronizacao: string | null
          entidade_id: string
          fonte: string
          id: string
          identificador_externo: string
          score_confianca: number | null
          tipo_entidade: Database["public"]["Enums"]["tipo_entidade_enum"]
          updated_at: string
          url_externa: string | null
        }
        Insert: {
          created_at?: string
          dados_externos?: Json | null
          data_sincronizacao?: string | null
          entidade_id: string
          fonte: string
          id?: string
          identificador_externo: string
          score_confianca?: number | null
          tipo_entidade: Database["public"]["Enums"]["tipo_entidade_enum"]
          updated_at?: string
          url_externa?: string | null
        }
        Update: {
          created_at?: string
          dados_externos?: Json | null
          data_sincronizacao?: string | null
          entidade_id?: string
          fonte?: string
          id?: string
          identificador_externo?: string
          score_confianca?: number | null
          tipo_entidade?: Database["public"]["Enums"]["tipo_entidade_enum"]
          updated_at?: string
          url_externa?: string | null
        }
        Relationships: []
      }
      gamificacao_perfis: {
        Row: {
          nivel: number
          streak_atual: number
          streak_freezes_disponiveis: number
          streak_freezes_usados_total: number
          streak_maximo: number
          ultima_atividade_date: string | null
          updated_at: string | null
          user_id: string
          xp_proximo_nivel: number
          xp_total: number
        }
        Insert: {
          nivel?: number
          streak_atual?: number
          streak_freezes_disponiveis?: number
          streak_freezes_usados_total?: number
          streak_maximo?: number
          ultima_atividade_date?: string | null
          updated_at?: string | null
          user_id: string
          xp_proximo_nivel?: number
          xp_total?: number
        }
        Update: {
          nivel?: number
          streak_atual?: number
          streak_freezes_disponiveis?: number
          streak_freezes_usados_total?: number
          streak_maximo?: number
          ultima_atividade_date?: string | null
          updated_at?: string | null
          user_id?: string
          xp_proximo_nivel?: number
          xp_total?: number
        }
        Relationships: []
      }
      gamificacao_xp_log: {
        Row: {
          acao: string
          clube_id: string | null
          created_at: string | null
          id: string
          referencia_id: string | null
          user_id: string
          xp_ganho: number
        }
        Insert: {
          acao: string
          clube_id?: string | null
          created_at?: string | null
          id?: string
          referencia_id?: string | null
          user_id: string
          xp_ganho: number
        }
        Update: {
          acao?: string
          clube_id?: string | null
          created_at?: string | null
          id?: string
          referencia_id?: string | null
          user_id?: string
          xp_ganho?: number
        }
        Relationships: [
          {
            foreignKeyName: "gamificacao_xp_log_clube_id_fkey"
            columns: ["clube_id"]
            isOneToOne: false
            referencedRelation: "clubes"
            referencedColumns: ["id"]
          },
        ]
      }
      generos: {
        Row: {
          created_at: string
          id: string
          nome: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      ia_interacoes: {
        Row: {
          contexto: Json | null
          created_at: string | null
          id: string
          input_text: string | null
          output_text: string | null
          tipo: string | null
          user_id: string | null
        }
        Insert: {
          contexto?: Json | null
          created_at?: string | null
          id?: string
          input_text?: string | null
          output_text?: string | null
          tipo?: string | null
          user_id?: string | null
        }
        Update: {
          contexto?: Json | null
          created_at?: string | null
          id?: string
          input_text?: string | null
          output_text?: string | null
          tipo?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      integracoes_execucoes: {
        Row: {
          created_at: string
          finalizado_em: string | null
          fonte: string
          id: string
          iniciado_em: string
          quantidade_erro: number
          quantidade_processada: number
          quantidade_solicitada: number
          quantidade_sucesso: number
          status: string
          tipo_processo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          finalizado_em?: string | null
          fonte: string
          id?: string
          iniciado_em?: string
          quantidade_erro?: number
          quantidade_processada?: number
          quantidade_solicitada?: number
          quantidade_sucesso?: number
          status?: string
          tipo_processo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          finalizado_em?: string | null
          fonte?: string
          id?: string
          iniciado_em?: string
          quantidade_erro?: number
          quantidade_processada?: number
          quantidade_solicitada?: number
          quantidade_sucesso?: number
          status?: string
          tipo_processo?: string
          updated_at?: string
        }
        Relationships: []
      }
      integracoes_execucoes_itens: {
        Row: {
          created_at: string
          dados_requisicao: Json | null
          dados_resposta: Json | null
          entidade_id: string
          execucao_id: string
          id: string
          mensagem: string | null
          nome_referencia: string
          processado_em: string
          status: string
          tipo_entidade: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dados_requisicao?: Json | null
          dados_resposta?: Json | null
          entidade_id: string
          execucao_id: string
          id?: string
          mensagem?: string | null
          nome_referencia: string
          processado_em?: string
          status: string
          tipo_entidade: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dados_requisicao?: Json | null
          dados_resposta?: Json | null
          entidade_id?: string
          execucao_id?: string
          id?: string
          mensagem?: string | null
          nome_referencia?: string
          processado_em?: string
          status?: string
          tipo_entidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integracoes_execucoes_itens_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "integracoes_execucoes"
            referencedColumns: ["id"]
          },
        ]
      }
      interesses: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          created_at: string | null
          descricao: string | null
          icone: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      interesses_generos: {
        Row: {
          created_at: string | null
          genero_id: string
          id: string
          interesse_id: string
          peso: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          genero_id: string
          id?: string
          interesse_id: string
          peso?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          genero_id?: string
          id?: string
          interesse_id?: string
          peso?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interesses_generos_genero_id_fkey"
            columns: ["genero_id"]
            isOneToOne: false
            referencedRelation: "generos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interesses_generos_interesse_id_fkey"
            columns: ["interesse_id"]
            isOneToOne: false
            referencedRelation: "interesses"
            referencedColumns: ["id"]
          },
        ]
      }
      leitura_aplicacoes: {
        Row: {
          created_at: string | null
          descricao: string
          id: string
          leitura_id: string | null
          plano_acao: Json | null
        }
        Insert: {
          created_at?: string | null
          descricao: string
          id?: string
          leitura_id?: string | null
          plano_acao?: Json | null
        }
        Update: {
          created_at?: string | null
          descricao?: string
          id?: string
          leitura_id?: string | null
          plano_acao?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "leitura_aplicacoes_leitura_id_fkey"
            columns: ["leitura_id"]
            isOneToOne: false
            referencedRelation: "leituras"
            referencedColumns: ["id"]
          },
        ]
      }
      leitura_citacoes: {
        Row: {
          created_at: string | null
          id: string
          leitura_id: string | null
          pagina: number | null
          texto: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          leitura_id?: string | null
          pagina?: number | null
          texto: string
        }
        Update: {
          created_at?: string | null
          id?: string
          leitura_id?: string | null
          pagina?: number | null
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "leitura_citacoes_leitura_id_fkey"
            columns: ["leitura_id"]
            isOneToOne: false
            referencedRelation: "leituras"
            referencedColumns: ["id"]
          },
        ]
      }
      leitura_conteudo: {
        Row: {
          conceito_principal: string | null
          created_at: string | null
          id: string
          leitura_id: string | null
          resumo: string | null
        }
        Insert: {
          conceito_principal?: string | null
          created_at?: string | null
          id?: string
          leitura_id?: string | null
          resumo?: string | null
        }
        Update: {
          conceito_principal?: string | null
          created_at?: string | null
          id?: string
          leitura_id?: string | null
          resumo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leitura_conteudo_leitura_id_fkey"
            columns: ["leitura_id"]
            isOneToOne: false
            referencedRelation: "leituras"
            referencedColumns: ["id"]
          },
        ]
      }
      leitura_links: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          leitura_id: string | null
          tipo: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          leitura_id?: string | null
          tipo?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          leitura_id?: string | null
          tipo?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "leitura_links_leitura_id_fkey"
            columns: ["leitura_id"]
            isOneToOne: false
            referencedRelation: "leituras"
            referencedColumns: ["id"]
          },
        ]
      }
      leitura_pos: {
        Row: {
          created_at: string | null
          ideia_principal: string | null
          leitura_id: string
          publica: boolean | null
          resenha: string | null
          resumo_geral: string | null
          tem_spoiler: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          ideia_principal?: string | null
          leitura_id: string
          publica?: boolean | null
          resenha?: string | null
          resumo_geral?: string | null
          tem_spoiler?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          ideia_principal?: string | null
          leitura_id?: string
          publica?: boolean | null
          resenha?: string | null
          resumo_geral?: string | null
          tem_spoiler?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leitura_pos_leitura_id_fkey"
            columns: ["leitura_id"]
            isOneToOne: true
            referencedRelation: "leituras"
            referencedColumns: ["id"]
          },
        ]
      }
      leitura_pre: {
        Row: {
          created_at: string | null
          dominio_previo: string | null
          intencao: string
          leitura_id: string
          observacao: string | null
        }
        Insert: {
          created_at?: string | null
          dominio_previo?: string | null
          intencao: string
          leitura_id: string
          observacao?: string | null
        }
        Update: {
          created_at?: string | null
          dominio_previo?: string | null
          intencao?: string
          leitura_id?: string
          observacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leitura_pre_leitura_id_fkey"
            columns: ["leitura_id"]
            isOneToOne: true
            referencedRelation: "leituras"
            referencedColumns: ["id"]
          },
        ]
      }
      leitura_progresso: {
        Row: {
          created_at: string | null
          data_registro: string | null
          id: string
          leitura_id: string | null
          paginas_lidas: number | null
          percentual_lido: number | null
          tempo_leitura_minutos: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data_registro?: string | null
          id?: string
          leitura_id?: string | null
          paginas_lidas?: number | null
          percentual_lido?: number | null
          tempo_leitura_minutos?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data_registro?: string | null
          id?: string
          leitura_id?: string | null
          paginas_lidas?: number | null
          percentual_lido?: number | null
          tempo_leitura_minutos?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leitura_progresso_leitura_id_fkey"
            columns: ["leitura_id"]
            isOneToOne: false
            referencedRelation: "leituras"
            referencedColumns: ["id"]
          },
        ]
      }
      leitura_resenha: {
        Row: {
          created_at: string
          id: string
          leitura_id: string | null
          nota: number | null
          obra_id: string
          tem_spoiler: boolean
          texto: string
          titulo: string | null
          updated_at: string
          user_id: string
          visibilidade: string
        }
        Insert: {
          created_at?: string
          id?: string
          leitura_id?: string | null
          nota?: number | null
          obra_id: string
          tem_spoiler?: boolean
          texto: string
          titulo?: string | null
          updated_at?: string
          user_id: string
          visibilidade?: string
        }
        Update: {
          created_at?: string
          id?: string
          leitura_id?: string | null
          nota?: number | null
          obra_id?: string
          tem_spoiler?: boolean
          texto?: string
          titulo?: string | null
          updated_at?: string
          user_id?: string
          visibilidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "leitura_resenha_leitura_id_fkey"
            columns: ["leitura_id"]
            isOneToOne: false
            referencedRelation: "leituras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leitura_resenha_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      leitura_tags: {
        Row: {
          created_at: string | null
          leitura_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          leitura_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          leitura_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leitura_tags_leitura_id_fkey"
            columns: ["leitura_id"]
            isOneToOne: false
            referencedRelation: "leituras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leitura_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      leituras: {
        Row: {
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          tipo: string
          updated_at: string | null
          user_id: string
          usuario_leitura_id: string | null
        }
        Insert: {
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          tipo: string
          updated_at?: string | null
          user_id: string
          usuario_leitura_id?: string | null
        }
        Update: {
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          tipo?: string
          updated_at?: string | null
          user_id?: string
          usuario_leitura_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leituras_usuario_leitura_id_fkey"
            columns: ["usuario_leitura_id"]
            isOneToOne: false
            referencedRelation: "usuario_leituras"
            referencedColumns: ["id"]
          },
        ]
      }
      livros_cache: {
        Row: {
          created_at: string | null
          google_volume_id: string | null
          isbn_13: string
          raw_json: Json | null
        }
        Insert: {
          created_at?: string | null
          google_volume_id?: string | null
          isbn_13: string
          raw_json?: Json | null
        }
        Update: {
          created_at?: string | null
          google_volume_id?: string | null
          isbn_13?: string
          raw_json?: Json | null
        }
        Relationships: []
      }
      matches_intelectuais: {
        Row: {
          compatibilidade: number | null
          created_at: string | null
          id: string
          motivos: Json | null
          status: string | null
          user_a: string | null
          user_b: string | null
        }
        Insert: {
          compatibilidade?: number | null
          created_at?: string | null
          id?: string
          motivos?: Json | null
          status?: string | null
          user_a?: string | null
          user_b?: string | null
        }
        Update: {
          compatibilidade?: number | null
          created_at?: string | null
          id?: string
          motivos?: Json | null
          status?: string | null
          user_a?: string | null
          user_b?: string | null
        }
        Relationships: []
      }
      microgrupo_membros: {
        Row: {
          joined_at: string | null
          microgrupo_id: string
          papel: string | null
          user_id: string
        }
        Insert: {
          joined_at?: string | null
          microgrupo_id: string
          papel?: string | null
          user_id: string
        }
        Update: {
          joined_at?: string | null
          microgrupo_id?: string
          papel?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "microgrupo_membros_microgrupo_id_fkey"
            columns: ["microgrupo_id"]
            isOneToOne: false
            referencedRelation: "microgrupos"
            referencedColumns: ["id"]
          },
        ]
      }
      microgrupos: {
        Row: {
          clube_id: string | null
          created_at: string | null
          criado_por: string | null
          descricao: string | null
          id: string
          limite_membros: number | null
          nome: string
          privado: boolean | null
          tipo: string | null
        }
        Insert: {
          clube_id?: string | null
          created_at?: string | null
          criado_por?: string | null
          descricao?: string | null
          id?: string
          limite_membros?: number | null
          nome: string
          privado?: boolean | null
          tipo?: string | null
        }
        Update: {
          clube_id?: string | null
          created_at?: string | null
          criado_por?: string | null
          descricao?: string | null
          id?: string
          limite_membros?: number | null
          nome?: string
          privado?: boolean | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "microgrupos_clube_id_fkey"
            columns: ["clube_id"]
            isOneToOne: false
            referencedRelation: "clubes"
            referencedColumns: ["id"]
          },
        ]
      }
      missoes: {
        Row: {
          ativo_ate: string
          ativo_de: string
          codigo: string
          descricao: string
          id: string
          meta_acao: string
          meta_valor: number
          tipo: string
          titulo: string
          xp_recompensa: number
        }
        Insert: {
          ativo_ate: string
          ativo_de: string
          codigo: string
          descricao: string
          id?: string
          meta_acao: string
          meta_valor: number
          tipo: string
          titulo: string
          xp_recompensa: number
        }
        Update: {
          ativo_ate?: string
          ativo_de?: string
          codigo?: string
          descricao?: string
          id?: string
          meta_acao?: string
          meta_valor?: number
          tipo?: string
          titulo?: string
          xp_recompensa?: number
        }
        Relationships: []
      }
      moderacao_logs: {
        Row: {
          acao: string
          created_at: string | null
          entidade_id: string | null
          entidade_tipo: string | null
          id: string
          moderador_id: string | null
          motivo: string | null
        }
        Insert: {
          acao: string
          created_at?: string | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string
          moderador_id?: string | null
          motivo?: string | null
        }
        Update: {
          acao?: string
          created_at?: string | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string
          moderador_id?: string | null
          motivo?: string | null
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          created_at: string | null
          id: string
          lida: boolean | null
          link_url: string | null
          mensagem: string
          referencia_id: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lida?: boolean | null
          link_url?: string | null
          mensagem: string
          referencia_id?: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lida?: boolean | null
          link_url?: string | null
          mensagem?: string
          referencia_id?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_autores: {
        Row: {
          autor_id: string
          funcao: string
          obra_id: string
          ordem: number | null
        }
        Insert: {
          autor_id: string
          funcao?: string
          obra_id: string
          ordem?: number | null
        }
        Update: {
          autor_id?: string
          funcao?: string
          obra_id?: string
          ordem?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "obra_autores_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "autores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_autores_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_generos: {
        Row: {
          created_at: string
          genero_id: string
          obra_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          genero_id: string
          obra_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          genero_id?: string
          obra_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_obra_generos_genero"
            columns: ["genero_id"]
            isOneToOne: false
            referencedRelation: "generos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_obra_generos_obra"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          ano_primeira_publicacao: number | null
          capa_padrao_url: string | null
          created_at: string | null
          id: string
          idioma_original: string
          metadata_checked_at: string | null
          metadata_score: number | null
          metadata_source: string | null
          sinopse_padrao: string | null
          slug: string
          titulo_ordenacao: string
          titulo_original: string
          updated_at: string | null
        }
        Insert: {
          ano_primeira_publicacao?: number | null
          capa_padrao_url?: string | null
          created_at?: string | null
          id?: string
          idioma_original?: string
          metadata_checked_at?: string | null
          metadata_score?: number | null
          metadata_source?: string | null
          sinopse_padrao?: string | null
          slug: string
          titulo_ordenacao: string
          titulo_original: string
          updated_at?: string | null
        }
        Update: {
          ano_primeira_publicacao?: number | null
          capa_padrao_url?: string | null
          created_at?: string | null
          id?: string
          idioma_original?: string
          metadata_checked_at?: string | null
          metadata_score?: number | null
          metadata_source?: string | null
          sinopse_padrao?: string | null
          slug?: string
          titulo_ordenacao?: string
          titulo_original?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      obras_candidatos_wikidata: {
        Row: {
          ano_publicacao: number | null
          created_at: string
          dados_externos: Json
          descricao: string | null
          id: string
          idioma_original: string | null
          obra_id: string
          qid: string
          score_namzu: number
          titulo: string
          updated_at: string
          url_wikidata: string
        }
        Insert: {
          ano_publicacao?: number | null
          created_at?: string
          dados_externos?: Json
          descricao?: string | null
          id?: string
          idioma_original?: string | null
          obra_id: string
          qid: string
          score_namzu: number
          titulo: string
          updated_at?: string
          url_wikidata: string
        }
        Update: {
          ano_publicacao?: number | null
          created_at?: string
          dados_externos?: Json
          descricao?: string | null
          id?: string
          idioma_original?: string | null
          obra_id?: string
          qid?: string
          score_namzu?: number
          titulo?: string
          updated_at?: string
          url_wikidata?: string
        }
        Relationships: [
          {
            foreignKeyName: "obras_candidatos_wikidata_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obras_duplicadas: {
        Row: {
          analisado_em: string | null
          analisado_por: string | null
          created_at: string
          detalhes: Json | null
          id: string
          merge_automatico: boolean
          mesclado_em: string | null
          obra_a_id: string
          obra_b_id: string
          obra_maior_id: string
          obra_mantida_id: string | null
          obra_menor_id: string
          obra_removida_id: string | null
          observacao: string | null
          score_ano: number
          score_autor: number
          score_datas: number
          score_isbn: number
          score_paginas: number
          score_titulo: number
          score_total: number
          status: string
          updated_at: string
          versao_algoritmo: string | null
        }
        Insert: {
          analisado_em?: string | null
          analisado_por?: string | null
          created_at?: string
          detalhes?: Json | null
          id?: string
          merge_automatico?: boolean
          mesclado_em?: string | null
          obra_a_id: string
          obra_b_id: string
          obra_maior_id: string
          obra_mantida_id?: string | null
          obra_menor_id: string
          obra_removida_id?: string | null
          observacao?: string | null
          score_ano?: number
          score_autor?: number
          score_datas?: number
          score_isbn?: number
          score_paginas?: number
          score_titulo?: number
          score_total?: number
          status?: string
          updated_at?: string
          versao_algoritmo?: string | null
        }
        Update: {
          analisado_em?: string | null
          analisado_por?: string | null
          created_at?: string
          detalhes?: Json | null
          id?: string
          merge_automatico?: boolean
          mesclado_em?: string | null
          obra_a_id?: string
          obra_b_id?: string
          obra_maior_id?: string
          obra_mantida_id?: string | null
          obra_menor_id?: string
          obra_removida_id?: string | null
          observacao?: string | null
          score_ano?: number
          score_autor?: number
          score_datas?: number
          score_isbn?: number
          score_paginas?: number
          score_titulo?: number
          score_total?: number
          status?: string
          updated_at?: string
          versao_algoritmo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obras_duplicadas_obra_a_id_fkey"
            columns: ["obra_a_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_duplicadas_obra_b_id_fkey"
            columns: ["obra_b_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_duplicadas_obra_maior_id_fkey"
            columns: ["obra_maior_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_duplicadas_obra_mantida_id_fkey"
            columns: ["obra_mantida_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_duplicadas_obra_menor_id_fkey"
            columns: ["obra_menor_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_duplicadas_obra_removida_id_fkey"
            columns: ["obra_removida_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          created_at: string | null
          gateway: string | null
          gateway_transaction_id: string | null
          id: string
          referencia_id: string | null
          status: string | null
          tipo: string | null
          user_id: string | null
          valor_centavos: number
        }
        Insert: {
          created_at?: string | null
          gateway?: string | null
          gateway_transaction_id?: string | null
          id?: string
          referencia_id?: string | null
          status?: string | null
          tipo?: string | null
          user_id?: string | null
          valor_centavos: number
        }
        Update: {
          created_at?: string | null
          gateway?: string | null
          gateway_transaction_id?: string | null
          id?: string
          referencia_id?: string | null
          status?: string | null
          tipo?: string | null
          user_id?: string | null
          valor_centavos?: number
        }
        Relationships: []
      }
      perfil_interesses: {
        Row: {
          created_at: string | null
          interesse_id: string
          peso: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          interesse_id: string
          peso?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          interesse_id?: string
          peso?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfil_interesses_interesse_id_fkey"
            columns: ["interesse_id"]
            isOneToOne: false
            referencedRelation: "interesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfil_interesses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["user_id"]
          },
        ]
      }
      perfil_preferencias: {
        Row: {
          atualizado_em: string
          criado_em: string
          generos: string[]
          livros_amados: string[]
          objetivo: string | null
          ritmo: string | null
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          generos?: string[]
          livros_amados?: string[]
          objetivo?: string | null
          ritmo?: string | null
          user_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          generos?: string[]
          livros_amados?: string[]
          objetivo?: string | null
          ritmo?: string | null
          user_id?: string
        }
        Relationships: []
      }
      perfis: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          cidade: string | null
          created_at: string | null
          instagram_url: string | null
          mostrar_biblioteca: boolean
          mostrar_conquistas: boolean
          mostrar_estatisticas: boolean
          mostrar_insights: boolean
          nivel_intelectual: number | null
          nome_exibicao: string
          onboarding_completo: boolean
          pais: string | null
          perfil_publico: boolean
          score_consistencia: number | null
          score_empatia: number | null
          score_reputacao: number | null
          score_social: number | null
          site_url: string | null
          slug: string | null
          termos_aceitos_em: string | null
          tiktok_url: string | null
          tipo_perfil: string
          updated_at: string | null
          user_id: string
          username: string
          verificado: boolean | null
          youtube_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          cidade?: string | null
          created_at?: string | null
          instagram_url?: string | null
          mostrar_biblioteca?: boolean
          mostrar_conquistas?: boolean
          mostrar_estatisticas?: boolean
          mostrar_insights?: boolean
          nivel_intelectual?: number | null
          nome_exibicao: string
          onboarding_completo?: boolean
          pais?: string | null
          perfil_publico?: boolean
          score_consistencia?: number | null
          score_empatia?: number | null
          score_reputacao?: number | null
          score_social?: number | null
          site_url?: string | null
          slug?: string | null
          termos_aceitos_em?: string | null
          tiktok_url?: string | null
          tipo_perfil?: string
          updated_at?: string | null
          user_id: string
          username: string
          verificado?: boolean | null
          youtube_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          cidade?: string | null
          created_at?: string | null
          instagram_url?: string | null
          mostrar_biblioteca?: boolean
          mostrar_conquistas?: boolean
          mostrar_estatisticas?: boolean
          mostrar_insights?: boolean
          nivel_intelectual?: number | null
          nome_exibicao?: string
          onboarding_completo?: boolean
          pais?: string | null
          perfil_publico?: boolean
          score_consistencia?: number | null
          score_empatia?: number | null
          score_reputacao?: number | null
          score_social?: number | null
          site_url?: string | null
          slug?: string | null
          termos_aceitos_em?: string | null
          tiktok_url?: string | null
          tipo_perfil?: string
          updated_at?: string | null
          user_id?: string
          username?: string
          verificado?: boolean | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      reacoes: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          mensagem_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          mensagem_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          mensagem_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reacoes_mensagem_id_fkey"
            columns: ["mensagem_id"]
            isOneToOne: false
            referencedRelation: "clube_mensagens"
            referencedColumns: ["id"]
          },
        ]
      }
      reputacao_logs: {
        Row: {
          created_at: string | null
          id: string
          origem: string
          referencia_id: string | null
          score: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          origem: string
          referencia_id?: string | null
          score: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          origem?: string
          referencia_id?: string | null
          score?: number
          user_id?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          last_seen: string | null
          online_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          last_seen?: string | null
          online_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          last_seen?: string | null
          online_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuario_conquistas: {
        Row: {
          conquista_id: string
          desbloqueado_em: string | null
          user_id: string
        }
        Insert: {
          conquista_id: string
          desbloqueado_em?: string | null
          user_id: string
        }
        Update: {
          conquista_id?: string
          desbloqueado_em?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_conquistas_conquista_id_fkey"
            columns: ["conquista_id"]
            isOneToOne: false
            referencedRelation: "conquistas"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_leituras: {
        Row: {
          clube_id: string | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          nota: number | null
          status: string
          tipo_origem: string
          updated_at: string | null
          usuario_livro_id: string
        }
        Insert: {
          clube_id?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          nota?: number | null
          status?: string
          tipo_origem?: string
          updated_at?: string | null
          usuario_livro_id: string
        }
        Update: {
          clube_id?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          nota?: number | null
          status?: string
          tipo_origem?: string
          updated_at?: string | null
          usuario_livro_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_leituras_clube_id_fkey"
            columns: ["clube_id"]
            isOneToOne: false
            referencedRelation: "clubes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_leituras_usuario_livro_id_fkey"
            columns: ["usuario_livro_id"]
            isOneToOne: false
            referencedRelation: "usuario_livros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_leituras_usuario_livro_id_fkey"
            columns: ["usuario_livro_id"]
            isOneToOne: false
            referencedRelation: "vw_livros_lendo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_leituras_usuario_livro_id_fkey"
            columns: ["usuario_livro_id"]
            isOneToOne: false
            referencedRelation: "vw_ultimos_lidos"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_livro_avaliacao: {
        Row: {
          created_at: string
          dispensado_em: string | null
          notificacao_enviada: boolean
          notificacao_enviada_em: string | null
          status: Database["public"]["Enums"]["status_avaliacao_tipo"]
          updated_at: string
          usuario_livro_id: string
        }
        Insert: {
          created_at?: string
          dispensado_em?: string | null
          notificacao_enviada?: boolean
          notificacao_enviada_em?: string | null
          status?: Database["public"]["Enums"]["status_avaliacao_tipo"]
          updated_at?: string
          usuario_livro_id: string
        }
        Update: {
          created_at?: string
          dispensado_em?: string | null
          notificacao_enviada?: boolean
          notificacao_enviada_em?: string | null
          status?: Database["public"]["Enums"]["status_avaliacao_tipo"]
          updated_at?: string
          usuario_livro_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_livro_avaliacao_usuario_livro_id_fkey"
            columns: ["usuario_livro_id"]
            isOneToOne: true
            referencedRelation: "usuario_livros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_livro_avaliacao_usuario_livro_id_fkey"
            columns: ["usuario_livro_id"]
            isOneToOne: true
            referencedRelation: "vw_livros_lendo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_livro_avaliacao_usuario_livro_id_fkey"
            columns: ["usuario_livro_id"]
            isOneToOne: true
            referencedRelation: "vw_ultimos_lidos"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_livros: {
        Row: {
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          edicao_id: string
          favorito: boolean | null
          id: string
          nota: number | null
          obra_id: string
          review_texto: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          edicao_id: string
          favorito?: boolean | null
          id?: string
          nota?: number | null
          obra_id: string
          review_texto?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          edicao_id?: string
          favorito?: boolean | null
          id?: string
          nota?: number | null
          obra_id?: string
          review_texto?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_livros_edicao_id_fkey"
            columns: ["edicao_id"]
            isOneToOne: false
            referencedRelation: "edicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_livros_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_missoes: {
        Row: {
          concluida: boolean | null
          concluida_em: string | null
          data: string
          missao_id: string
          progresso_atual: number | null
          user_id: string
        }
        Insert: {
          concluida?: boolean | null
          concluida_em?: string | null
          data?: string
          missao_id: string
          progresso_atual?: number | null
          user_id: string
        }
        Update: {
          concluida?: boolean | null
          concluida_em?: string | null
          data?: string
          missao_id?: string
          progresso_atual?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_missoes_missao_id_fkey"
            columns: ["missao_id"]
            isOneToOne: false
            referencedRelation: "missoes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      pendencias_avaliacao_home: {
        Row: {
          avaliacao_criada_em: string | null
          capa_padrao_url: string | null
          data_conclusao: string | null
          dispensado_em: string | null
          obra_id: string | null
          status_avaliacao:
            | Database["public"]["Enums"]["status_avaliacao_tipo"]
            | null
          titulo_original: string | null
          total_pendencias: number | null
          user_id: string | null
          usuario_livro_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuario_livro_avaliacao_usuario_livro_id_fkey"
            columns: ["usuario_livro_id"]
            isOneToOne: true
            referencedRelation: "usuario_livros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_livro_avaliacao_usuario_livro_id_fkey"
            columns: ["usuario_livro_id"]
            isOneToOne: true
            referencedRelation: "vw_livros_lendo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_livro_avaliacao_usuario_livro_id_fkey"
            columns: ["usuario_livro_id"]
            isOneToOne: true
            referencedRelation: "vw_ultimos_lidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_livros_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      ranking_clube: {
        Row: {
          clube_id: string | null
          nivel: number | null
          posicao: number | null
          streak_atual: number | null
          user_id: string | null
          xp_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clube_membros_clube_id_fkey"
            columns: ["clube_id"]
            isOneToOne: false
            referencedRelation: "clubes"
            referencedColumns: ["id"]
          },
        ]
      }
      v_seguidores: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          nome_exibicao: string | null
          seguidor_id: string | null
          slug: string | null
          username: string | null
          usuario_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conexoes_seguido_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conexoes_seguidor_id_fkey"
            columns: ["seguidor_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["user_id"]
          },
        ]
      }
      v_seguindo: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          nome_exibicao: string | null
          seguido_id: string | null
          slug: string | null
          username: string | null
          usuario_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conexoes_seguido_id_fkey"
            columns: ["seguido_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conexoes_seguidor_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["user_id"]
          },
        ]
      }
      vw_livros_lendo: {
        Row: {
          data_fim: string | null
          data_inicio: string | null
          edicao_id: string | null
          favorito: boolean | null
          id: string | null
          nota: number | null
          obra_id: string | null
          review_texto: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          data_fim?: string | null
          data_inicio?: string | null
          edicao_id?: string | null
          favorito?: boolean | null
          id?: string | null
          nota?: number | null
          obra_id?: string | null
          review_texto?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          data_fim?: string | null
          data_inicio?: string | null
          edicao_id?: string | null
          favorito?: boolean | null
          id?: string | null
          nota?: number | null
          obra_id?: string | null
          review_texto?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuario_livros_edicao_id_fkey"
            columns: ["edicao_id"]
            isOneToOne: false
            referencedRelation: "edicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_livros_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_ultimos_lidos: {
        Row: {
          data_fim: string | null
          data_inicio: string | null
          edicao_id: string | null
          favorito: boolean | null
          id: string | null
          nota: number | null
          obra_id: string | null
          review_texto: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuario_livros_edicao_id_fkey"
            columns: ["edicao_id"]
            isOneToOne: false
            referencedRelation: "edicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_livros_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      aceitar_termos: { Args: never; Returns: undefined }
      calcular_matches: { Args: { p_user_id?: string }; Returns: undefined }
      calcular_similaridade_obras: {
        Args: { p_obra_a: string; p_obra_b: string }
        Returns: {
          detalhes: Json
          merge_automatico: boolean
          score_ano: number
          score_autor: number
          score_datas: number
          score_isbn: number
          score_paginas: number
          score_titulo: number
          score_total: number
        }[]
      }
      calcular_streak_leitura: {
        Args: { _user_id: string }
        Returns: {
          atual: number
          maximo: number
        }[]
      }
      conceder_xp: {
        Args: {
          p_acao: string
          p_clube_id?: string
          p_ref_id?: string
          p_user_id: string
          p_xp: number
        }
        Returns: undefined
      }
      concluir_onboarding: { Args: never; Returns: undefined }
      creditar_xp_clube: {
        Args: { p_clube_id: string; p_user_id: string; p_xp: number }
        Returns: undefined
      }
      criar_usuario_leitura: {
        Args: {
          p_clube_id: string
          p_edicao_id: string
          p_obra_id: string
          p_tipo_origem: string
        }
        Returns: string
      }
      desbloquear_conquista: {
        Args: { p_codigo: string; p_user_id: string }
        Returns: undefined
      }
      desseguir_usuario: { Args: { p_seguido_id: string }; Returns: undefined }
      dispensar_avaliacao: {
        Args: { p_definitivo?: boolean; p_usuario_livro_id: string }
        Returns: undefined
      }
      fechar_liga_semanal: { Args: never; Returns: undefined }
      feed_atividade: {
        Args: { p_limite?: number }
        Returns: {
          ator_avatar: string
          ator_id: string
          ator_nome: string
          ator_username: string
          autor_id: string
          autor_nome: string
          ocorreu_em: string
          referencia_capa: string
          referencia_id: string
          referencia_nome: string
          tipo: string
        }[]
      }
      finalizar_leitura: {
        Args: { p_usuario_leitura_id: string }
        Returns: undefined
      }
      fn_renotificar_avaliacoes_dispensadas: { Args: never; Returns: undefined }
      get_atividade_leitura_anual: {
        Args: { p_user_id?: string }
        Returns: {
          dia: string
          total_paginas: number
        }[]
      }
      get_contagem_social: {
        Args: { p_user_id: string }
        Returns: {
          seguidores: number
          seguindo: number
        }[]
      }
      get_generos_lidos: {
        Args: { p_user_id?: string }
        Returns: {
          genero: string
          total: number
        }[]
      }
      get_livros_por_mes: {
        Args: { p_user_id?: string }
        Returns: {
          mes: string
          total: number
        }[]
      }
      get_meus_matches: {
        Args: { p_limite?: number }
        Returns: {
          avatar_url: string
          compatibilidade: number
          motivos: Json
          nome_exibicao: string
          outro_user_id: string
          total_lidos: number
          username: string
        }[]
      }
      get_minhas_citacoes: {
        Args: never
        Returns: {
          autor_nome: string
          created_at: string
          id: string
          obra_capa: string
          obra_id: string
          obra_titulo: string
          pagina: number
          texto: string
        }[]
      }
      get_progresso_lendo: {
        Args: never
        Returns: {
          percentual_lido: number
          usuario_livro_id: string
        }[]
      }
      get_stats_leitura: {
        Args: { p_user_id?: string }
        Returns: {
          paginas_estimadas: number
          streak_atual: number
          total_citacoes: number
          total_lidos: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      iniciar_leitura: {
        Args: { p_tipo: string; p_usuario_leitura_id: string }
        Returns: string
      }
      is_clube_curador: {
        Args: { _clube: string; _user: string }
        Returns: boolean
      }
      is_clube_membro: {
        Args: { _clube: string; _user: string }
        Returns: boolean
      }
      is_seguindo: { Args: { p_seguido_id: string }; Returns: boolean }
      match_clubes_por_gosto: {
        Args: { p_generos: string[]; p_objetivo: string }
        Returns: {
          categoria: string
          clube_id: string
          descricao: string
          nome: string
          score: number
        }[]
      }
      normalize_book_text: { Args: { input_text: string }; Returns: string }
      recalcular_meus_matches: { Args: never; Returns: undefined }
      refresh_ranking: { Args: never; Returns: undefined }
      registrar_progresso: {
        Args: { p_leitura_id: string; p_paginas: number; p_percentual: number }
        Returns: undefined
      }
      registrar_progresso_missao: {
        Args: { p_incremento?: number; p_meta_acao: string; p_user_id: string }
        Returns: undefined
      }
      seed_estante_inicial: { Args: { p_user_id: string }; Returns: undefined }
      seguir_usuario: { Args: { p_seguido_id: string }; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      texto_similarity: {
        Args: { texto_a: string; texto_b: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "user"
      feed_tipo:
        | "livro_adicionado"
        | "livro_iniciado"
        | "livro_concluido"
        | "conquista_desbloqueada"
      status_avaliacao_tipo:
        | "PENDENTE"
        | "AVALIADO"
        | "DISPENSADO_TEMPORARIO"
        | "DISPENSADO_DEFINITIVO"
      tipo_entidade_enum: "autor" | "obra" | "edicao" | "editora"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      feed_tipo: [
        "livro_adicionado",
        "livro_iniciado",
        "livro_concluido",
        "conquista_desbloqueada",
      ],
      status_avaliacao_tipo: [
        "PENDENTE",
        "AVALIADO",
        "DISPENSADO_TEMPORARIO",
        "DISPENSADO_DEFINITIVO",
      ],
      tipo_entidade_enum: ["autor", "obra", "edicao", "editora"],
    },
  },
} as const
