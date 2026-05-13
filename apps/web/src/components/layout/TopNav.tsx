import { useState } from 'react'
import { Map, Download, Share2, Moon, Sun, User } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useMindMapStore } from '@/stores/mindMapStore'

export function TopNav() {
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const setExportModalOpen = useUIStore((s) => s.setExportModalOpen)
  const layoutType = useUIStore((s) => s.layoutType)
  const setLayoutType = useUIStore((s) => s.setLayoutType)
  const mapTitle = useMindMapStore((s) => s.currentMap?.title ?? 'Untitled Map')

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [title, setTitle] = useState(mapTitle)

  const LAYOUTS = ['dagre', 'radial', 'force'] as const

  return (
    <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-card/80 backdrop-blur-sm z-50 flex-shrink-0">
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center">
            <Map size={13} className="text-primary" />
          </div>
          <span className="text-xs font-bold text-foreground tracking-tight">MindMap</span>
        </div>
        <div className="w-px h-4 bg-border" />
        {isEditingTitle ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setIsEditingTitle(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
            className="text-sm font-medium bg-secondary text-foreground outline-none border-b border-primary px-1 w-48"
          />
        ) : (
          <button
            onClick={() => setIsEditingTitle(true)}
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            {title}
          </button>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Layout toggle */}
        <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5 mr-1">
          {LAYOUTS.map((l) => (
            <button
              key={l}
              onClick={() => setLayoutType(l)}
              className={[
                'px-2 py-1 rounded-md text-[10px] font-medium transition-colors capitalize',
                layoutType === l
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {l}
            </button>
          ))}
        </div>

        <button
          onClick={() => setExportModalOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Download size={13} />
          Export
        </button>

        <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Share2 size={13} />
          Share
        </button>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        <div className="ml-1 w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
          <User size={14} className="text-muted-foreground" />
        </div>
      </div>
    </header>
  )
}
