import { useCallback, useEffect, useRef, useState } from 'react';

export function usePolling(fetcher, intervalMs = 20000, enabled = true, dependencies = []) {
  const fetcherRef = useRef(fetcher);
  const [data, setData] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const refresh = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setError('');
    setIsLoading((current) => current && data.length === 0);

    try {
      const result = await fetcherRef.current();
      setData(result);
    } catch (pollError) {
      setError(pollError.message || 'Unable to refresh data');
    } finally {
      setIsLoading(false);
    }
  }, [data.length, enabled]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    refresh();
    const timer = window.setInterval(refresh, intervalMs);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs, refresh, ...dependencies]);

  return { data, setData, error, isLoading, refresh };
}
