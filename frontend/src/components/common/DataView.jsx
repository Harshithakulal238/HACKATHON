import { useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "./StatusState";

export default function DataView({
  loader,
  dependencies = [],
  emptyTitle = "No information available",
  emptyMessage = "There are no records to show yet.",
  render,
}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(() => loader(), dependencies);

  useEffect(() => {
    let active = true;
    setError(null);
    setData(null);
    Promise.resolve(load())
      .then((result) => {
        if (active) setData(result);
      })
      .catch((reason) => {
        if (active) setError(reason);
      });
    return () => { active = false; };
  }, [load, reloadKey]);

  if (error) return <ErrorState error={error} onRetry={() => setReloadKey((key) => key + 1)} />;
  if (data === null) return <LoadingState />;

  const items = Array.isArray(data) ? data : (data?.items || data?.data || []);
  if (Array.isArray(items) && items.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }
  return render ? render(data) : null;
}
