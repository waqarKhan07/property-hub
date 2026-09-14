import { useEffect, useState } from "react";
import { config, isBackendConfigured } from "@/config/config";

export type BackendStatus = "checking" | "ok" | "invalid" | "unreachable" | "missing";
export type ResolvedBackendStatus = Exclude<BackendStatus, "checking">;

let cached: Promise<ResolvedBackendStatus> | null = null;

const PROBE_TIMEOUT_MS = 8000;

function probeOnce(): Promise<ResolvedBackendStatus> {
  if (!isBackendConfigured) {
    return Promise.resolve("missing");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  return fetch(`${config.supabaseUrl}/rest/v1/properties?select=id&limit=1`, {
    headers: { apikey: config.supabaseAnonKey as string },
    signal: controller.signal,
    cache: "no-store",
  })
    .then((res) => {
      clearTimeout(timer);
      return res.status === 401 ? "invalid" : "ok";
    })
    .catch(() => {
      clearTimeout(timer);
      return "unreachable";
    });
}

export function probeBackend(): Promise<ResolvedBackendStatus> {
  if (!cached) cached = probeOnce();
  return cached;
}

export function resetBackendProbe() {
  cached = null;
}

export function useBackendStatus() {
  const [status, setStatus] = useState<BackendStatus>(isBackendConfigured ? "checking" : "missing");

  useEffect(() => {
    let active = true;
    if (!isBackendConfigured) {
      setStatus("missing");
      return () => {
        active = false;
      };
    }
    setStatus("checking");
    probeBackend().then((result) => {
      if (active) setStatus(result);
    });
    return () => {
      active = false;
    };
  }, []);

  return {
    status,
    ready: status === "ok",
    offline: status === "invalid" || status === "unreachable" || status === "missing",
    recheck: () => {
      resetBackendProbe();
      setStatus("checking");
      probeBackend().then(setStatus);
    },
  };
}