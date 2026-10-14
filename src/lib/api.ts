"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Kesalahan API yang pesannya sudah berbahasa Indonesia dan aman ditampilkan. */
export class ApiClientError extends Error {
  fields: Record<string, string>;
  status: number;

  constructor(message: string, fields?: Record<string, string>, status = 400) {
    super(message);
    this.name = "ApiClientError";
    this.fields = fields ?? {};
    this.status = status;
  }
}

export type ApiOptions = { method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; body?: unknown };

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: options.method ?? "GET",
      headers: options.body === undefined ? { accept: "application/json" } : { "content-type": "application/json", accept: "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiClientError("Tidak dapat menghubungi server. Periksa koneksi internet Anda lalu coba lagi.", {}, 0);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      throw new ApiClientError("Sesi Anda berakhir. Silakan masuk kembali.", {}, 401);
    }
    const payload = data as { error?: string; fields?: Record<string, string> } | null;
    throw new ApiClientError(payload?.error ?? "Permintaan tidak dapat diproses.", payload?.fields, res.status);
  }

  return data as T;
}

export type ResourceState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setData: (value: T | null) => void;
};

/** Hook kecil untuk memuat data dari API dengan status muat/gagal. */
export function useApi<T>(path: string | null, deps: unknown[] = []): ResourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!path) {
        setData(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await api<T>(path);
        if (active && mounted.current) setData(result);
      } catch (err: unknown) {
        if (!active || !mounted.current) return;
        if (err instanceof ApiClientError && err.status === 401) {
          if (typeof window !== "undefined") window.location.assign("/masuk");
          return;
        }
        setError(err instanceof Error ? err.message : "Gagal memuat data.");
      } finally {
        if (active && mounted.current) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, ...deps]);

  const reload = useCallback(() => setTick((value) => value + 1), []);
  return { data, loading, error, reload, setData };
}

export type ActionState = { submitting: boolean; error: string | null; fields: Record<string, string> };

/** Hook untuk aksi tulis (POST/PATCH/DELETE) dengan status kirim + pesan error. */
export function useAction() {
  const [state, setState] = useState<ActionState>({ submitting: false, error: null, fields: {} });

  const reset = useCallback(() => setState({ submitting: false, error: null, fields: {} }), []);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    setState({ submitting: true, error: null, fields: {} });
    try {
      const result = await fn();
      setState({ submitting: false, error: null, fields: {} });
      return result;
    } catch (error) {
      if (error instanceof ApiClientError) {
        setState({ submitting: false, error: error.message, fields: error.fields });
        if (error.status === 401 && typeof window !== "undefined") window.location.assign("/masuk");
      } else {
        setState({ submitting: false, error: error instanceof Error ? error.message : "Terjadi kesalahan.", fields: {} });
      }
      return null;
    }
  }, []);

  return { ...state, run, reset };
}

/** Unduh berkas (dipakai untuk ekspor CSV). */
export function unduhCsv(path: string, filename: string) {
  const link = document.createElement("a");
  link.href = `/api${path}`;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
