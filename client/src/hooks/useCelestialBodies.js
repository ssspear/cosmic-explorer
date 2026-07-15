import { useCallback, useEffect, useState } from 'react';

export function useCelestialBodies(url) {
  const [status, setStatus] = useState('loading');
  const [bodies, setBodies] = useState([]);
  const [error, setError] = useState(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        if (!Array.isArray(payload.data)) throw new Error('malformed payload');
        return payload.data;
      })
      .then((data) => {
        if (!active) return;
        setBodies(data);
        setStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        setError(err);
        setBodies([]);
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [url, nonce]);

  return { status, bodies, error, reload };
}
