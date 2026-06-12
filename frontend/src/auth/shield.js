export const verifyRoleAccess = (userRole, allowedRoles) => {
  if (!userRole) return false
  return allowedRoles.includes(userRole)
}