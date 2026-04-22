"use client";

import { useState } from "react";

type EntityOption = {
  id: string;
  nome: string;
};

type ProcessResult =
  | {
      ok: true;
      statementId: string;
      templateId: string;
      templateNome: string;
      insertedCount: number;
      skippedCount: number;
      transactionsParsed: number;
      issuesOpen: number;
    }
  | { ok: false; message: string; statementId?: string };

export function UploadForm({ entities }: { entities: EntityOption[] }) {
  const [entityId, setEntityId] = useState(entities[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!file || !entityId) return;

        setLoading(true);
        setResult(null);

        const formData = new FormData();
        formData.set("entityId", entityId);
        formData.set("file", file);
        formData.set("allowDuplicates", allowDuplicates ? "true" : "false");

        const res = await fetch("/api/process/pdf", {
          method: "POST",
          body: formData,
        });

        let json: ProcessResult;
        try {
          json = (await res.json()) as ProcessResult;
        } catch {
          json = {
            ok: false,
            message: `Falha ao processar (HTTP ${res.status}).`,
          };
        }

        if (!res.ok && json.ok) {
          json = { ok: false, message: `Falha ao processar (HTTP ${res.status}).` };
        }
        setResult(json);
        setLoading(false);
      }}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-900" htmlFor="entity">
            Entidade
          </label>
          <select
            id="entity"
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-0 focus:border-zinc-300"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            required
          >
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-900" htmlFor="pdf">
            PDF
          </label>
          <input
            id="pdf"
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-0 focus:border-zinc-300"
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="space-y-1">
          <div className="text-sm font-medium text-zinc-900">Permitir dados duplicados</div>
          <div className="text-sm text-zinc-600">
            Permite enviar o mesmo valor para o mesmo cliente no mesmo dia.
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={allowDuplicates}
          onClick={() => setAllowDuplicates((v) => !v)}
          className={`relative h-7 w-12 rounded-full border transition ${
            allowDuplicates ? "border-zinc-950 bg-zinc-950" : "border-zinc-200 bg-zinc-100"
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
              allowDuplicates ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </div>

      <button
        type="submit"
        disabled={loading || !entityId || !file}
        className="h-11 rounded-xl bg-zinc-950 px-4 text-sm font-medium text-white transition disabled:opacity-60"
      >
        {loading ? "Processando..." : "Processar"}
      </button>

      {result ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm">
          {"ok" in result && result.ok ? (
            <div className="space-y-1">
              <div className="font-medium text-zinc-900">
                Template: {result.templateNome}
              </div>
              <div className="text-zinc-600">
                Transações parseadas: {result.transactionsParsed}
              </div>
              <div className="text-zinc-600">
                Inseridas: {result.insertedCount} · Ignoradas (duplicadas):{" "}
                {result.skippedCount}
              </div>
              <div className="text-zinc-600">Pendências abertas: {result.issuesOpen}</div>
              <a
                className="inline-flex text-sm font-medium text-zinc-950 underline underline-offset-4"
                href={`/app/statements/${result.statementId}`}
              >
                Revisar extrato
              </a>
            </div>
          ) : (
            <div className="text-red-700">
              {"message" in result ? result.message : "Falha ao processar."}
            </div>
          )}
        </div>
      ) : null}
    </form>
  );
}
