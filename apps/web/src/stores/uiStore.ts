import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

type Theme = 'dark' | 'light'
type LayoutType = 'dagre' | 'force' | 'radial'
type ActivePanel = 'suggestion' | 'research' | 'none'

interface UIState {
  theme: Theme
  layoutType: LayoutType
  activePanel: ActivePanel
  chatNodeId: string | null   // which node has chat panel open
  isSuggestionPanelOpen: boolean
  isResearchSidebarOpen: boolean
  isExportModalOpen: boolean
  isCapabilitiesOpen: boolean
  isOnboardingVisible: boolean

  setTheme: (theme: Theme) => void
  setLayoutType: (layout: LayoutType) => void
  setActivePanel: (panel: ActivePanel) => void
  openNodeChat: (nodeId: string) => void
  closeNodeChat: () => void
  toggleSuggestionPanel: () => void
  toggleResearchSidebar: () => void
  setExportModalOpen: (open: boolean) => void
  setCapabilitiesOpen: (open: boolean) => void
  setOnboardingVisible: (visible: boolean) => void
}

export const useUIStore = create<UIState>()(
  immer((set) => ({
    theme: 'dark',
    layoutType: 'dagre',
    activePanel: 'suggestion',
    chatNodeId: null,
    isSuggestionPanelOpen: true,
    isResearchSidebarOpen: false,
    isExportModalOpen: false,
    isCapabilitiesOpen: false,
    isOnboardingVisible: true,

    setTheme: (theme) =>
      set((s) => {
        s.theme = theme
        document.documentElement.className = theme
      }),

    setLayoutType: (layout) =>
      set((s) => {
        s.layoutType = layout
      }),

    setActivePanel: (panel) =>
      set((s) => {
        s.activePanel = panel
      }),

    openNodeChat: (nodeId) =>
      set((s) => {
        s.chatNodeId = nodeId
      }),

    closeNodeChat: () =>
      set((s) => {
        s.chatNodeId = null
      }),

    toggleSuggestionPanel: () =>
      set((s) => {
        s.isSuggestionPanelOpen = !s.isSuggestionPanelOpen
      }),

    toggleResearchSidebar: () =>
      set((s) => {
        s.isResearchSidebarOpen = !s.isResearchSidebarOpen
      }),

    setExportModalOpen: (open) =>
      set((s) => {
        s.isExportModalOpen = open
      }),

    setCapabilitiesOpen: (open) =>
      set((s) => {
        s.isCapabilitiesOpen = open
      }),

    setOnboardingVisible: (visible) =>
      set((s) => {
        s.isOnboardingVisible = visible
      }),
  })),
)
