import { EditorialRole, ServiceStatus } from '../types/bulletin';

export const STATUS_LABELS: Record<ServiceStatus, string> = {
  draft: '草稿（幹事撰寫中）',
  pastor_review: '待牧師／傳道審閱',
  deacon_review: '待執事複核',
  finalized: '已定稿',
};

export const STATUS_SHORT_LABELS: Record<ServiceStatus, string> = {
  draft: '草稿',
  pastor_review: '牧師審閱中',
  deacon_review: '執事複核中',
  finalized: '已定稿',
};

export const STATUS_ORDER: ServiceStatus[] = ['draft', 'pastor_review', 'deacon_review', 'finalized'];

export const STATUS_STEP_LABELS: Record<ServiceStatus, string> = {
  draft: '幹事撰寫',
  pastor_review: '牧師審閱',
  deacon_review: '執事複核',
  finalized: '已定稿',
};

export const ROLE_LABELS: Record<EditorialRole, string> = {
  officer: '幹事',
  pastor: '傳道／牧師',
  deacon: '執事',
};

// Which stage each role is responsible for confirming.
export const ROLE_REVIEW_STAGE: Record<EditorialRole, ServiceStatus | null> = {
  officer: null,
  pastor: 'pastor_review',
  deacon: 'deacon_review',
};
