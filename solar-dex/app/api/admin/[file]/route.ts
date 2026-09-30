import { createAdminRoute } from '@snug/shared/src/adminRoute';
import { VALIDATORS } from '@/game/systems/validators';

export const { GET, POST } = createAdminRoute(VALIDATORS);
