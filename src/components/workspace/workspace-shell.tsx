"use client";
import { useState } from "react";
import { OnboardingChat } from "./onboarding-chat";
import { SubjectSelector } from "./subject-selector";
import { WorkspaceMain } from "./workspace-main";

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
  const [profile, setProfile] = useState(initialProfile);
  const [subjects, setSubjects] = useState(initialSubjects);
  const [step, setStep] = useState<"onboarding" | "subject-select" | "workspace">(
    !initialProfile?.onboardingDone ? "onboarding"
    : initialSubjects.length === 0 ? "subject-select"
    : "workspace"
  );

  function onOnboardingComplete(newProfile: Profile, suggestedSubjects: Subject[]) {
    setProfile(newProfile);
    void suggestedSubjects;
    setStep("subject-select");
  }

  function onSubjectsConfirmed(confirmedSubjects: Subject[]) {
    setSubjects(confirmedSubjects);
    setStep("workspace");
  }

  if (step === "onboarding") {
    return (
      <OnboardingChat
        agents={agents}
        userId={userId}
        aiCreditsTotal={aiCreditsTotal}
        onComplete={onOnboardingComplete}
      />
    );
  }

  if (step === "subject-select") {
    return (
      <SubjectSelector
        userId={userId}
        profile={profile!}
        onConfirm={onSubjectsConfirmed}
      />
    );
  }

  return (
    <WorkspaceMain
      agents={agents}
      allAgents={allAgents}
      activeAgentIds={activeAgentIds}
      maxAgents={maxAgents}
      subjects={subjects}
      profile={profile!}
      userId={userId}
      aiCreditsTotal={aiCreditsTotal}
      subscriptionEndDate={subscriptionEndDate}
      isPremium={isPremium ?? false}
      isExpired={isExpired ?? false}
    />
  );
}
