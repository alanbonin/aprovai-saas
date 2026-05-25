import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { SalaEstudos } from "./sala-client";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function SalaPage({ params }: Props) {
  const { code } = await params;
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Sala de Estudos ao Vivo" desc="Estude em tempo real com outros alunos do seu grupo." icon="🎯" />;
  return <SalaEstudos code={code.toUpperCase()} />;
}
