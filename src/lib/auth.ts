import "server-only"

export {
  authorizeApiRequest,
  getAuthorizationContext,
  requirePagePermission,
  type AuthorizationContext,
} from "@/lib/authorization"
