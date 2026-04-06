import { type User } from "@/types/auth"

const USER_STORAGE_KEY = "user"

export function getStoredUser(): User | null {
  try {
    const userData = sessionStorage.getItem(USER_STORAGE_KEY)
    return userData ? JSON.parse(userData) : null
  } catch {
    return null
  }
}

export function setStoredUser(user: User): void {
  sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
}

export function clearStoredUser(): void {
  sessionStorage.removeItem("access_token")
  sessionStorage.removeItem("refresh_token")
  sessionStorage.removeItem(USER_STORAGE_KEY)
}