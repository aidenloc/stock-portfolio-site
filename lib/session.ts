export function createSessionToken(): string {
  return process.env.SESSION_SECRET!
}

export function isValidSessionToken(token: string | undefined): boolean {
  return !!token && token === process.env.SESSION_SECRET
}