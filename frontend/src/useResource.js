import { useEffect, useState } from "react";
import { apiFetch } from "./apiClient";

export function useResource(paths) {
  const key = JSON.stringify(paths);
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${key}:${attempt}`;
  const [state, setState] = useState({ requestKey: null, data: null, error: null });

  useEffect(() => {
    let active = true;
    Promise.all(JSON.parse(key).map((path) => apiFetch(path)))
      .then((data) => {
        if (active) setState({ requestKey, data, error: null });
      })
      .catch((error) => {
        if (active) setState({ requestKey, data: null, error });
      });
    return () => { active = false; };
  }, [key, requestKey]);

  const pending = state.requestKey !== requestKey;
  return {
    data: pending ? null : state.data,
    loading: pending,
    error: pending ? null : state.error,
    reload: () => setAttempt((value) => value + 1),
  };
}
