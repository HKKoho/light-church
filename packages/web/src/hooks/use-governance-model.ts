import { useEffect, useState } from 'react';
import type { GovernanceModel } from '@clawix/shared';
import { authFetch } from '@/lib/auth';

interface GovernanceModelResponse {
  readonly success: boolean;
  readonly data: { readonly governanceModel: GovernanceModel };
}

/**
 * Reads the church's governance model (centralized vs. decentralized cell-group
 * pastoral care) via the non-admin-gated `/admin/congregation-profile/governance-model`
 * route, so any authenticated role can use it to pick a sidebar layout.
 * Defaults to 'centralized' while loading so the sidebar never flashes/reflows.
 */
export function useGovernanceModel() {
  const [governanceModel, setGovernanceModel] = useState<GovernanceModel>('centralized');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    authFetch<GovernanceModelResponse>('/admin/congregation-profile/governance-model')
      .then((res) => {
        if (!cancelled) setGovernanceModel(res.data.governanceModel);
      })
      .catch(() => {
        // Keep the centralized default on failure (e.g. logged out).
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { governanceModel, isLoading };
}
