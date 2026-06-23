"use client";

import type { KanbanTask } from "@/lib/kanban";
import { ExpedientePdfSections } from "@/components/admin/ExpedientePdfSections";

export type ClientDocumentsProps = {
  task: KanbanTask;
};

/** Documentos PDF del expediente (levantamiento detallado + formal/taller). Reutiliza la misma UI que Confirmados e Inactivos. */
export function ClientDocuments({ task }: ClientDocumentsProps) {
  return <ExpedientePdfSections client={task} />;
}
