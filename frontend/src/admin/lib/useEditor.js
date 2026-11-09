import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi, describeError } from '../../lib/api.js';
import { ADMIN_PATH } from '../../lib/config.js';
import { useConfirm, useToast } from '../components/Feedback.jsx';
import { strip } from '../components/ContentList.jsx';
import { useUnsavedWarning } from './useCollection.js';

/** Load / save / delete logic shared by the post and project editors. */
export function useContentEditor({ endpoint, route, blank, noun, validate }) {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [item, setItem] = useState(blank);
  const [original, setOriginal] = useState(JSON.stringify(blank));
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    if (isNew) {
      setItem(blank);
      setOriginal(JSON.stringify(blank));
      setLoading(false);
      return;
    }
    setLoading(true);
    adminApi
      .get(`${endpoint}/${id}`)
      .then(({ item: loaded }) => {
        const merged = { ...blank, ...loaded };
        setItem(merged);
        setOriginal(JSON.stringify(merged));
        setError(null);
      })
      .catch(setError)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, endpoint]);

  const dirty = useMemo(() => JSON.stringify(item) !== original, [item, original]);
  useUnsavedWarning(dirty);

  const save = useCallback(
    async (status) => {
      const next = { ...item, status };
      const problem = validate?.(next);
      if (problem) {
        toast.error(problem);
        return;
      }
      setSaving(status);
      try {
        const body = strip(next);
        const { item: saved } = isNew ? await adminApi.post(endpoint, body) : await adminApi.put(`${endpoint}/${id}`, body);
        const merged = { ...blank, ...saved };
        setItem(merged);
        setOriginal(JSON.stringify(merged));
        const scheduled = saved.status === 'published' && new Date(saved.publishedAt) > new Date();
        toast.success(saved.status === 'draft' ? 'Saved as draft' : scheduled ? 'Scheduled' : 'Published');
        if (isNew) navigate(`${ADMIN_PATH}/${route}/${saved.id}`, { replace: true });
      } catch (err) {
        toast.error(describeError(err));
      } finally {
        setSaving(null);
      }
    },
    [item, isNew, endpoint, id, blank, navigate, route, toast, validate],
  );

  const remove = useCallback(async () => {
    const ok = await confirm({ title: `Delete this ${noun}?`, message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await adminApi.del(`${endpoint}/${id}`);
      setOriginal(JSON.stringify(item));
      toast.success('Deleted');
      navigate(`${ADMIN_PATH}/${route}`);
    } catch (err) {
      toast.error(describeError(err));
    }
  }, [confirm, endpoint, id, item, navigate, noun, route, toast]);

  return { id, isNew, item, setItem, loading, error, saving, dirty, save, remove };
}

/** Category and tag suggestions (empty if the admin lacks taxonomy access). */
export function useTaxonomy(scope) {
  const [tax, setTax] = useState({ categories: [], tags: [] });
  useEffect(() => {
    Promise.allSettled([adminApi.get('/categories'), adminApi.get('/tags')]).then(([c, t]) =>
      setTax({
        categories: c.status === 'fulfilled' ? c.value.items.filter((x) => x.scope === 'both' || x.scope === scope).map((x) => x.name) : [],
        tags: t.status === 'fulfilled' ? t.value.items.map((x) => x.name) : [],
      }),
    );
  }, [scope]);
  return tax;
}
