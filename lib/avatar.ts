export const DEFAULT_AVATAR_URL = '/default-avatar.svg'

export function resolveAvatarUrl(avatarUrl?: string | null) {
  return typeof avatarUrl === 'string' && avatarUrl.trim().length > 0 ? avatarUrl : DEFAULT_AVATAR_URL
}
