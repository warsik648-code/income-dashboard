import {
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Repeat,
  Wallet,
  ChartColumn,
  HandCoins,
  Settings,
  ScrollText,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  description: string
}

export const mainNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview of balances, cash flow, and recent activity.",
  },
  {
    title: "Income",
    href: "/dashboard/income",
    icon: ArrowDownLeft,
    description: "Track money received across accounts and currencies.",
  },
  {
    title: "Expenses",
    href: "/dashboard/expenses",
    icon: ArrowUpRight,
    description: "Record spending by category, account, and payment method.",
  },
  {
    title: "Transfers",
    href: "/dashboard/transfers",
    icon: ArrowLeftRight,
    description: "Move funds between your own accounts without counting income.",
  },
  {
    title: "Subscriptions",
    href: "/dashboard/subscriptions",
    icon: Repeat,
    description: "Manage recurring payments and upcoming renewals.",
  },
  {
    title: "Accounts",
    href: "/dashboard/accounts",
    icon: Wallet,
    description: "TRUST, Binance, Bank, Cash, and other balances.",
  },
  {
    title: "Analytics",
    href: "/dashboard/analytics",
    icon: ChartColumn,
    description: "Trends, category breakdowns, and cash-flow charts.",
  },
  {
    title: "Debts",
    href: "/dashboard/debts",
    icon: HandCoins,
    description: "Money lent out, owed to you, and amounts you owe.",
  },
]

export const secondaryNavItems: NavItem[] = [
  {
    title: "Audit",
    href: "/dashboard/audit",
    icon: ScrollText,
    description: "Review recent changes to accounts and transactions.",
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    description: "Profile preferences, currency defaults, and security.",
  },
]

export function getNavItem(pathname: string): NavItem | undefined {
  const all = [...mainNavItems, ...secondaryNavItems]
  return (
    all.find((item) => item.href === pathname) ??
    all.find(
      (item) => item.href !== "/dashboard" && pathname.startsWith(item.href)
    )
  )
}
