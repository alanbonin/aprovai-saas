"use client";
import { useState } from "react";
import { SubjectSelector } from "./subject-selector";
import { WorkspaceMain } from "./workspace-main";
import { MentorProativo } from "./mentor-proativo";

interface Agent {
  id: string; name: string; description: string;
  area?: string | null; categoria: string | null; banca: string | null;
  color: string; systemPrompt: string; isPremium?: boolean; avatar?: string | null;
}

interface Profile {
  id: string; cargo: string | null; orgao: string | null;
  dataProva: string | null; dificuldades: string | null;
  onboardingDone: boolean;
}

interface Subject {
  id: string; name: string; slug: string; description?: string;
}

interface Props {
  agents: Agent[];
  allAgents: Agent[];
  activeAgentIds: string[];
  maxAgents: number;
  profile: Profile | null;
  subjects: Subject[];
  userId: string;
  aiCreditsTotal: number;
  subscriptionEndDate?: string | null;
  isPremium?: boolean;
  isExpired?: boolean;
}

export function WorkspaceShell({
  agents, allAgents, activeAgentIds, maxAgents,
  profile: initialProfile, subjects: initialSubjects,
  userId, aiCreditsTotal, subscriptionEndDate, isPremium, isExpired,
}: Props) {
  const [subjects, setSubjects] = useState(initialSubjects);
  // onboarding agora ocorre em /onboarding — workspace só recebe usuários com onboardingDone=true
  const [step, setStep] = useState<"subject-select" | "workspace">(
    initialSubjects.length === 0 ? "subject-select" : "workspace"
  );

  function onSubjectsConfirmed(confirmedSubjects: Subject[]) {
    setSubjects(confirmedSubjects);
    setStep("workspace");
  }

  if (step === "subject-select") {
    return (
      <SubjectSelector
        userId={userId}
        profile={initialProfile!}
        onConfirm={onSubjectsConfirmed}
      />
    );
  }

  return (
    <>
      <WorkspaceMain
        agents={agents}
        allAgents={allAgents}
        activeAgentIds={activeAgentIds}
        maxAgents={maxAgents}
        subjects={subjects}
        profile={initialProfile!}
        userId={userId}
        aiCreditsTotal={aiCreditsTotal}
        subscriptionEndDate={subscriptionEndDate}
        isPremium={isPremium ?? false}
        isExpired={isExpired ?? false}
      />
      {/* Mentor proativo — banner flutuante contextual */}
      <MentorProativo />
    </>
  );
}
