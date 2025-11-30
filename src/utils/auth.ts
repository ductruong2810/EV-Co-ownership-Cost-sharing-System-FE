// demo event target
export const LocalStorageEventTarget = new EventTarget()
export const GROUP_ID_CHANGED_EVENT = 'groupIdChanged'

export const setAccessTokenToLS = (accessToken: string) => {
  localStorage.setItem('accessToken', accessToken)
}

export const setRefreshTokenToLS = (refreshToken: string) => {
  localStorage.setItem('refreshToken', refreshToken)
}

export const setEmailAccountToLS = (accessToken: string) => {
  localStorage.setItem('emailAccount', accessToken)
}

export const setRoleToLS = (role: string) => {
  localStorage.setItem('role', role)
}

export const setUserIdToLS = (userId: string) => {
  localStorage.setItem('userId', userId)
}

export const setGroupIdToLS = (groupId: string) => {
  localStorage.setItem('groupId', groupId)
  const event = new CustomEvent<string>(GROUP_ID_CHANGED_EVENT, { detail: groupId })
  LocalStorageEventTarget.dispatchEvent(event)
}

export const clearLS = () => {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('emailAccount')
  localStorage.removeItem('role')
  localStorage.removeItem('userId')
  localStorage.removeItem('groupId')
  const clearLSEvent = new Event('clearLS')
  LocalStorageEventTarget.dispatchEvent(clearLSEvent)
  const groupEvent = new CustomEvent<string>(GROUP_ID_CHANGED_EVENT, { detail: '' })
  LocalStorageEventTarget.dispatchEvent(groupEvent)
}

export const clearGroupInfoLS = () => {
  localStorage.removeItem('groupId')
  const groupEvent = new CustomEvent<string>(GROUP_ID_CHANGED_EVENT, { detail: '' })
  LocalStorageEventTarget.dispatchEvent(groupEvent)
}

export const getAccessTokenFromLS = () => localStorage.getItem('accessToken') || ''
export const getRefreshTokenFromLS = () => localStorage.getItem('refreshToken') || ''
export const getEmailAccountFromLS = () => localStorage.getItem('emailAccount') || ''
export const getRoleFromLS = () => localStorage.getItem('role') || ''
export const getUserIdFromLS = () => localStorage.getItem('userId') || ''
export const getGroupIdFromLS = () => localStorage.getItem('groupId') || ''

// Remember me functions
export const setRememberedEmailToLS = (email: string) => {
  localStorage.setItem('rememberedEmail', email)
}

export const getRememberedEmailFromLS = () => {
  return localStorage.getItem('rememberedEmail') || ''
}

export const clearRememberedEmailFromLS = () => {
  localStorage.removeItem('rememberedEmail')
}
