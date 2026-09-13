'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const FONT_OPTIONS = [
  { label: 'Sans Serif (default)', value: 'sans-serif' },
  { label: 'Serif', value: 'serif' },
  { label: 'Monospace', value: 'monospace' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
]

type Settings = {
  primary_color: string
  background_color: string
  text_color: string
  card_background_color: string | null
  font_family: string
  spacing_scale: string
  border_radius: string
}

export default function ThemeEditor() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [message, setMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => setSettings(data))
  }, [])

  async function handleSave() {
    if (!settings) return
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    if (res.ok) {
      setMessage('Saved! Refresh the homepage to see changes.')
      router.refresh()
    } else {
      const data = await res.json()
      setMessage(data.error || 'Failed to save')
    }
  }

  if (!settings) return <p className="text-gray-400">Loading theme settings...</p>

  function updateField(field: keyof Settings, value: string) {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  return (
    <div className="border-t pt-6 mt-8">
      <h2 className="text-xl font-bold mb-4">Site Appearance</h2>

      <div className="grid grid-cols-2 gap-4 max-w-md mb-4">
        <div>
          <label className="block text-sm mb-1">Primary color</label>
          <input
            type="color"
            value={`#${settings.primary_color.replace('#', '')}`}
            onChange={(e) => updateField('primary_color', e.target.value.replace('#', ''))}
            className="w-full h-10 rounded cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Background color</label>
          <input
            type="color"
            value={`#${settings.background_color.replace('#', '')}`}
            onChange={(e) => updateField('background_color', e.target.value.replace('#', ''))}
            className="w-full h-10 rounded cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Text color</label>
          <input
            type="color"
            value={`#${settings.text_color.replace('#', '')}`}
            onChange={(e) => updateField('text_color', e.target.value.replace('#', ''))}
            className="w-full h-10 rounded cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Card background</label>
          <input
            type="color"
            value={`#${(settings.card_background_color || '2a2a2a').replace('#', '')}`}
            onChange={(e) => updateField('card_background_color', e.target.value.replace('#', ''))}
            className="w-full h-10 rounded cursor-pointer"
          />
          <p className="text-xs text-gray-500 mt-1">Background for dashboard cards (chart, exposure, holdings). Defaults to a subtle shade of the page background until set.</p>
        </div>
        <div>
          <label className="block text-sm mb-1">Border radius</label>
          <select
            value={settings.border_radius}
            onChange={(e) => updateField('border_radius', e.target.value)}
            className="w-full h-10 rounded px-2 text-black bg-white"
          >
            <option value="0px">Sharp (0px)</option>
            <option value="4px">Slight (4px)</option>
            <option value="8px">Rounded (8px)</option>
            <option value="16px">Very Rounded (16px)</option>
          </select>
        </div>
      </div>

      <div className="max-w-md mb-4">
        <label className="block text-sm mb-1">Font</label>
        <select
          value={settings.font_family}
          onChange={(e) => updateField('font_family', e.target.value)}
          className="w-full h-10 rounded px-2 text-black bg-white"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div className="max-w-md mb-6">
        <label className="block text-sm mb-1">Spacing</label>
        <select
          value={settings.spacing_scale}
          onChange={(e) => updateField('spacing_scale', e.target.value)}
          className="w-full h-10 rounded px-2 text-black bg-white"
        >
          <option value="compact">Compact</option>
          <option value="normal">Normal</option>
          <option value="spacious">Spacious</option>
        </select>
      </div>

      <button
        onClick={handleSave}
        className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-[var(--border-radius)]"
      >
        Save Theme
      </button>
      {message && <p className="mt-3 text-sm">{message}</p>}
    </div>
  )
}