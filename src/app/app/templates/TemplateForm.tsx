"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type TemplatePayload = {
  nome: string;
  identificador: string;
  regexData: string;
  regexValor: string;
  regexDescricao: string;
};

type Props = {
  mode: "create" | "edit";
  templateId?: string;
  initial: TemplatePayload;
};

function validateRegex(value: string) {
  try {
    new RegExp(value);
    return true;
  } catch {
    return false;
  }
}

export function TemplateForm({ mode, templateId, initial }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<TemplatePayload>(initial);
  const [sampleLine, setSampleLine] = useState("");

  const regexOk = useMemo(() => {
    return (
      validateRegex(form.regexData) &&
      validateRegex(form.regexValor) &&
      validateRegex(form.regexDescricao)
    );
  }, [form.regexData, form.regexDescricao, form.regexValor]);

  const testResult = useMemo(() => {
    if (!sampleLine.trim() || !regexOk) return null;
    try {
      const reData = new RegExp(form.regexData);
      const reValor = new RegExp(form.regexValor);
      const reDesc = new RegExp(form.regexDescricao);
      const mData = reData.exec(sampleLine);
      const mValor = reValor.exec(sampleLine);
      const mDesc = reDesc.exec(sampleLine);
      return {
        data: mData?.[1] ?? mData?.[0] ?? null,
        valor: mValor?.[1] ?? mValor?.[0] ?? null,
        descricao: mDesc?.[1] ?? mDesc?.[0] ?? null,
      };
    } catch {
      return null;
    }
  }, [form.regexData, form.regexDescricao, form.regexValor, regexOk, sampleLine]);

  return (
    <div className="space-y-6">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError(null);

          const url =
            mode === "create" ? "/api/templates" : `/api/templates/${templateId}`;
          const method = mode === "create" ? "POST" : "PATCH";

          const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });
          const json = (await res.json().catch(() => null)) as
            | { ok: true; id?: string }
            | { ok: false; message: string }
            | null;

          setSaving(false);

          if (!res.ok || !json || !json.ok) {
            setError((json && "message" in json ? json.message : null) ?? "Falha ao salvar.");
            return;
          }

          const id = mode === "create" ? json.id : templateId;
          router.push(`/app/templates/${id}`);
          router.refresh();
        }}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-900" htmlFor="nome">
              Nome
            </label>
            <input
              id="nome"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-0 focus:border-zinc-300"
              value={form.nome}
              onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-900" htmlFor="identificador">
              Identificador (detecção do banco)
            </label>
            <input
              id="identificador"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-0 focus:border-zinc-300"
              value={form.identificador}
              onChange={(e) => setForm((s) => ({ ...s, identificador: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-zinc-900">Regex</div>
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-900" htmlFor="regexData">
                regex_data
              </label>
              <textarea
                id="regexData"
                className="min-h-20 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-zinc-300"
                value={form.regexData}
                onChange={(e) => setForm((s) => ({ ...s, regexData: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-900" htmlFor="regexValor">
                regex_valor
              </label>
              <textarea
                id="regexValor"
                className="min-h-20 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-zinc-300"
                value={form.regexValor}
                onChange={(e) => setForm((s) => ({ ...s, regexValor: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-900" htmlFor="regexDescricao">
                regex_descricao
              </label>
              <textarea
                id="regexDescricao"
                className="min-h-24 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-zinc-300"
                value={form.regexDescricao}
                onChange={(e) => setForm((s) => ({ ...s, regexDescricao: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="text-xs text-zinc-500">
            Status das regex: {regexOk ? "válidas" : "inválidas"}
          </div>
        </div>

        {error ? <div className="text-sm text-red-700">{error}</div> : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="h-11 rounded-xl bg-zinc-950 px-4 text-sm font-medium text-white transition disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>

          {mode === "edit" ? (
            <button
              type="button"
              disabled={deleting}
              className="h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-950 transition hover:bg-zinc-50 disabled:opacity-60"
              onClick={async () => {
                setDeleting(true);
                setError(null);
                const res = await fetch(`/api/templates/${templateId}`, { method: "DELETE" });
                const json = (await res.json().catch(() => null)) as
                  | { ok: true }
                  | { ok: false; message: string }
                  | null;
                setDeleting(false);
                if (!res.ok || !json || !json.ok) {
                  setError((json && "message" in json ? json.message : null) ?? "Falha ao excluir.");
                  return;
                }
                router.push("/app/templates");
                router.refresh();
              }}
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </button>
          ) : null}
        </div>
      </form>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="text-sm font-medium text-zinc-950">Teste rápido</div>
        <div className="mt-1 text-xs text-zinc-500">Cole uma linha do extrato para validar as regex.</div>
        <textarea
          className="mt-3 min-h-24 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-zinc-300"
          value={sampleLine}
          onChange={(e) => setSampleLine(e.target.value)}
          placeholder="Ex.: 01/01/2026 Pix enviado - Fulano -R$ 10,00"
        />
        <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
          {testResult ? (
            <div className="space-y-1">
              <div>data: {String(testResult.data)}</div>
              <div>valor: {String(testResult.valor)}</div>
              <div>descricao: {String(testResult.descricao)}</div>
            </div>
          ) : (
            <div>Sem resultado.</div>
          )}
        </div>
      </div>
    </div>
  );
}

