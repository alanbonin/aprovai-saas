"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Cargo } from "@/lib/cargos";
import {
  StepModalidade, StepCargo, StepEstado, StepTempo, StepGerando,
  GEN_STEPS_CONCURSO, GEN_STEPS_ENEM, GEN_STEPS_OAB,
  type Modalidade,
} from "@/app/onboarding/onboarding-client";

type WizardStep = "modalidade" | "cargo" | "estado" | "tempo" | "gerando" | "pronto";

interface Props {
  profileId: string;
  nomeUsuario: string;
  onClose: () => void;
  onDone: () => void;
}

export function CargoWizardModal({ profileId, nomeUsuario, onClose, onDone }: Props) {
  const [step, setStep] = useState<WizardStep>("modalidade");
  const [modalidade, setModalidade] = useState<Modalidade | null>(null);
  const [cargo, setCargo] = useState<Cargo | null>(null);
  const [estado, setEstado] = useState<string | null>(null);
  const [horasEstudo, setHorasEstudo] = useState<number | null>(null);
  const [genStep, setGenStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const stateRef = useRef({ modalidade, cargo, estado, horasEstudo });
  useEffect(() => { stateRef.current = { modalidade, cargo, estado, horasEstudo }; }, [modalidade, cargo, estado, horasEstudo]);

  const genSteps = modalidade === "ENEM" ? GEN_STEPS_ENEM : modalidade === "OAB" ? GEN_STEPS_OAB : GEN_STEPS_CONCURSO;

  const save = useCallback(async () => {
    setSaving(true);
    const { modalidade: m, cargo: c, estado: e, horasEstudo: h } = stateRef.current;

    for (let i = 0; i < genSteps.length; i++) {
      setGenStep(i);
      await new Promise(r => setTimeout(r, 1100));
    }

    let orgaoFinal = c?.orgao ?? null;
    if (c?.hasEstado && e && c.sigla) orgaoFinal = `${c.sigla}-${e}`;

    let categoria: string | null = null;
    if (m === "ENEM") categoria = "enem";
    else if (m === "OAB") categoria = "oab";
    else categoria = c?.categoria ?? null;

    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cargo: c?.nome ?? null,
        orgao: orgaoFinal,
        modalidade: m ?? "CONCURSO_PUBLICO",
        categoria,
        horasEstudo: h ? Math.round(h / 60) : null,
        updateProfileId: profileId,
        novoPerfil: false,
      }),
    });

    setSaving(false);
    setStep("pronto");
    setTimeout(() => onDone(), 1800);
  }, [profileId, genSteps, onDone]);

  useEffect(() => {
    if (step === "gerando") save();
  }, [step, save]);

  const content = (
    <div className="force-dark-theme fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm p-4" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.85)" }}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl relative"
        style={{ background: "radial-gradient(ellipse at 20% 20%, rgba(10,181,189,0.08) 0%, transparent 60%), #0a0d12", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {step !== "gerando" && step !== "pronto" && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="p-6">
          {step === "modalidade" && (
            <StepModalidade
              nome={nomeUsuario}
              modalidade={modalidade}
              onSelect={m => { setModalidade(m); setTimeout(() => setStep(m === "CONCURSO_PUBLICO" ? "cargo" : "tempo"), 300); }}
              onBack={onClose}
            />
          )}

          {step === "cargo" && (
            <StepCargo
              cargo={cargo}
              onSelect={c => { setCargo(c); setTimeout(() => setStep(c.hasEstado ? "estado" : "tempo"), 300); }}
              onBack={() => setStep("modalidade")}
            />
          )}

          {step === "estado" && (
            <StepEstado
              cargo={cargo}
              estado={estado}
              onSelect={e => { setEstado(e); setTimeout(() => setStep("tempo"), 300); }}
              onBack={() => setStep("cargo")}
            />
          )}

          {step === "tempo" && (
            <StepTempo
              horasEstudo={horasEstudo}
              error={null}
              onSelect={min => { setHorasEstudo(min); setTimeout(() => setStep("gerando"), 300); }}
              onBack={() => {
                if (modalidade === "CONCURSO_PUBLICO") {
                  setStep(cargo?.hasEstado ? "estado" : "cargo");
                } else {
                  setStep("modalidade");
                }
              }}
            />
          )}

          {step === "gerando" && (
            <StepGerando genStep={genStep} saving={saving} steps={genSteps} />
          )}

          {step === "pronto" && (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-6">
              <div className="w-20 h-20 rounded-full bg-[#0ab5bd]/20 border-2 border-[#0ab5bd]/50 flex items-center justify-center text-4xl">
                🎉
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Plano atualizado!</h2>
                <p className="text-sm text-gray-400">
                  {modalidade === "ENEM" ? "Matérias do ENEM configuradas." : modalidade === "OAB" ? "Matérias da OAB configuradas." : cargo ? `Matérias para ${cargo.nome} configuradas.` : "Seu plano foi atualizado."}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#0ab5bd]/20 border-2 border-[#0ab5bd] flex items-center justify-center">
                <Check className="w-6 h-6 text-[#0ab5bd]" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(content, document.body);
}
