import { createAdminMiddleware, defaultAdminMiddlewareMatcher } from 'backend-blueprint';

export const middleware = createAdminMiddleware();
export const config = defaultAdminMiddlewareMatcher;
