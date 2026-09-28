import { EditorialRole, ServiceStatus } from '../types/bulletin';

export const STATUS_LABELS: Record<ServiceStatus, string> = {
  draft: '草稿（助理撰寫中）',
  pastor_review: '待幹事審閱',
  deacon_review: '待主任牧師／傳道複核',
  finalized: '已定稿',
};

export const STATUS_SHORT_LABELS: Record<ServiceStatus, string> = {
  draft: '草稿',
  pastor_review: '幹事審閱中',
  deacon_review: '主任牧師複核中',
  finalized: '已定稿',
};

export const STATUS_ORDER: ServiceStatus[] = ['draft', 'pastor_review', 'deacon_review', 'finalized'];

export const STATUS_STEP_LABELS: Record<ServiceStatus, string> = {
  draft: '助理撰寫',
  pastor_review: '幹事審閱',
  deacon_review: '主任牧師複核',
  finalized: '已定稿',
};

export const ROLE_LABELS: Record<EditorialRole, string> = {
  officer: '助理',
  pastor: '幹事',
  deacon: '主任牧師／傳道',
};

// Which stage each role is responsible for confirming.
export const ROLE_REVIEW_STAGE: Record<EditorialRole, ServiceStatus | null> = {
  officer: null,
  pastor: 'pastor_review',
  deacon: 'deacon_review',
};
