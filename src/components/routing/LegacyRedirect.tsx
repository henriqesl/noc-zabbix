import { Navigate, useLocation, useParams } from 'react-router-dom';

export function LegacyRedirect({ pathname, defaults }: { pathname: string; defaults?: Record<string, string> }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  Object.entries(defaults ?? {}).forEach(([key, value]) => {
    if (!params.has(key)) params.set(key, value);
  });

  return <Navigate replace to={{ pathname, search: params.toString(), hash: location.hash }} />;
}

export function LegacyEnvironmentRedirect() {
  const { clientId } = useParams();
  return <LegacyRedirect pathname={`/ambientes/${clientId ?? ''}`} />;
}
