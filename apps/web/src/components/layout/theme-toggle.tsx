import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useThemeStore } from '@/stores/theme'

export function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)
  const isDark = mode === 'dark'

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="theme-toggle" className="text-sm text-muted-foreground">
        {isDark ? 'Dark' : 'Light'}
      </Label>
      <Switch
        id="theme-toggle"
        checked={isDark}
        onCheckedChange={(checked) => setMode(checked ? 'dark' : 'light')}
        aria-label="Toggle dark mode"
      />
    </div>
  )
}
