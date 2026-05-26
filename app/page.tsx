import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpenCheck,
  Bot,
  Check,
  CircleDollarSign,
  CircleHelp,
  Clock3,
  Database,
  EyeOff,
  FileText,
  Files,
  Gift,
  Globe2,
  GraduationCap,
  Heart,
  History,
  Languages,
  ListChecks,
  Megaphone,
  MessageCircle,
  MousePointerClick,
  PanelsTopLeft,
  Paperclip,
  PlayCircle,
  Radio,
  Repeat2,
  Rocket,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UploadCloud,
  UserPlus,
  UserRoundCheck,
  WandSparkles,
  Zap,
  type LucideIcon,
} from "lucide-react"
import BrandLogo from "./components/BrandLogo"

const LIME = '#d4ff00'

const suggestedPrompts = [
  'Launch my course',
  'Send my lead magnet',
  'Answer FAQs',
  'Follow up interested people',
]

const understandingSteps = [
  'Instagram Reel comment detected',
  'PDF attached',
  'FAQ knowledge connected',
  'Pricing replies enabled',
  'Personalized conversations enabled',
  'Follow-up sequence added',
  'Lead capture enabled',
]

const generatedResult = [
  'Reel comment: GUIDE',
  'DM starts',
  'Guide sent',
  'Pricing question answered',
  'Follow-up tomorrow',
  'Save as lead',
]

const comparisonRows = [
  ['Set triggers', 'Describe the outcome'],
  ['Add condition boxes', 'Replies ready'],
  ['Build flow branches', 'FAQ ready'],
  ['Connect nodes', 'Follow-up ready'],
  ['Create FAQ rules', 'Lead capture ready'],
  ['Test every path', 'Launch in minutes'],
]

const trustPoints = [
  { label: 'No flow builders', icon: PanelsTopLeft },
  { label: 'No conditions boxes', icon: MousePointerClick },
  { label: 'No hours of setup', icon: Clock3 },
]

const creatorFeatures = [
  { label: 'Comment -> DM', icon: MessageCircle },
  { label: 'Guide delivery', icon: FileText },
  { label: 'Pricing questions', icon: CircleDollarSign },
  { label: 'Welcome followers', icon: UserPlus },
  { label: 'Giveaway campaigns', icon: Gift },
  { label: 'Course launches', icon: Rocket },
  { label: 'FAQ replies', icon: CircleHelp },
  { label: 'Follow-up sequences', icon: Repeat2 },
  { label: 'Broadcast campaigns', icon: Megaphone },
  { label: 'Live engagement', icon: Radio },
]

const uploadTypes = [
  { label: 'PDFs', icon: FileText },
  { label: 'Pricing sheets', icon: CircleDollarSign },
  { label: 'FAQs', icon: CircleHelp },
  { label: 'Guides', icon: BookOpenCheck },
  { label: 'Docs', icon: Files },
  { label: 'Course material', icon: GraduationCap },
]

const adaptiveSignals = [
  { label: 'Previous interactions', icon: History },
  { label: 'Interests', icon: Target },
  { label: 'Context', icon: Bot },
  { label: 'Uploaded knowledge', icon: Database },
]

const audienceGroups = [
  { label: 'Potential buyers', icon: UserRoundCheck },
  { label: 'Superfans', icon: Heart },
  { label: 'Silent followers', icon: EyeOff },
  { label: 'Losing interest', icon: TrendingDown },
]

const languages = ['English', 'French', 'Spanish', 'German', '+ more']

const pulseItems = [
  { label: 'Productivity questions rising', icon: TrendingUp },
  { label: 'Story engagement slowing', icon: BarChart3 },
  { label: 'Coaching interest increasing', icon: TrendingUp },
]

const roadmapItems = [
  { label: 'Now', copy: 'Instagram comment to DM, FAQs, lead magnets, follow-ups, broadcasts.', icon: MessageCircle },
  { label: 'Next', copy: 'TikTok and YouTube workflows built with the same chat-first system.', icon: Rocket },
  { label: 'Always', copy: 'ManyChat outcomes with less setup, less wiring, and less maintenance.', icon: Sparkles },
]

const finalCtaItems = [
  { label: 'Same outcomes as ManyChat', icon: BadgeCheck },
  { label: 'Same features creators use', icon: ListChecks },
  { label: '10x simpler', icon: Zap },
  { label: 'Build by chatting', icon: MessageCircle },
]

const faqs = [
  {
    question: 'Is this only for Instagram?',
    answer:
      'TractionFlo starts with Instagram. TikTok and YouTube are on the roadmap so creators can keep the same simple workflow across more channels.',
  },
  {
    question: 'Does it answer PDFs?',
    answer:
      'Yes. Upload PDFs, pricing sheets, guides, FAQs, docs, or course material, and TractionFlo can use that knowledge inside replies.',
  },
  {
    question: 'Is this another chatbot?',
    answer:
      'No. It is an automation copilot for creator growth outcomes: comment replies, DMs, lead magnets, FAQs, broadcasts, and follow-ups.',
  },
  {
    question: 'Can I edit replies?',
    answer:
      'Yes. The goal is to generate the automation for you, then let you review and refine the replies before launch.',
  },
  {
    question: 'Can I use multiple languages?',
    answer:
      'Yes. TractionFlo is designed to understand the follower language and respond in that language automatically.',
  },
  {
    question: 'How fast can I launch?',
    answer:
      'Describe the outcome, attach the needed knowledge, review the generated setup, and launch without building a giant flow.',
  },
  {
    question: 'Do I need technical skills?',
    answer:
      'No. You build by chatting instead of wiring triggers, conditions, branches, and contact rules by hand.',
  },
]

function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string
  title: string
  body?: string
}) {
  return (
    <div className="mx-auto mb-14 max-w-4xl text-center">
      <p className="mb-5 text-xs font-black uppercase tracking-[0.22em] text-black/50">{eyebrow}</p>
      <h2 className="text-4xl font-black leading-[0.95] tracking-normal text-black md:text-6xl">
        {title}
      </h2>
      {body ? (
        <p className="mx-auto mt-7 max-w-2xl text-lg font-semibold leading-8 text-black/60">{body}</p>
      ) : null}
    </div>
  )
}

function IconTile({
  icon: Icon,
  tone = 'lime',
  className = '',
  iconClassName = 'h-5 w-5',
}: {
  icon: LucideIcon
  tone?: 'lime' | 'white' | 'dark'
  className?: string
  iconClassName?: string
}) {
  const toneClass =
    tone === 'dark'
      ? 'border-black bg-black text-white'
      : tone === 'white'
        ? 'border-black/15 bg-white text-black'
        : 'border-black text-black'

  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center border ${toneClass} ${className}`}
      style={tone === 'lime' ? { backgroundColor: LIME } : undefined}
      aria-hidden="true"
    >
      <Icon className={iconClassName} strokeWidth={2.5} />
    </span>
  )
}

function LimeNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="inline-flex -rotate-2 items-center border border-black bg-black px-5 py-2 text-4xl font-bold leading-none lg:px-4 lg:py-1.5 lg:text-3xl"
      style={{ color: LIME, fontFamily: 'var(--font-handwritten)' }}
    >
      {children}
    </div>
  )
}

function SmallLimeNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="inline-flex -rotate-1 items-center px-3 py-1 text-4xl font-bold leading-none"
      style={{ color: LIME, fontFamily: 'var(--font-handwritten)' }}
    >
      {children}
    </div>
  )
}

function DemoColumn({
  title,
  kicker,
  children,
}: {
  title: string
  kicker: string
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0 border border-black/10 bg-white p-5 shadow-[0_18px_50px_rgba(0,0,0,0.06)]">
      <div className="mb-5 border-b border-black/10 pb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-black/40">{kicker}</p>
          <h3 className="mt-1 text-xl font-black text-black">{title}</h3>
        </div>
      </div>
      {children}
    </div>
  )
}

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-black">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 lg:px-8">
          <a href="#" className="inline-flex shrink-0 items-center">
            <BrandLogo className="h-10 w-36" preload sizes="144px" />
          </a>

          <div className="hidden items-center gap-8 text-sm font-bold text-black/70 lg:flex">
            <a href="#product" className="hover:text-black">
              Product
            </a>
            <a href="#examples" className="hover:text-black">
              Examples
            </a>
            <a href="#roadmap" className="hover:text-black">
              Roadmap
            </a>
            <a href="#pricing" className="hover:text-black">
              Pricing
            </a>
            <a href="#faq" className="hover:text-black">
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-3">
            <button
              aria-label="Language selector"
              className="hidden h-10 w-10 items-center justify-center border border-black/15 bg-white text-black transition hover:border-black hover:bg-black hover:text-white md:inline-flex"
              type="button"
            >
              <Globe2 className="h-5 w-5" strokeWidth={2.4} aria-hidden="true" />
            </button>
            <a
              href="/signup"
              className="hidden shrink-0 items-center gap-2 border border-black bg-black px-3 py-2 text-xs font-black text-white transition hover:bg-white hover:text-black sm:inline-flex sm:px-4 sm:text-sm"
            >
              <span>Get Founding Access</span>
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            </a>
          </div>
        </nav>
      </header>

      <section
        id="product"
        className="flex h-[100vh] scroll-mt-20 flex-col justify-center overflow-hidden px-5 pb-8 pt-20 lg:px-8 lg:pb-8 lg:pt-16"
      >
        <div className="mx-auto flex h-full w-full max-w-7xl flex-col justify-center">
          <div className="mx-auto max-w-5xl text-center">
            <div
              className="mx-auto mb-6 block max-w-[20rem] border border-black px-3 py-2 text-center text-[10px] font-black uppercase leading-5 tracking-[0.14em] sm:max-w-full sm:px-4 sm:text-xs sm:tracking-[0.2em] lg:mb-8 lg:py-3"
              style={{ backgroundColor: LIME }}
            >
              Starting with Instagram. TikTok + YouTube coming next.
            </div>
            <h1 className="mx-auto max-w-[21rem] break-words text-[2.5rem] font-black leading-[0.9] tracking-normal text-black sm:max-w-none sm:text-5xl md:text-7xl lg:max-w-6xl lg:text-[clamp(5rem,6.3vw,8rem)]">
              Get the same Instagram growth outcomes.
            </h1>
            <p className="mx-auto mt-5 max-w-[21rem] text-base font-bold leading-7 text-black/65 sm:max-w-3xl sm:text-lg md:text-2xl md:leading-8 lg:mt-7 lg:max-w-5xl lg:text-2xl lg:leading-8">
              Without learning complex automation tools. Same features. Same results. 10x simpler.
            </p>

            <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row lg:mt-8">
              <a
                href="/signup"
                className="inline-flex w-full items-center justify-center gap-2 border border-black bg-black px-6 py-4 text-base font-black text-white transition hover:bg-white hover:text-black sm:w-auto lg:px-10 lg:py-5 lg:text-lg"
              >
                Get Founding Access
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
              </a>
              <a
                href="#demo"
                className="inline-flex w-full items-center justify-center gap-2 border border-black px-6 py-4 text-base font-black text-black transition hover:bg-black hover:text-white sm:w-auto lg:px-10 lg:py-5 lg:text-lg"
              >
                <PlayCircle className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                Watch Demo
              </a>
            </div>

            <div className="mt-6 flex flex-col items-center justify-center gap-3 text-sm font-black text-black/70 sm:flex-row sm:gap-6 lg:mt-8 lg:text-base">
              {trustPoints.map(({ label, icon }) => (
                <div key={label} className="flex items-center gap-2">
                  <IconTile icon={icon} className="h-12 w-12 lg:h-14 lg:w-14" iconClassName="h-5 w-5" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="demo"
        className="flex min-h-[100vh] scroll-mt-24 items-center px-5 py-12 lg:h-[100vh] lg:min-h-0 lg:overflow-hidden lg:px-8 lg:py-16"
      >
        <div className="mx-auto grid w-full max-w-7xl min-w-0 gap-5 lg:grid-cols-3 lg:gap-5">
          <DemoColumn title="TractionFlo Copilot" kicker="Column 1">
              <div className="border border-black/10 bg-black/[0.02] p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-black/45">User types</p>
                <p className="mt-3 break-words text-base font-extrabold leading-7 text-black md:text-lg">
                  When someone comments GUIDE on my Reel, send my free PDF, answer pricing
                  questions from my uploaded FAQ, and follow up if they are interested.
                </p>
              </div>
              <button
                type="button"
                className="mt-4 flex w-full items-center justify-center gap-2 border border-black bg-black px-4 py-3 text-sm font-black text-white"
              >
                Generate
                <Sparkles className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
              </button>
              <div className="mt-5 flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt) => (
                  <span key={prompt} className="min-w-0 break-words border border-black/15 px-3 py-2 text-xs font-black">
                    {prompt}
                  </span>
                ))}
              </div>
          </DemoColumn>

          <DemoColumn title="TractionFlo understanding" kicker="Column 2">
              <div className="space-y-3">
                {understandingSteps.map((step) => (
                  <div
                    key={step}
                    className="flex min-w-0 items-center gap-3 border border-black/10 px-3 py-2.5 text-sm font-extrabold text-black"
                  >
                    <span className="flex h-6 w-6 items-center justify-center border border-black text-black" style={{ backgroundColor: LIME }}>
                      <Check className="h-4 w-4 shrink-0" strokeWidth={2.7} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 break-words">{step}</span>
                  </div>
                ))}
              </div>
          </DemoColumn>

          <DemoColumn title="Generated Instagram result" kicker="Column 3">
              <div className="space-y-3">
                {generatedResult.map((step, index) => (
                  <div key={step} className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center border border-black text-xs font-black"
                      style={{ backgroundColor: index === 0 ? LIME : 'white' }}
                    >
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1 break-words border border-black/10 px-3 py-2.5 text-sm font-extrabold">
                      {step}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <LimeNote>Done.</LimeNote>
              </div>
          </DemoColumn>
        </div>
      </section>

      <section id="examples" className="scroll-mt-24 border-t border-black/10 px-5 pb-12 pt-28 lg:px-8 lg:pb-14 lg:pt-36">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Old way vs TractionFlo"
            title="Same power. Same results. 10x simpler."
            body="Creators already know what they want: comment to DM, lead magnets, FAQs, broadcasts, and follow-ups. TractionFlo removes the maze between idea and launch."
          />

          <div className="overflow-hidden border border-black">
            <div className="grid grid-cols-2 border-b border-black bg-black text-white">
              <div className="flex items-start gap-5 border-r border-white/20 p-5">
                <IconTile icon={PanelsTopLeft} tone="dark" className="border-white/25" />
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-white/55">
                    Old way
                  </p>
                  <h3 className="mt-2 break-words text-2xl font-black">Too much setup</h3>
                </div>
              </div>
              <div className="flex items-start gap-5 p-5">
                <IconTile icon={Sparkles} />
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: LIME }}>
                    TractionFlo
                  </p>
                  <h3 className="mt-2 break-words text-2xl font-black">Chat and launch</h3>
                </div>
              </div>
            </div>
            <div className="divide-y divide-black/10">
              {comparisonRows.map(([old, current]) => (
                <div key={old} className="grid grid-cols-2">
                  <div className="border-r border-black/10 p-5 text-xl font-black text-black/45">
                    {old}
                  </div>
                  <div className="flex items-center justify-between gap-4 p-5 text-xl font-black text-black">
                    <span>{current}</span>
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center border border-black text-black"
                      style={{ backgroundColor: LIME }}
                    >
                      <Check className="h-4 w-4 shrink-0" strokeWidth={2.7} aria-hidden="true" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 text-center">
            <SmallLimeNote>Same power. Same results. 10x simpler.</SmallLimeNote>
          </div>
        </div>
      </section>

      <section className="px-5 pb-12 pt-12 lg:px-8 lg:pb-14 lg:pt-14">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Creator workflows"
            title="Same features creators already use."
            body="No reinvention. TractionFlo keeps the familiar outcomes and replaces the builder complexity with a conversation."
          />
          <div className="mx-auto max-w-5xl divide-y divide-black/10 border-y border-black/10">
            {creatorFeatures.map(({ label, icon }) => (
              <div key={label} className="flex items-center gap-6 py-6">
                <IconTile icon={icon} className="h-12 w-12 md:h-14 md:w-14" />
                <span className="min-w-0 break-words text-3xl font-black tracking-normal text-black md:text-5xl">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-black/10 px-5 pb-12 pt-12 lg:px-8 lg:pb-14 lg:pt-14">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="mb-5 text-xs font-black uppercase tracking-[0.22em] text-black/50">
              Knowledge
            </p>
            <h2 className="text-4xl font-black leading-[0.95] tracking-normal md:text-7xl">
              Upload once. Answer forever.
            </h2>
            <div className="mt-10 border border-black p-5">
              <div className="mb-5 flex items-center gap-4 border-b border-black/10 pb-5">
                <IconTile icon={UploadCloud} className="h-9 w-9" />
                <p className="text-sm font-black uppercase tracking-[0.2em] text-black/45">
                  Upload knowledge
                </p>
              </div>
              <div className="space-y-3">
                {['Course guide.pdf', 'Pricing sheet.pdf', 'FAQ doc.pdf'].map((file) => (
                  <div key={file} className="flex items-center justify-between gap-4 border border-black/10 p-4">
                    <span className="flex min-w-0 items-center gap-3 font-black">
                      <Paperclip className="h-4 w-4 shrink-0 text-black/45" strokeWidth={2.5} aria-hidden="true" />
                      <span className="min-w-0 break-words">{file}</span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-black/45">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.7} aria-hidden="true" />
                      Connected
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {uploadTypes.map(({ label, icon }) => (
                <div key={label} className="flex items-center gap-3 border border-black/10 p-4 text-lg font-black">
                  <IconTile icon={icon} className="h-9 w-9" iconClassName="h-4 w-4" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="border border-black p-6">
            <div className="mb-5 flex justify-start">
              <div className="max-w-[82%] border border-black/10 bg-black/[0.02] p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-black/45">
                  Follower asks
                </p>
                <p className="mt-3 text-3xl font-black leading-tight">What is included?</p>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="max-w-[90%] border border-black bg-black p-5 text-white">
                <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: LIME }}>
                  TractionFlo answers
                </p>
                <p className="mt-4 text-xl font-bold leading-8">
                  The course includes the setup checklist, pricing breakdown, templates, and the
                  private onboarding guide from your uploaded docs.
                </p>
              </div>
            </div>
            <p className="mt-5 text-sm font-bold text-black/50">
              No manual reply writing. TractionFlo reads the source material and answers naturally.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 pb-28 pt-12 lg:px-8 lg:pb-36 lg:pt-14">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Adaptive conversations"
            title="Every conversation adapts."
            body="No same-message blasts. Replies change based on what each follower has asked, clicked, ignored, or shown interest in."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {adaptiveSignals.map(({ label, icon }) => (
              <div key={label} className="flex items-center gap-5 border border-black/10 p-8">
                <IconTile icon={icon} className="h-12 w-12" />
                <h3 className="text-3xl font-black">{label}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-black/10 px-5 pb-12 pt-28 lg:px-8 lg:pb-14 lg:pt-36">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="mb-5 text-xs font-black uppercase tracking-[0.22em] text-black/50">
              Audience intelligence
            </p>
            <h2 className="text-4xl font-black leading-[0.95] tracking-normal md:text-7xl">
              Know who is ready, quiet, or slipping away.
            </h2>
          </div>
          <div className="space-y-4">
            {audienceGroups.map(({ label, icon }) => (
              <div key={label} className="flex items-center gap-5 border border-black/10 p-5">
                <IconTile icon={icon} className="h-11 w-11" />
                <span className="text-2xl font-black">{label}</span>
              </div>
            ))}
            <div className="border border-black bg-black p-6 text-white">
              <div
                className="items-start"
                style={{
                  columnGap: '1.25rem',
                  display: 'grid',
                  gridTemplateColumns: 'auto minmax(0, 1fr)',
                }}
              >
                <IconTile icon={WandSparkles} className="self-start" />
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: LIME }}>
                    Suggested
                  </p>
                  <p className="mt-3 break-words text-2xl font-black">Silent followers active tonight. Run a poll.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-28 lg:px-8 lg:py-36">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Multi-language"
            title="One audience. Many languages."
            body="Follower asks in Spanish. TractionFlo replies automatically in Spanish, using the same uploaded knowledge and brand context."
          />
          <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-5">
            {languages.map((language) => (
              <div
                key={language}
                className="flex items-center justify-center gap-4 border border-black/10 px-5 py-8 text-center text-2xl font-black"
                style={language === 'Spanish' ? { backgroundColor: LIME, borderColor: 'black' } : undefined}
              >
                <Languages className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
                {language}
              </div>
            ))}
          </div>
          <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-2">
            <div className="border border-black/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-black/45">
                Follower asks in Spanish
              </p>
              <p className="mt-3 text-3xl font-black">Que incluye el curso?</p>
            </div>
            <div className="border border-black bg-black p-5 text-white">
              <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: LIME }}>
                TractionFlo replies in Spanish
              </p>
              <p className="mt-3 text-2xl font-black">
                Incluye plantillas, guia paso a paso y soporte para lanzar tu primera automatizacion.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-black/10 px-5 py-28 lg:px-8 lg:py-36">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Daily audience pulse"
            title="Wake up with the signal, not a dashboard maze."
            body="TractionFlo turns conversation patterns into simple next actions, without adding another analytics maze."
          />
          <div className="mx-auto max-w-4xl border border-black">
            <div className="border-b border-black p-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-black/45">
                Today&apos;s pulse
              </p>
            </div>
            <div className="divide-y divide-black/10">
              {pulseItems.map(({ label, icon }) => (
                <div key={label} className="flex items-center gap-5 p-6">
                  <IconTile icon={icon} className="h-11 w-11" />
                  <span className="text-2xl font-black">{label}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-black bg-black p-6 text-white">
              <div
                className="items-start"
                style={{
                  columnGap: '1.25rem',
                  display: 'grid',
                  gridTemplateColumns: 'auto minmax(0, 1fr)',
                }}
              >
                <IconTile icon={WandSparkles} className="self-start" />
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: LIME }}>
                    Suggested actions
                  </p>
                  <p className="mt-3 break-words text-2xl font-black">
                    Share a quick story poll, reply to coaching intent, and send the guide to new
                    commenters.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="mt-6 inline-flex items-center gap-2 border border-white px-5 py-3 text-sm font-black text-white transition hover:bg-white hover:text-black"
              >
                Create action plan
                <WandSparkles className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="roadmap" className="scroll-mt-24 px-5 pb-28 pt-12 lg:px-8 lg:pb-36 lg:pt-14">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-3">
          {roadmapItems.map(({ label, copy, icon }) => (
            <div key={label} className="flex items-start gap-5 border border-black/10 p-8">
              <IconTile icon={icon} className="h-12 w-12" />
              <div className="min-w-0">
                <p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-black/45">
                  {label}
                </p>
                <p className="break-words text-3xl font-black leading-tight">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="scroll-mt-24 border-y border-black bg-black px-5 py-24 text-white lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-10 lg:flex-row lg:items-center">
          <div className="max-w-3xl">
            <p className="mb-5 text-xs font-black uppercase tracking-[0.22em]" style={{ color: LIME }}>
              Pricing
            </p>
            <h2 className="text-4xl font-black leading-[0.95] tracking-normal md:text-6xl">
              Founding access for creators who want the outcome, not the builder.
            </h2>
          </div>
          <a
            href="/signup"
            className="inline-flex items-center gap-2 border border-white px-6 py-4 text-base font-black text-white transition hover:bg-white hover:text-black"
          >
            Get Founding Access
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          </a>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 px-5 py-28 lg:px-8 lg:py-36">
        <div className="mx-auto max-w-5xl">
          <SectionHeader eyebrow="FAQ" title="Questions creators ask before switching." />
          <div className="divide-y divide-black/10 border-y border-black/10">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left text-2xl font-black">
                  {faq.question}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-black text-xl group-open:bg-black group-open:text-white">
                    +
                  </span>
                </summary>
                <p className="mt-5 max-w-3xl text-lg font-semibold leading-8 text-black/60">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-24 lg:px-8">
        <div className="mx-auto max-w-7xl border border-black p-8 text-center md:p-16">
          <p className="mb-6 text-xs font-black uppercase tracking-[0.22em] text-black/50">
            Final CTA
          </p>
          <h2 className="mx-auto max-w-5xl text-5xl font-black leading-[0.9] tracking-normal md:text-8xl">
            Your audience is already interested.
          </h2>
          <p className="mx-auto mt-8 max-w-3xl text-2xl font-bold leading-9 text-black/65">
            Do not make automation another full-time job.
          </p>
          <div className="mx-auto mt-10 grid max-w-4xl gap-3 text-left md:grid-cols-2">
            {finalCtaItems.map(({ label, icon }) => (
              <div key={label} className="flex items-center gap-3 border border-black/10 p-4 font-black">
                <IconTile icon={icon} className="h-9 w-9" iconClassName="h-4 w-4" />
                {label}
              </div>
            ))}
          </div>
          <a
            href="/signup"
            className="mt-10 inline-flex items-center gap-2 border border-black bg-black px-7 py-4 text-base font-black text-white transition hover:bg-white hover:text-black"
          >
            Get Founding Access
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          </a>
        </div>
      </section>
    </main>
  )
}
