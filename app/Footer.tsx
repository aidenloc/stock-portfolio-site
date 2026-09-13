export default function Footer() {
  return (
    <footer className="mt-16 pt-6 border-t border-[var(--color-text)]/10 flex items-center justify-center gap-3 text-xs text-gray-500">
      <span>© {new Date().getFullYear()} Aiden Loc</span>
      <span className="text-gray-700">·</span>
      <a href="/admin/login" className="hover:text-gray-400">
        Admin
      </a>
    </footer>
  )
}
