import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GenerosReprocessamento } from "./reprocessamento/GenerosReprocessamento";
import { AutoresReprocessamento } from "./reprocessamento/AutoresReprocessamento";

export const ReprocessamentoTab = () => {
  return (
    <div className="mt-4">
      <Tabs defaultValue="generos" className="w-full">
        <TabsList>
          <TabsTrigger value="generos">Gêneros</TabsTrigger>
          <TabsTrigger value="autores">Autores</TabsTrigger>
        </TabsList>
        <TabsContent value="generos" className="mt-4">
          <GenerosReprocessamento />
        </TabsContent>
        <TabsContent value="autores" className="mt-4">
          <AutoresReprocessamento />
        </TabsContent>
      </Tabs>
    </div>
  );
};
