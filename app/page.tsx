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

const creatorFeatures = [
  'Comment -> DM',
  'Guide delivery',
  'Pricing questions',
  'Welcome followers',
  'Giveaway campaigns',
  'Course launches',
  'FAQ replies',
  'Follow-up sequences',
  'Broadcast campaigns',
  'Live engagement',
]

const uploadTypes = [
  'PDFs',
  'Pricing sheets',
  'FAQs',
  'Guides',
  'Docs',
  'Course material',
]

const adaptiveSignals = [
  'Previous interactions',
  'Interests',
  'Context',
  'Uploaded knowledge',
]

const audienceGroups = [
  'Potential buyers',
  'Superfans',
  'Silent followers',
  'Losing interest',
]

const languages = ['English', 'French', 'Spanish', 'German', '+ more']

const pulseItems = [
  'Productivity questions rising',
  'Story engagement slowing',
  'Coaching interest increasing',
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

function ArrowIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 10H16M11 5L16 10L11 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 10.5L8 14L16 6"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3M12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3M12 21C14 18.75 15 15.75 15 12C15 8.25 14 5.25 12 3M12 21C10 18.75 9 15.75 9 12C9 8.25 10 5.25 12 3M3.75 9H20.25M3.75 15H20.25"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

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
    <div className="min-w-0 border border-black/10 bg-white p-5 shadow-[0_18px_50px_rgba(0,0,0,0.06)] lg:p-3">
      <div className="mb-5 border-b border-black/10 pb-4 lg:mb-3 lg:pb-2.5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-black/40 lg:text-[10px]">{kicker}</p>
          <h3 className="mt-1 text-xl font-black text-black lg:text-base">{title}</h3>
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
          <a href="#" className="shrink-0 text-lg font-black tracking-normal text-black lg:text-xl">
            Traction<span style={{ color: LIME }}>Flo</span>
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
              <GlobeIcon />
            </button>
            <a
              href="/signup"
              className="hidden shrink-0 items-center gap-2 border border-black bg-black px-3 py-2 text-xs font-black text-white transition hover:bg-white hover:text-black sm:inline-flex sm:px-4 sm:text-sm"
            >
              <span>Get Founding Access</span>
              <ArrowIcon />
            </a>
          </div>
        </nav>
      </header>

      <section
        id="product"
        className="flex min-h-[100svh] scroll-mt-20 flex-col justify-center px-5 pb-12 pt-20 lg:h-[100svh] lg:min-h-0 lg:overflow-hidden lg:px-8 lg:pb-4 lg:pt-16"
      >
        <div className="mx-auto w-full max-w-7xl lg:flex lg:h-full lg:flex-col lg:justify-center">
          <div className="mx-auto max-w-5xl text-center">
            <div
              className="mx-auto mb-6 block max-w-[20rem] border border-black px-3 py-2 text-center text-[10px] font-black uppercase leading-5 tracking-[0.14em] sm:max-w-full sm:px-4 sm:text-xs sm:tracking-[0.2em] lg:mb-3 lg:py-1"
              style={{ backgroundColor: LIME }}
            >
              Starting with Instagram. TikTok + YouTube coming next.
            </div>
            <h1 className="mx-auto max-w-[21rem] break-words text-[2.5rem] font-black leading-[0.9] tracking-normal text-black sm:max-w-none sm:text-5xl md:text-7xl lg:text-[clamp(3.25rem,4.2vw,4rem)]">
              Get the same Instagram growth outcomes.
            </h1>
            <p className="mx-auto mt-5 max-w-[21rem] text-base font-bold leading-7 text-black/65 sm:max-w-3xl sm:text-lg md:text-2xl md:leading-8 lg:mt-3 lg:text-lg lg:leading-6">
              Without learning complex automation tools. Same features. Same results. 10x simpler.
            </p>

            <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row lg:mt-4">
              <a
                href="/signup"
                className="inline-flex w-full items-center justify-center gap-2 border border-black bg-black px-6 py-4 text-base font-black text-white transition hover:bg-white hover:text-black sm:w-auto lg:px-5 lg:py-2.5 lg:text-sm"
              >
                Get Founding Access
                <ArrowIcon />
              </a>
              <a
                href="#demo"
                className="inline-flex w-full items-center justify-center border border-black px-6 py-4 text-base font-black text-black transition hover:bg-black hover:text-white sm:w-auto lg:px-5 lg:py-2.5 lg:text-sm"
              >
                Watch Demo
              </a>
            </div>

            <div className="mt-6 flex flex-col items-center justify-center gap-3 text-sm font-black text-black/70 sm:flex-row sm:gap-6 lg:mt-3 lg:text-xs">
              {['No flow builders', 'No conditions boxes', 'No hours of setup'].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="h-2 w-2 border border-black" style={{ backgroundColor: LIME }} />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div id="demo" className="mt-9 grid min-w-0 gap-5 lg:mt-3 lg:grid-cols-3 lg:gap-3">
            <DemoColumn title="TractionFlo Copilot" kicker="Column 1">
              <div className="border border-black/10 bg-black/[0.02] p-4 lg:p-3">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-black/45 lg:text-[10px]">User types</p>
                <p className="mt-3 break-words text-base font-extrabold leading-7 text-black md:text-lg lg:mt-2 lg:text-sm lg:leading-5">
                  When someone comments GUIDE on my Reel, send my free PDF, answer pricing
                  questions from my uploaded FAQ, and follow up if they are interested.
                </p>
              </div>
              <button
                type="button"
                className="mt-4 flex w-full items-center justify-center gap-2 border border-black bg-black px-4 py-3 text-sm font-black text-white lg:mt-3 lg:py-2 lg:text-xs"
              >
                Generate
                <ArrowIcon />
              </button>
              <div className="mt-5 flex flex-wrap gap-2 lg:mt-3 lg:gap-1.5">
                {suggestedPrompts.map((prompt) => (
                  <span key={prompt} className="min-w-0 break-words border border-black/15 px-3 py-2 text-xs font-black lg:px-2 lg:py-1.5 lg:text-[11px]">
                    {prompt}
                  </span>
                ))}
              </div>
            </DemoColumn>

            <DemoColumn title="TractionFlo understanding" kicker="Column 2">
              <div className="space-y-3 lg:space-y-1.5">
                {understandingSteps.map((step) => (
                  <div
                    key={step}
                    className="flex min-w-0 items-center gap-3 border border-black/10 px-3 py-2.5 text-sm font-extrabold text-black lg:gap-2 lg:py-1.5 lg:text-xs"
                  >
                    <span className="flex h-6 w-6 items-center justify-center border border-black text-black lg:h-5 lg:w-5" style={{ backgroundColor: LIME }}>
                      <CheckIcon />
                    </span>
                    <span className="min-w-0 break-words">{step}</span>
                  </div>
                ))}
              </div>
            </DemoColumn>

            <DemoColumn title="Generated Instagram result" kicker="Column 3">
              <div className="space-y-3 lg:space-y-1.5">
                {generatedResult.map((step, index) => (
                  <div key={step} className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center border border-black text-xs font-black lg:h-6 lg:w-6"
                      style={{ backgroundColor: index === 0 ? LIME : 'white' }}
                    >
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1 break-words border border-black/10 px-3 py-2.5 text-sm font-extrabold lg:py-1.5 lg:text-xs">
                      {step}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 lg:mt-2">
                <LimeNote>Done.</LimeNote>
              </div>
            </DemoColumn>
          </div>
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
              <div className="border-r border-white/20 p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/55">
                  Old way
                </p>
                <h3 className="mt-2 text-2xl font-black">Too much setup</h3>
              </div>
              <div className="p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: LIME }}>
                  TractionFlo
                </p>
                <h3 className="mt-2 text-2xl font-black">Chat and launch</h3>
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
                      <CheckIcon />
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
            {creatorFeatures.map((feature) => (
              <div key={feature} className="flex items-center justify-between gap-6 py-6">
                <span className="text-3xl font-black tracking-normal text-black md:text-5xl">
                  {feature}
                </span>
                <span className="h-5 w-5 shrink-0 border border-black" style={{ backgroundColor: LIME }} />
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
                <span className="h-4 w-4 shrink-0 border border-black" style={{ backgroundColor: LIME }} />
                <p className="text-sm font-black uppercase tracking-[0.2em] text-black/45">
                  Upload knowledge
                </p>
              </div>
              <div className="space-y-3">
                {['Course guide.pdf', 'Pricing sheet.pdf', 'FAQ doc.pdf'].map((file) => (
                  <div key={file} className="flex items-center justify-between border border-black/10 p-4">
                    <span className="font-black">{file}</span>
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-black/45">
                      Connected
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {uploadTypes.map((item) => (
                <div key={item} className="border border-black/10 p-4 text-lg font-black">
                  {item}
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
            {adaptiveSignals.map((signal) => (
              <div key={signal} className="flex items-center gap-5 border border-black/10 p-8">
                <span className="h-4 w-4 shrink-0 border border-black" style={{ backgroundColor: LIME }} />
                <h3 className="text-3xl font-black">{signal}</h3>
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
            {audienceGroups.map((group) => (
              <div key={group} className="flex items-center gap-5 border border-black/10 p-5">
                <span className="h-4 w-4 shrink-0 border border-black" style={{ backgroundColor: LIME }} />
                <span className="text-2xl font-black">{group}</span>
              </div>
            ))}
            <div className="border border-black bg-black p-6 text-white">
              <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: LIME }}>
                Suggested
              </p>
              <p className="mt-3 text-2xl font-black">Silent followers active tonight. Run a poll.</p>
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
                className="border border-black/10 px-5 py-8 text-center text-2xl font-black"
                style={language === 'Spanish' ? { backgroundColor: LIME, borderColor: 'black' } : undefined}
              >
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
              {pulseItems.map((item) => (
                <div key={item} className="flex items-center gap-5 p-6">
                  <span className="h-4 w-4 shrink-0 border border-black" style={{ backgroundColor: LIME }} />
                  <span className="text-2xl font-black">{item}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-black bg-black p-6 text-white">
              <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: LIME }}>
                Suggested actions
              </p>
              <p className="mt-3 text-2xl font-black">
                Share a quick story poll, reply to coaching intent, and send the guide to new
                commenters.
              </p>
              <button
                type="button"
                className="mt-6 inline-flex items-center gap-2 border border-white px-5 py-3 text-sm font-black text-white transition hover:bg-white hover:text-black"
              >
                Create action plan
                <ArrowIcon />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="roadmap" className="scroll-mt-24 px-5 pb-28 pt-12 lg:px-8 lg:pb-36 lg:pt-14">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-3">
          {[
            ['Now', 'Instagram comment to DM, FAQs, lead magnets, follow-ups, broadcasts.'],
            ['Next', 'TikTok and YouTube workflows built with the same chat-first system.'],
            ['Always', 'ManyChat outcomes with less setup, less wiring, and less maintenance.'],
          ].map(([label, copy]) => (
            <div key={label} className="border border-black/10 p-8">
              <p className="mb-10 text-xs font-black uppercase tracking-[0.22em] text-black/45">
                {label}
              </p>
              <p className="text-3xl font-black leading-tight">{copy}</p>
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
            <ArrowIcon />
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
            {[
              'Same outcomes as ManyChat',
              'Same features creators use',
              '10x simpler',
              'Build by chatting',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 border border-black/10 p-4 font-black">
                <span className="h-4 w-4 border border-black" style={{ backgroundColor: LIME }} />
                {item}
              </div>
            ))}
          </div>
          <a
            href="/signup"
            className="mt-10 inline-flex items-center gap-2 border border-black bg-black px-7 py-4 text-base font-black text-white transition hover:bg-white hover:text-black"
          >
            Get Founding Access
            <ArrowIcon />
          </a>
        </div>
      </section>
    </main>
  )
}
