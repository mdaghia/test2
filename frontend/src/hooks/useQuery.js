import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';

export function useApiData(apiFn, params, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFn(params);
      setData(res.data.data);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Errore nel caricamento dati');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, total, refetch: fetch };
}

export function useApiAction() {
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async (apiFn, successMsg, errorMsg) => {
    setLoading(true);
    try {
      const res = await apiFn();
      if (successMsg) toast.success(successMsg);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || errorMsg || 'Operazione fallita';
      toast.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading };
}
