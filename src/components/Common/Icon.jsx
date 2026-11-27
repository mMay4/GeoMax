/** Iconos reutilizables de Lucide. No se dibuja ni se escribe SVG manualmente. */
import {
  Menu, Search, UserRound, ChevronLeft, ChevronRight,
  Ruler, Scan, RotateCcw, House, MapPinned, Download,
  Layers, Map, MapPin, BarChart3, FileText, ClipboardList, UsersRound, Plus, Pencil, Trash2, X, Check, Printer, Save, ListFilter, PanelLeftOpen, Building2, Landmark, FilePlus2, History, Settings2, Upload, RefreshCw, ShieldCheck, FileDown, ScrollText, LayoutDashboard, LogOut, Route, Eye, EyeOff, Bell, MessageCircle
} from 'lucide-react'

const icons = {
  menu: Menu,
  search: Search,
  user: UserRound,
  left: ChevronLeft,
  right: ChevronRight,
  distance: Ruler,
  area: Scan,
  clear: RotateCcw,
  home: House,
  urbanizations: MapPinned,
  download: Download,
  layers: Layers,
  map: Map,
  location: MapPin,
  reports: BarChart3,
  report: FileText, quotes: FilePlus2, audit: ClipboardList, users: UsersRound,
  add: Plus, edit: Pencil, delete: Trash2, close: X, check: Check,
  print: Printer, save: Save, filter: ListFilter, open: PanelLeftOpen,
  buildings: Building2, company: Landmark, history: History, settings: Settings2,
  upload: Upload, refresh: RefreshCw, security: ShieldCheck, export: FileDown,
  details: ScrollText, dashboard: LayoutDashboard, logout: LogOut,
  route: Route, eye: Eye, hide: EyeOff, bell: Bell, message: MessageCircle
}

/** Función única para colocar iconos en toda la aplicación. */
export default function Icon({ name, size = 18, className = '', ...props }) {
  const Component = icons[name]
  if (!Component) return null
  return <Component aria-hidden="true" size={size} strokeWidth={2} className={className} {...props} />
}
