import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Retorna o início da semana no padrão brasileiro (segunda-feira).
 * getDay(): 0=Domingo, 1=Segunda, ..., 6=Sábado
 * Para segunda como início: offset = (getDay() + 6) % 7
 */
export function getWeekStart(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dayOfWeek = d.getDay(); // 0=Dom, 1=Seg, ..., 6=Sab
  const offsetToMonday = (dayOfWeek + 6) % 7; // 0 se já é segunda
  d.setDate(d.getDate() - offsetToMonday);
  return d;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
