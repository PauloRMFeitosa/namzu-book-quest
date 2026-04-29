import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GamificacaoTab } from "./tabs/GamificacaoTab";
import { UsuariosTab } from "./tabs/UsuariosTab";
import { LivrosTab } from "./tabs/LivrosTab";
import { AutoresTab } from "./tabs/AutoresTab";
import { ClubesTab } from "./tabs/ClubesTab";
import { MetasTab } from "./tabs/MetasTab";
import { ConquistasTab } from "./tabs/ConquistasTab";
import { VisibilidadeTab } from "./tabs/VisibilidadeTab";

const Admin = () => {
  const [tab, setTab] = useState("visibilidade");
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-primary">Administração</h1>
        <p className="text-sm text-muted-foreground">
          Gestão completa do NAMZU
        </p>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="overflow-x-auto -mx-4 px-4">
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="visibilidade">Visibilidade</TabsTrigger>
            <TabsTrigger value="gamificacao">Gamificação</TabsTrigger>
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            <TabsTrigger value="livros">Livros</TabsTrigger>
            <TabsTrigger value="autores">Autores</TabsTrigger>
            <TabsTrigger value="clubes">Clubes</TabsTrigger>
            <TabsTrigger value="metas">Metas</TabsTrigger>
            <TabsTrigger value="conquistas">Conquistas</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="visibilidade"><VisibilidadeTab /></TabsContent>
        <TabsContent value="gamificacao"><GamificacaoTab /></TabsContent>
        <TabsContent value="usuarios"><UsuariosTab /></TabsContent>
        <TabsContent value="livros"><LivrosTab /></TabsContent>
        <TabsContent value="autores"><AutoresTab /></TabsContent>
        <TabsContent value="clubes"><ClubesTab /></TabsContent>
        <TabsContent value="metas"><MetasTab /></TabsContent>
        <TabsContent value="conquistas"><ConquistasTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
