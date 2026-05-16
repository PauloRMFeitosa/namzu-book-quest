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
          id: string
          nome_completo: string
          nome_normalizado: string | null
          nome_ordenacao: string
        }
        Insert: {
          id?: string
          nome_completo: string
          nome_normalizado?: string | null
          nome_ordenacao: string
        }
        Update: {
          id?: string
          nome_completo?: string
          nome_normalizado?: string | null
          nome_ordenacao?: string
        }
        Relationships: []
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
          is_destaque_curador: boolean | null
          obra_id: string | null
          parent_post_id: string | null
          user_id: string
        }
        Insert: {
          clube_id: string
          conteudo: string
          created_at?: string | null
          curtidas_count?: number | null
          id?: string
          is_destaque_curador?: boolean | null
          obra_id?: string | null
          parent_post_id?: string | null
          user_id: string
        }
        Update: {
          clube_id?: string
          conteudo?: string
          created_at?: string | null
          curtidas_count?: number | null
          id?: string
          is_destaque_curador?: boolean | null
          obra_id?: string | null
          parent_post_id?: string | null
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
          codigo: string
          descricao: string
          icone_url: string | null
          id: string
          nome: string
          xp_recompensa: number | null
        }
        Insert: {
          codigo: string
          descricao: string
          icone_url?: string | null
          id?: string
          nome: string
          xp_recompensa?: number | null
        }
        Update: {
          codigo?: string
          descricao?: string
          icone_url?: string | null
          id?: string
          nome?: string
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
          editora: string
          fonte_dados: string
          formato: string
          id: string
          idioma: string
          isbn_13: string | null
          num_paginas: number | null
          obra_id: string
          preco_capa_centavos: number | null
          titulo_edicao: string
        }
        Insert: {
          atualizado_em?: string | null
          capa_url?: string | null
          editora: string
          fonte_dados?: string
          formato: string
          id?: string
          idioma?: string
          isbn_13?: string | null
          num_paginas?: number | null
          obra_id: string
          preco_capa_centavos?: number | null
          titulo_edicao: string
        }
        Update: {
          atualizado_em?: string | null
          capa_url?: string | null
          editora?: string
          fonte_dados?: string
          formato?: string
          id?: string
          idioma?: string
          isbn_13?: string | null
          num_paginas?: number | null
          obra_id?: string
          preco_capa_centavos?: number | null
          titulo_edicao?: string
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
      gamificacao_perfis: {
        Row: {
          nivel: number
          streak_atual: number
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
      interesses: {
        Row: {
          categoria: string | null
          created_at: string | null
          id: string
          nome: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          id?: string
          nome: string
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
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
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data_registro?: string | null
          id?: string
          leitura_id?: string | null
          paginas_lidas?: number | null
          percentual_lido?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data_registro?: string | null
          id?: string
          leitura_id?: string | null
          paginas_lidas?: number | null
          percentual_lido?: number | null
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
      obras: {
        Row: {
          ano_primeira_publicacao: number | null
          capa_padrao_url: string | null
          created_at: string | null
          id: string
          idioma_original: string
          sinopse_padrao: string | null
          slug: string
          titulo_ordenacao: string
          titulo_original: string
        }
        Insert: {
          ano_primeira_publicacao?: number | null
          capa_padrao_url?: string | null
          created_at?: string | null
          id?: string
          idioma_original?: string
          sinopse_padrao?: string | null
          slug: string
          titulo_ordenacao: string
          titulo_original: string
        }
        Update: {
          ano_primeira_publicacao?: number | null
          capa_padrao_url?: string | null
          created_at?: string | null
          id?: string
          idioma_original?: string
          sinopse_padrao?: string | null
          slug?: string
          titulo_ordenacao?: string
          titulo_original?: string
        }
        Relationships: []
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
          interesse_id: string
          peso: number | null
          user_id: string
        }
        Insert: {
          interesse_id: string
          peso?: number | null
          user_id: string
        }
        Update: {
          interesse_id?: string
          peso?: number | null
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
      perfis: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          cidade: string | null
          created_at: string | null
          instagram_url: string | null
          nivel_intelectual: number | null
          nome_exibicao: string
          pais: string | null
          score_consistencia: number | null
          score_empatia: number | null
          score_reputacao: number | null
          score_social: number | null
          site_url: string | null
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
          nivel_intelectual?: number | null
          nome_exibicao: string
          pais?: string | null
          score_consistencia?: number | null
          score_empatia?: number | null
          score_reputacao?: number | null
          score_social?: number | null
          site_url?: string | null
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
          nivel_intelectual?: number | null
          nome_exibicao?: string
          pais?: string | null
          score_consistencia?: number | null
          score_empatia?: number | null
          score_reputacao?: number | null
          score_social?: number | null
          site_url?: string | null
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
          id: string
          nome: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string | null
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
      usuario_livros: {
        Row: {
          data_fim: string | null
          data_inicio: string | null
          edicao_id: string | null
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
          data_fim?: string | null
          data_inicio?: string | null
          edicao_id?: string | null
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
          data_fim?: string | null
          data_inicio?: string | null
          edicao_id?: string | null
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
          missao_id: string
          progresso_atual: number | null
          user_id: string
        }
        Insert: {
          concluida?: boolean | null
          concluida_em?: string | null
          missao_id: string
          progresso_atual?: number | null
          user_id: string
        }
        Update: {
          concluida?: boolean | null
          concluida_em?: string | null
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
      criar_usuario_leitura: {
        Args: {
          p_clube_id: string
          p_edicao_id: string
          p_obra_id: string
          p_tipo_origem: string
        }
        Returns: string
      }
      dar_xp: {
        Args: {
          p_acao: string
          p_clube_id?: string
          p_ref_id?: string
          p_user_id: string
          p_xp: number
        }
        Returns: undefined
      }
      finalizar_leitura: {
        Args: { p_usuario_leitura_id: string }
        Returns: undefined
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
      refresh_ranking: { Args: never; Returns: undefined }
      registrar_progresso: {
        Args: { p_leitura_id: string; p_paginas: number; p_percentual: number }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    },
  },
} as const
