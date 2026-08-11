'use client'

import { useMemo, useSyncExternalStore } from 'react'

export interface UserProfile {
  name: string
  role: string
  avatarUrl: string
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Administrador',
  role: 'Modo local seguro',
  avatarUrl: 'https://i.pravatar.cc/150?u=aipostgen',
}

const PROFILE_STORAGE_KEY = 'userProfile'
const PROFILE_EVENT = 'ai-post-gen-profile-change'
const DEFAULT_PROFILE_SNAPSHOT = JSON.stringify(DEFAULT_USER_PROFILE)

function parseProfile(snapshot: string): UserProfile {
  try {
    const value: unknown = JSON.parse(snapshot)
    if (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as Partial<UserProfile>).name === 'string' &&
      typeof (value as Partial<UserProfile>).role === 'string' &&
      typeof (value as Partial<UserProfile>).avatarUrl === 'string'
    ) {
      return value as UserProfile
    }
  } catch {
    // Invalid local data falls back to the safe default profile.
  }

  return DEFAULT_USER_PROFILE
}

function subscribe(callback: () => void) {
  window.addEventListener(PROFILE_EVENT, callback)
  window.addEventListener('storage', callback)

  return () => {
    window.removeEventListener(PROFILE_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

function getProfileSnapshot() {
  return localStorage.getItem(PROFILE_STORAGE_KEY) ?? DEFAULT_PROFILE_SNAPSHOT
}

function getServerProfileSnapshot() {
  return DEFAULT_PROFILE_SNAPSHOT
}

export function useUserProfile(): UserProfile {
  const snapshot = useSyncExternalStore(subscribe, getProfileSnapshot, getServerProfileSnapshot)
  return useMemo(() => parseProfile(snapshot), [snapshot])
}

export function saveUserProfile(profile: UserProfile): void {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
  window.dispatchEvent(new Event(PROFILE_EVENT))
}
