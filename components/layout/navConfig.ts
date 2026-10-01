import {
  Activity, BarChart3, Bell, Building2, CalendarHeart, ClipboardList, Droplet, FileClock, HandHeart, HeartPulse,
  History, LayoutDashboard, MapPinned, Package, Search, Settings, Siren, UserRound, Users, BadgeCheck,
  type LucideIcon,
} from "lucide-react";

export interface NavItem { label: string; href: string; icon: LucideIcon; badge?: number; emphasis?: boolean }
export interface NavGroup { label?: string; items: NavItem[] }

export const userNav: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "My profile", href: "/dashboard/profile", icon: UserRound },
    ],
  },
  {
    label: "Give and get blood",
    items: [
      { label: "Donate blood", href: "/dashboard/donate", icon: HandHeart },
      { label: "Request blood", href: "/dashboard/request", icon: Droplet, emphasis: true },
      { label: "Find donors", href: "/dashboard/donors", icon: Search },
      { label: "Blood requests", href: "/dashboard/blood-requests", icon: HeartPulse },
    ],
  },
  {
    label: "Records",
    items: [
      { label: "Donation history", href: "/dashboard/donations", icon: History },
      { label: "Request history", href: "/dashboard/requests", icon: FileClock },
      { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

/** Five destinations shown in the mobile bottom bar. */
export const userBottomNav: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Donors", href: "/dashboard/donors", icon: Search },
  { label: "Request", href: "/dashboard/request", icon: Droplet, emphasis: true },
  { label: "Requests", href: "/dashboard/blood-requests", icon: HeartPulse },
  { label: "Alerts", href: "/dashboard/notifications", icon: Bell },
];

export const adminNav: NavGroup[] = [
  { items: [{ label: "Overview", href: "/admin", icon: LayoutDashboard }] },
  {
    label: "People",
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Donors", href: "/admin/donors", icon: BadgeCheck },
    ],
  },
  {
    label: "Blood",
    items: [
      { label: "Blood requests", href: "/admin/requests", icon: ClipboardList },
      { label: "Emergency requests", href: "/admin/emergency", icon: Siren, emphasis: true },
      { label: "Donations", href: "/admin/donations", icon: CalendarHeart },
      { label: "Blood inventory", href: "/admin/inventory", icon: Package },
      { label: "Blood groups", href: "/admin/blood-groups", icon: Droplet },
    ],
  },
  {
    label: "Network",
    items: [
      { label: "Hospitals & banks", href: "/admin/hospitals", icon: Building2 },
      { label: "Locations", href: "/admin/locations", icon: MapPinned },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Reports", href: "/admin/reports", icon: BarChart3 },
      { label: "Notifications", href: "/admin/notifications", icon: Bell },
      { label: "Activity log", href: "/admin/activity", icon: Activity },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];
