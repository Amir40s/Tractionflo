import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bot,
  Box,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CircleDollarSign,
  CircleHelp,
  Clock,
  Code2,
  CreditCard,
  Crown,
  Database,
  DollarSign,
  Flame,
  Globe2,
  GraduationCap,
  Handshake,
  Heart,
  Mail,
  Play,
  RefreshCw,
  Send,
  Settings,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Star,
  Target,
  TriangleAlert,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import type { SuperAdminDetailConfig } from "../admin/shared";
import type { SuperAdminPage } from "./types";

export const superAdminNavGroups: {
  label: string;
  icon: LucideIcon;
  page?: SuperAdminPage;
  children?: { label: string; page: SuperAdminPage }[];
}[] = [
  { label: "Overview", icon: Box, page: "overview" },
  {
    label: "Creators",
    icon: Users,
    children: [
      { label: "Connected Accounts", page: "creators-connected" },
      { label: "Trials", page: "creators-trials" },
      { label: "Churn Risk", page: "creators-churn" },
    ],
  },
  {
    label: "Revenue",
    icon: CreditCard,
    children: [
      { label: "Subscriptions", page: "revenue-subscriptions" },
      { label: "Payments", page: "revenue-payments" },
      { label: "Refunds", page: "revenue-refunds" },
    ],
  },
  {
    label: "Platform",
    icon: Globe2,
    children: [
      { label: "Instagram Accounts", page: "platform-instagram" },
      { label: "API Health", page: "platform-api" },
      { label: "Queue Monitoring", page: "platform-queue" },
    ],
  },
  {
    label: "AI",
    icon: Sparkles,
    children: [
      { label: "Integration", page: "ai-integration" },
      { label: "Usage", page: "ai-usage" },
      { label: "Costs", page: "ai-costs" },
      { label: "Escalations", page: "ai-escalations" },
    ],
  },
  {
    label: "Support",
    icon: CircleHelp,
    children: [
      { label: "Tickets", page: "support-tickets" },
      { label: "Creator Issues", page: "support-issues" },
    ],
  },
  { label: "Settings", icon: Settings, page: "settings" },
];

export const superAdminPageMeta: Record<SuperAdminPage, { title: string; subtitle: string }> = {
  overview: {
    title: "Overview",
    subtitle: "Real-time overview of the TractionFlo platform",
  },
  "creators-connected": {
    title: "Connected Accounts",
    subtitle: "Instagram creator accounts, token status, and recent activity.",
  },
  "creators-trials": {
    title: "Trials",
    subtitle: "Trial creators, conversion windows, and upgrade readiness.",
  },
  "creators-churn": {
    title: "Churn Risk",
    subtitle: "Creators with billing, usage, or support signals that need attention.",
  },
  "revenue-subscriptions": {
    title: "Subscriptions",
    subtitle: "Plan mix, recurring revenue, and customer lifecycle metrics.",
  },
  "revenue-payments": {
    title: "Payments",
    subtitle: "Successful charges, failed payments, and settlement monitoring.",
  },
  "revenue-refunds": {
    title: "Refunds",
    subtitle: "Refund volume, reasons, and recovery impact.",
  },
  "platform-instagram": {
    title: "Instagram Accounts",
    subtitle: "Connected Instagram accounts and token health across creators.",
  },
  "platform-api": {
    title: "API Health",
    subtitle: "Core service status, response times, and integration health.",
  },
  "platform-queue": {
    title: "Queue Monitoring",
    subtitle: "Webhook queues, retries, stuck jobs, and processing latency.",
  },
  "ai-integration": {
    title: "AI Integration",
    subtitle: "Shared OpenAI key, model, and automation behavior for all creators.",
  },
  "ai-usage": {
    title: "AI Usage",
    subtitle: "Message processing, AI conversations, and automation coverage.",
  },
  "ai-costs": {
    title: "AI Costs",
    subtitle: "Model spend, token usage, and margin impact.",
  },
  "ai-escalations": {
    title: "AI Escalations",
    subtitle: "Human handoff triggers, urgent chats, and AI confidence signals.",
  },
  "support-tickets": {
    title: "Tickets",
    subtitle: "Open tickets, response times, and resolution workload.",
  },
  "support-issues": {
    title: "Creator Issues",
    subtitle: "Creator-reported blockers and operational follow-up.",
  },
  profile: {
    title: "Superadmin Profile",
    subtitle: "Update your profile details, login email, and Cloudinary profile image.",
  },
  settings: {
    title: "Settings",
    subtitle: "Superadmin controls, workspace preferences, and platform defaults.",
  },
};

export const superAdminDetailConfigs: Record<Exclude<SuperAdminPage, "overview" | "profile" | "settings" | "ai-integration">, SuperAdminDetailConfig> = {
  "creators-connected": {
    metrics: [
      { label: "Total connected", value: "1,284", detail: "Instagram accounts", change: "+18.6%", tone: "bg-[#f0edff] text-[#4b3cff]", icon: Globe2 },
      { label: "Healthy tokens", value: "1,242", detail: "Ready for automation", change: "96.7%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
      { label: "Expired tokens", value: "28", detail: "Need reconnect", change: "-2.2%", tone: "bg-[#fff4df] text-[#c07800]", icon: Clock },
      { label: "Disconnected", value: "14", detail: "No active Instagram link", change: "1.1%", tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
    ],
    columns: ["Plan", "Instagram", "Last active", "Messages", "Revenue"],
    rows: [
      { name: "Sarah Creates", detail: "@sarah.creates", values: ["Pro", "Connected", "2 min ago", "328", "$18,400"], status: "Active", statusTone: "green" },
      { name: "Mike Coach", detail: "@mike.coach", values: ["Founder", "Connected", "1 hour ago", "243", "$9,800"], status: "Active", statusTone: "green" },
      { name: "James Wilson", detail: "@james.wilson", values: ["Trial", "Not connected", "1 day ago", "0", "$0"], status: "Trial", statusTone: "amber" },
    ],
    insightTitle: "Account health",
    insightItems: [
      { label: "Reconnect required", value: "42", detail: "Expired or disconnected Instagram tokens", tone: "bg-[#fff4df] text-[#c07800]", icon: RefreshCw },
      { label: "Automation ready", value: "1,242", detail: "Accounts with healthy token state", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
    ],
  },
  "creators-trials": {
    metrics: [
      { label: "Trial accounts", value: "412", detail: "Currently evaluating", change: "+8.7%", tone: "bg-[#fff6e8] text-[#d98613]", icon: User },
      { label: "Conversion ready", value: "86", detail: "High engagement trials", change: "+12.4%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Target },
      { label: "Expiring this week", value: "51", detail: "Need outreach", change: "7 days", tone: "bg-[#fff4df] text-[#c07800]", icon: Clock },
      { label: "Trial pipeline", value: "$64.2K", detail: "Potential MRR", change: "+10.8%", tone: "bg-[#f0edff] text-[#4b3cff]", icon: DollarSign },
    ],
    columns: ["Start", "Plan target", "Messages", "Signals", "Owner"],
    rows: [
      { name: "James Wilson", detail: "@james.wilson", values: ["May 14", "Pro", "0", "Setup pending", "Success"], status: "Trial", statusTone: "amber" },
      { name: "Fit Launch", detail: "@fitlaunch", values: ["May 12", "Founder", "91", "Pricing viewed", "Sales"], status: "Ready", statusTone: "green" },
      { name: "Studio North", detail: "@studionorth", values: ["May 10", "Pro", "43", "High reply rate", "Sales"], status: "Ready", statusTone: "green" },
    ],
    insightTitle: "Trial actions",
    insightItems: [
      { label: "Needs activation", value: "51", detail: "Trials with low first-week usage", tone: "bg-[#fff4df] text-[#c07800]", icon: Play },
      { label: "Upgrade nudges", value: "86", detail: "Trials ready for payment follow-up", tone: "bg-[#eafaf0] text-[#13a84f]", icon: ArrowRight },
    ],
  },
  "creators-churn": {
    metrics: [
      { label: "At-risk creators", value: "37", detail: "Usage or billing risk", change: "-4.6%", tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
      { label: "Low usage", value: "21", detail: "No activity in 7 days", change: "Needs review", tone: "bg-[#fff4df] text-[#c07800]", icon: Clock },
      { label: "Failed payment", value: "9", detail: "Card action needed", change: "$2.8K MRR", tone: "bg-[#fff0f3] text-[#df405b]", icon: CreditCard },
      { label: "Recovered", value: "14", detail: "Saved this month", change: "+6.1%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Heart },
    ],
    columns: ["Risk", "Plan", "MRR", "Last signal", "Owner"],
    rows: [
      { name: "Creator Lab", detail: "@creatorlab", values: ["High", "Founder", "$499", "Failed payment", "Support"], status: "At risk", statusTone: "red" },
      { name: "Wellness Hub", detail: "@wellhub", values: ["Medium", "Pro", "$249", "Low usage", "Success"], status: "Watch", statusTone: "amber" },
      { name: "Nova Coach", detail: "@novacoach", values: ["Low", "Pro", "$249", "Ticket resolved", "Success"], status: "Recovered", statusTone: "green" },
    ],
    insightTitle: "Retention queue",
    insightItems: [
      { label: "Save playbooks", value: "18", detail: "Accounts queued for retention outreach", tone: "bg-[#f0edff] text-[#4b3cff]", icon: BriefcaseBusiness },
      { label: "Revenue at risk", value: "$11.7K", detail: "MRR attached to current risk signals", tone: "bg-[#fff0f3] text-[#df405b]", icon: DollarSign },
    ],
  },
  "revenue-subscriptions": {
    metrics: [
      { label: "MRR", value: "$216,928", detail: "Monthly recurring revenue", change: "+19.8%", tone: "bg-[#f0edff] text-[#4b3cff]", icon: DollarSign },
      { label: "ARR", value: "$2.6M", detail: "Annual recurring revenue", change: "+19.8%", tone: "bg-[#f0edff] text-[#4b3cff]", icon: CircleDollarSign },
      { label: "Paid accounts", value: "872", detail: "Active subscriptions", change: "+16.3%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Handshake },
      { label: "Churn rate", value: "2.4%", detail: "Current month", change: "-0.6%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: TrendingUp },
    ],
    columns: ["Plan", "MRR", "Accounts", "Growth", "Retention"],
    rows: [
      { name: "Founder Plan", detail: "$499 monthly", values: ["Founder", "$170,159", "341", "+21.1%", "114%"], status: "Strong", statusTone: "green" },
      { name: "Pro Plan", detail: "$249 monthly", values: ["Pro", "$132,219", "531", "+17.4%", "109%"], status: "Strong", statusTone: "green" },
      { name: "Trial pool", detail: "Not billed yet", values: ["Trial", "$64,200", "412", "+8.7%", "Pending"], status: "Pipeline", statusTone: "amber" },
    ],
    insightTitle: "Revenue mix",
    insightItems: [
      { label: "Founder share", value: "39.1%", detail: "Of paid accounts", tone: "bg-[#f0edff] text-[#4b3cff]", icon: Crown },
      { label: "Pro share", value: "60.9%", detail: "Of paid accounts", tone: "bg-[#eaf4ff] text-[#246bff]", icon: Sparkles },
    ],
  },
  "revenue-payments": {
    metrics: [
      { label: "Successful charges", value: "1,039", detail: "This month", change: "+13.8%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
      { label: "Failed payments", value: "9", detail: "Needs retry", change: "$2.8K", tone: "bg-[#fff0f3] text-[#df405b]", icon: CreditCard },
      { label: "Processing", value: "$41.6K", detail: "Pending settlement", change: "2 days", tone: "bg-[#fff4df] text-[#c07800]", icon: Clock },
      { label: "Recovered revenue", value: "$8.9K", detail: "Dunning wins", change: "+6.1%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: TrendingUp },
    ],
    columns: ["Amount", "Method", "Date", "Retry", "Owner"],
    rows: [
      { name: "Sarah Creates", detail: "Invoice INV-2042", values: ["$499", "Visa", "Today", "None", "Billing"], status: "Paid", statusTone: "green" },
      { name: "Creator Lab", detail: "Invoice INV-2039", values: ["$499", "Mastercard", "Today", "2nd retry", "Billing"], status: "Failed", statusTone: "red" },
      { name: "Studio North", detail: "Invoice INV-2033", values: ["$249", "Visa", "Yesterday", "None", "Billing"], status: "Paid", statusTone: "green" },
    ],
    insightTitle: "Payment ops",
    insightItems: [
      { label: "Retry queue", value: "9", detail: "Failed invoices in retry workflow", tone: "bg-[#fff0f3] text-[#df405b]", icon: RefreshCw },
      { label: "Settlement health", value: "99.1%", detail: "Charges settled successfully", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Shield },
    ],
  },
  "revenue-refunds": {
    metrics: [
      { label: "Refunds", value: "$3,218", detail: "This month", change: "-4.2%", tone: "bg-[#fff0f3] text-[#df405b]", icon: CreditCard },
      { label: "Refund rate", value: "1.5%", detail: "Of paid revenue", change: "-0.3%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: TrendingUp },
      { label: "Open disputes", value: "3", detail: "Needs evidence", change: "24h SLA", tone: "bg-[#fff4df] text-[#c07800]", icon: TriangleAlert },
      { label: "Saved refunds", value: "$1,842", detail: "Resolved by support", change: "+9.2%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Heart },
    ],
    columns: ["Amount", "Reason", "Date", "Plan", "Owner"],
    rows: [
      { name: "Build Better", detail: "@buildbetter", values: ["$249", "Duplicate charge", "May 17", "Pro", "Billing"], status: "Resolved", statusTone: "green" },
      { name: "Creator Lab", detail: "@creatorlab", values: ["$499", "Cancellation", "May 16", "Founder", "Success"], status: "Review", statusTone: "amber" },
      { name: "Fit Launch", detail: "@fitlaunch", values: ["$249", "Product fit", "May 15", "Pro", "Support"], status: "Open", statusTone: "red" },
    ],
    insightTitle: "Refund reasons",
    insightItems: [
      { label: "Billing issues", value: "46%", detail: "Duplicate, failed, or unclear charges", tone: "bg-[#fff4df] text-[#c07800]", icon: CreditCard },
      { label: "Product fit", value: "31%", detail: "Feature gap or onboarding mismatch", tone: "bg-[#f0edff] text-[#4b3cff]", icon: SlidersHorizontal },
    ],
  },
  "platform-instagram": {
    metrics: [
      { label: "Instagram accounts", value: "1,284", detail: "Connected total", change: "96.7% healthy", tone: "bg-[#f0edff] text-[#4b3cff]", icon: Globe2 },
      { label: "Webhook events", value: "184K", detail: "Today", change: "+22.4%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Code2 },
      { label: "Expired tokens", value: "28", detail: "Reconnect required", change: "2.2%", tone: "bg-[#fff4df] text-[#c07800]", icon: RefreshCw },
      { label: "Disconnected", value: "14", detail: "No active channel", change: "1.1%", tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
    ],
    columns: ["Token", "Messages", "Webhook", "Last sync", "Owner"],
    rows: [
      { name: "Sarah Creates", detail: "@sarah.creates", values: ["Healthy", "328", "Live", "2 min ago", "Platform"], status: "Healthy", statusTone: "green" },
      { name: "James Wilson", detail: "@james.wilson", values: ["Expired", "0", "Paused", "1 day ago", "Success"], status: "Reconnect", statusTone: "amber" },
      { name: "Creator Lab", detail: "@creatorlab", values: ["Disconnected", "0", "Failed", "3 days ago", "Support"], status: "Issue", statusTone: "red" },
    ],
    insightTitle: "Instagram status",
    insightItems: [
      { label: "Healthy", value: "1,242", detail: "Accounts ready for automation", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
      { label: "Needs action", value: "42", detail: "Expired or disconnected tokens", tone: "bg-[#fff4df] text-[#c07800]", icon: TriangleAlert },
    ],
  },
  "platform-api": {
    metrics: [
      { label: "Instagram API", value: "Healthy", detail: "99.98% uptime", change: "132ms avg", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Globe2 },
      { label: "OpenAI API", value: "Healthy", detail: "99.95% uptime", change: "421ms avg", tone: "bg-[#eafaf0] text-[#13a84f]", icon: BrainCircuit },
      { label: "Database", value: "Healthy", detail: "No incidents", change: "18ms avg", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Database },
      { label: "Webhook queue", value: "Warning", detail: "Retry spike", change: "284 pending", tone: "bg-[#fff4df] text-[#c07800]", icon: TriangleAlert },
    ],
    columns: ["Status", "Latency", "Uptime", "Incidents", "Owner"],
    rows: [
      { name: "Instagram API", detail: "Meta graph and messaging", values: ["Healthy", "132ms", "99.98%", "0", "Platform"], status: "Healthy", statusTone: "green" },
      { name: "OpenAI API", detail: "Drafts and qualification", values: ["Healthy", "421ms", "99.95%", "0", "AI"], status: "Healthy", statusTone: "green" },
      { name: "Webhook queue", detail: "Instagram webhook workers", values: ["Warning", "1.8s", "99.64%", "1", "Platform"], status: "Warning", statusTone: "amber" },
    ],
    insightTitle: "Service health",
    insightItems: [
      { label: "Healthy services", value: "5", detail: "No action required", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
      { label: "Warning", value: "1", detail: "Webhook queue needs monitoring", tone: "bg-[#fff4df] text-[#c07800]", icon: TriangleAlert },
    ],
  },
  "platform-queue": {
    metrics: [
      { label: "Pending jobs", value: "284", detail: "Webhook queue", change: "+6.3%", tone: "bg-[#fff4df] text-[#c07800]", icon: Clock },
      { label: "Processed today", value: "184K", detail: "Events handled", change: "+22.4%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
      { label: "Retries", value: "41", detail: "Automatic retry", change: "15 min", tone: "bg-[#fff4df] text-[#c07800]", icon: RefreshCw },
      { label: "Failed jobs", value: "3", detail: "Needs operator", change: "Open", tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
    ],
    columns: ["Queue", "Pending", "Oldest", "Retries", "Worker"],
    rows: [
      { name: "Webhook ingest", detail: "Instagram messages", values: ["High", "184", "8 min", "22", "Live"], status: "Warning", statusTone: "amber" },
      { name: "AI drafts", detail: "OpenAI reply generation", values: ["Normal", "31", "1 min", "4", "Live"], status: "Healthy", statusTone: "green" },
      { name: "Media sync", detail: "Attachment fetch jobs", values: ["Normal", "69", "4 min", "15", "Live"], status: "Healthy", statusTone: "green" },
    ],
    insightTitle: "Queue operations",
    insightItems: [
      { label: "Avg processing", value: "1.8s", detail: "Across active workers", tone: "bg-[#eaf4ff] text-[#246bff]", icon: Clock },
      { label: "Manual review", value: "3", detail: "Jobs that need operator retry", tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
    ],
  },
  "ai-usage": {
    metrics: [
      { label: "Messages processed", value: "124,580", detail: "Today", change: "+22.4%", tone: "bg-[#f0edff] text-[#4b3cff]", icon: Bot },
      { label: "AI conversations", value: "18,420", detail: "Automated chats", change: "+18.7%", tone: "bg-[#f0edff] text-[#4b3cff]", icon: Sparkles },
      { label: "Opportunities found", value: "3,281", detail: "Buying signals", change: "+27.1%", tone: "bg-[#fff6e8] text-[#d98613]", icon: Target },
      { label: "Escalations", value: "284", detail: "Human handoffs", change: "-6.3%", tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
    ],
    columns: ["Messages", "AI replies", "Opportunities", "Escalations", "Health"],
    rows: [
      { name: "Lead qualification", detail: "Pricing and booking intent", values: ["58,420", "21,310", "1,284", "94", "Good"], status: "Healthy", statusTone: "green" },
      { name: "CTA drafts", detail: "Suggested replies", values: ["42,118", "18,002", "1,031", "72", "Good"], status: "Healthy", statusTone: "green" },
      { name: "Support intent", detail: "Refund or issue detection", values: ["24,042", "9,108", "966", "118", "Watch"], status: "Watch", statusTone: "amber" },
    ],
    insightTitle: "Automation coverage",
    insightItems: [
      { label: "AI-ready chats", value: "92%", detail: "Conversations handled without handoff", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
      { label: "Handoff load", value: "284", detail: "Escalations created today", tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
    ],
  },
  "ai-costs": {
    metrics: [
      { label: "AI spend", value: "$1,842", detail: "Month to date", change: "+11.2%", tone: "bg-[#f0edff] text-[#4b3cff]", icon: DollarSign },
      { label: "Cost per reply", value: "$0.018", detail: "Average", change: "-4.1%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: TrendingUp },
      { label: "Token volume", value: "102M", detail: "Input and output", change: "+21.4%", tone: "bg-[#eaf4ff] text-[#246bff]", icon: BrainCircuit },
      { label: "Gross margin", value: "91.4%", detail: "After AI costs", change: "+1.3%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: CircleDollarSign },
    ],
    columns: ["Spend", "Tokens", "Replies", "Cost/reply", "Trend"],
    rows: [
      { name: "GPT reply drafts", detail: "Suggested and sent replies", values: ["$912", "51M", "49,200", "$0.019", "Stable"], status: "Normal", statusTone: "green" },
      { name: "Lead qualification", detail: "Opportunity scoring", values: ["$684", "38M", "31,004", "$0.022", "Up"], status: "Watch", statusTone: "amber" },
      { name: "Workflow tests", detail: "Internal AI tests", values: ["$246", "13M", "8,210", "$0.030", "Review"], status: "Review", statusTone: "amber" },
    ],
    insightTitle: "Cost controls",
    insightItems: [
      { label: "Projected spend", value: "$3.2K", detail: "Expected month-end AI usage", tone: "bg-[#f0edff] text-[#4b3cff]", icon: CalendarDays },
      { label: "Savings target", value: "$420", detail: "Available through prompt compression", tone: "bg-[#eafaf0] text-[#13a84f]", icon: TrendingUp },
    ],
  },
  "ai-escalations": {
    metrics: [
      { label: "Escalations", value: "284", detail: "Today", change: "-6.3%", tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
      { label: "Urgent", value: "18", detail: "High-priority handoffs", change: "Open", tone: "bg-[#fff0f3] text-[#df405b]", icon: Flame },
      { label: "Avg handoff time", value: "2m 14s", detail: "AI to human", change: "-18s", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Clock },
      { label: "Resolved", value: "241", detail: "Handled today", change: "+9.8%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
    ],
    columns: ["Reason", "Count", "Avg time", "Owner", "Trend"],
    rows: [
      { name: "Refund request", detail: "Billing or cancellation language", values: ["Refund", "74", "1m 58s", "Support", "Down"], status: "Handled", statusTone: "green" },
      { name: "Angry sentiment", detail: "Urgent support tone", values: ["Sentiment", "58", "2m 41s", "Support", "Up"], status: "Watch", statusTone: "amber" },
      { name: "Human requested", detail: "Creator wants manual takeover", values: ["Human", "152", "2m 10s", "Agents", "Stable"], status: "Handled", statusTone: "green" },
    ],
    insightTitle: "Handoff signals",
    insightItems: [
      { label: "Needs tuning", value: "31", detail: "Escalations caused by low AI confidence", tone: "bg-[#fff4df] text-[#c07800]", icon: SlidersHorizontal },
      { label: "Human load", value: "18", detail: "Urgent active conversations", tone: "bg-[#fff0f3] text-[#df405b]", icon: Flame },
    ],
  },
  "support-tickets": {
    metrics: [
      { label: "Open tickets", value: "18", detail: "Current queue", change: "-3", tone: "bg-[#fff0f3] text-[#df405b]", icon: Mail },
      { label: "In progress", value: "7", detail: "Assigned now", change: "2h SLA", tone: "bg-[#fff4df] text-[#c07800]", icon: Clock },
      { label: "Resolved today", value: "24", detail: "Closed issues", change: "+12%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
      { label: "Satisfaction", value: "4.8/5", detail: "Latest support score", change: "+0.2", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Star },
    ],
    columns: ["Priority", "Topic", "Age", "Assignee", "SLA"],
    rows: [
      { name: "Webhook not receiving", detail: "Sarah Creates", values: ["High", "Instagram", "18 min", "Platform", "On track"], status: "Open", statusTone: "red" },
      { name: "Billing question", detail: "GlowSkin", values: ["Medium", "Billing", "1h 04m", "Support", "On track"], status: "In progress", statusTone: "amber" },
      { name: "AI reply tone", detail: "Mike Coach", values: ["Low", "AI", "2h 10m", "AI", "On track"], status: "Open", statusTone: "amber" },
    ],
    insightTitle: "Support summary",
    insightItems: [
      { label: "Avg response", value: "2h 14m", detail: "Across open tickets", tone: "bg-[#eaf4ff] text-[#246bff]", icon: Clock },
      { label: "First response", value: "1h 06m", detail: "Median first support reply", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Send },
    ],
  },
  "support-issues": {
    metrics: [
      { label: "Creator issues", value: "31", detail: "Open creator blockers", change: "-8%", tone: "bg-[#fff4df] text-[#c07800]", icon: TriangleAlert },
      { label: "Product issues", value: "11", detail: "Need engineering triage", change: "4 high", tone: "bg-[#fff0f3] text-[#df405b]", icon: Code2 },
      { label: "Onboarding issues", value: "13", detail: "Setup help needed", change: "-3", tone: "bg-[#fff4df] text-[#c07800]", icon: GraduationCap },
      { label: "Resolved today", value: "19", detail: "Creator blockers closed", change: "+14%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
    ],
    columns: ["Category", "Impact", "Age", "Owner", "Next step"],
    rows: [
      { name: "Instagram reconnect loop", detail: "6 creators affected", values: ["Platform", "High", "42 min", "Platform", "Patch"], status: "Open", statusTone: "red" },
      { name: "AI draft too long", detail: "3 creators affected", values: ["AI", "Medium", "2h", "AI", "Tune"], status: "Review", statusTone: "amber" },
      { name: "Plan upgrade blocked", detail: "2 creators affected", values: ["Billing", "Medium", "4h", "Billing", "Retry"], status: "Open", statusTone: "amber" },
    ],
    insightTitle: "Issue themes",
    insightItems: [
      { label: "Platform blockers", value: "11", detail: "Need engineering or API follow-up", tone: "bg-[#fff0f3] text-[#df405b]", icon: Code2 },
      { label: "Success follow-up", value: "20", detail: "Can be handled by support team", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Handshake },
    ],
  },
};
