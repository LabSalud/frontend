export interface UserPermission {
  id: number
  codename: string
  name: string
  temporary: boolean
  expires_at: string | null
}

export interface UserRole {
  id: number
  name: string
}

export interface User {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  photo?: string
  roles: UserRole[]
  permissions: UserPermission[]
}