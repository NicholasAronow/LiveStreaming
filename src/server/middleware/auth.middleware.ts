import { getUserIdFromRequest } from '../utils/request.utils';

/**
 * Re-export getUserIdFromRequest as middleware utility
 * This allows routes to easily extract userId from various sources
 */
export { getUserIdFromRequest };
