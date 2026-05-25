import { ArenaSala } from "./arena-sala-client";

interface Props {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ host?: string; qtd?: string; materia?: string; publica?: string; max?: string }>;
}

export default async function ArenaSalaPage({ params, searchParams }: Props) {
  const { code } = await params;
  const sp = await searchParams;
  return (
    <ArenaSala
      code={code.toUpperCase()}
      isHostParam={sp.host === "1"}
      qtdQuestoes={parseInt(sp.qtd ?? "10", 10)}
      materia={decodeURIComponent(sp.materia ?? "")}
      publica={sp.publica === "1"}
    />
  );
}
