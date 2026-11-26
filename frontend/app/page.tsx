import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, HelpCircle, Lock, ShieldCheck, UserCheck } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ActionLink, Reveal, SectionHeading } from "@/components/site/primitives";
import { RouteChain, ScenarioCard, ScenarioStrip, StatusPill } from "@/components/moneqra";
import { formatKobo } from "@/lib/money";
import { landingData as d } from "@/lib/landing-data";

const problems = [
  { icon: HelpCircle, title: "Payments get stuck in “maybe”", body: "A provider slows down and you cannot tell which customers were really charged." },
  { icon: Clock3, title: "A deadline does not wait", body: "You still owe your supplier today, whether or not the money has arrived." },
  { icon: AlertTriangle, title: "Wrong moves cost money", body: "Retrying too early can charge a customer twice. Switching providers may not help at all." },
];

const steps = [
  { n: 1, title: "See what happened", body: "A plain summary of the problem and when it started." },
  { n: 2, title: "Check your routes", body: "Find out if switching to another provider would actually help." },
  { n: 3, title: "Count what is confirmed", body: "Only money in your account is counted. The rest waits." },
  { n: 4, title: "Check your bills", body: "See which bills your confirmed money covers and which are at risk." },
  { n: 5, title: "Decide", body: "We suggest an action. A person approves it. Everything is recorded." },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <section id="product" className="page-width grid items-center gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div>
            <StatusPill tone="estimate">Demo with simulated data</StatusPill>
            <h1 className="mt-5 text-[clamp(2.4rem,6vw,4rem)]">From payment incident to business impact.</h1>
            <p className="mt-5 max-w-xl text-xl leading-8 text-[var(--text-muted)]">
              When a payment provider has a problem, MONEQRA shows what it means for the money you expect today, and what to do about it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ActionLink href="/demo" large>Try the guided demo <ArrowRight aria-hidden="true" className="size-4" /></ActionLink>
              <ActionLink href="/overview" variant="secondary" large>Open the workspace</ActionLink>
            </div>
            <p className="mt-4 text-sm text-[var(--text-faint)]">No sign-up. No real money moves.</p>
          </div>
          <Reveal>
            <div className="card card-pad" aria-label="Example: Ade Stores today">
              <p className="text-sm font-semibold text-[var(--text-muted)]">Example · Ade Stores, today</p>
              <dl className="mt-4 grid gap-4">
                <div className="flex items-center justify-between gap-3"><dt className="flex items-center gap-2"><CheckCircle2 aria-hidden="true" className="size-5 text-[var(--good)]" /> In your account ({d.settledCount} payments)</dt><dd className="num font-semibold">{formatKobo(d.settledKobo)}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="flex items-center gap-2"><HelpCircle aria-hidden="true" className="size-5 text-[var(--unsure)]" /> Not confirmed yet ({d.unknownCount} payments)</dt><dd className="num font-semibold">{formatKobo(d.unknownKobo)}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="flex items-center gap-2"><Clock3 aria-hidden="true" className="size-5 text-[var(--wait)]" /> Due to supplier at {d.obligationDue}</dt><dd className="num font-semibold">{formatKobo(d.obligationKobo)}</dd></div>
              </dl>
              <div className="callout callout-warn mt-5"><div><strong>Do not count the unconfirmed money.</strong> <span className="text-[var(--text-muted)]">Until the provider confirms it, it is not yours to spend.</span></div></div>
              <p className="mt-3 text-xs text-[var(--text-faint)]">All figures are illustrative.</p>
            </div>
          </Reveal>
        </section>

        <section className="border-y border-[var(--border)] bg-[var(--surface)] py-16" aria-labelledby="problem-heading">
          <div className="page-width">
            <SectionHeading id="problem-heading" kicker="The problem" title="A payment problem becomes a cash problem fast" />
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {problems.map((p) => (
                <Reveal key={p.title}><div className="card card-pad h-full"><p.icon aria-hidden="true" className="size-6 text-[var(--brand)]" /><h3 className="mt-3 text-lg">{p.title}</h3><p className="mt-2 text-[var(--text-muted)]">{p.body}</p></div></Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="page-width py-16" aria-labelledby="how-heading">
          <SectionHeading id="how-heading" kicker="How it works" title="Five simple steps from alarm to decision" />
          <ol className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            {steps.map((s) => (
              <li key={s.n} className="card card-pad"><span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-[var(--brand)] font-bold text-white">{s.n}</span><h3 className="mt-3 text-lg">{s.title}</h3><p className="mt-1 text-[var(--text-muted)]">{s.body}</p></li>
            ))}
          </ol>
        </section>

        <section id="dependency" className="border-y border-[var(--border)] bg-[var(--surface)] py-16" aria-labelledby="dep-heading">
          <div className="page-width">
            <SectionHeading id="dep-heading" kicker="Can you switch?" title="Two providers can still fail together" lead="Switching only helps if the second provider does not rely on the same failing system." />
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div>
                <StatusPill tone="bad">Same failing system</StatusPill>
                <div className="mt-3 grid gap-3">
                  <RouteChain name="Provider A" steps={[{ id: "a1", label: "Ade Stores", kind: "business" }, { id: "a2", label: "Provider A", kind: "provider" }, { id: "a3", label: "Network switch", kind: "switch", failing: true }]} />
                  <RouteChain name="Provider B" steps={[{ id: "b1", label: "Ade Stores", kind: "business" }, { id: "b2", label: "Provider B", kind: "provider" }, { id: "b3", label: "Network switch", kind: "switch", failing: true }]} />
                </div>
                <p className="mt-3 text-[var(--text-muted)]">Switching would not help. Both end up at the same broken step.</p>
              </div>
              <div>
                <StatusPill tone="good">Safe to switch</StatusPill>
                <div className="mt-3 grid gap-3">
                  <RouteChain name="Provider A" steps={[{ id: "c1", label: "Ade Stores", kind: "business" }, { id: "c2", label: "Provider A", kind: "provider" }, { id: "c3", label: "Network switch 1", kind: "switch", failing: true }]} />
                  <RouteChain name="Provider B" steps={[{ id: "d1", label: "Ade Stores", kind: "business" }, { id: "d2", label: "Provider B", kind: "provider" }, { id: "d3", label: "Network switch 2", kind: "switch" }]} />
                </div>
                <p className="mt-3 text-[var(--text-muted)]">Provider B does not use the broken step, so moving payments can help.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="financial" className="page-width py-16" aria-labelledby="fin-heading">
          <SectionHeading id="fin-heading" kicker="What it means for your money" title="Three possible outcomes, no guessing games" lead={`Ade Stores owes ${formatKobo(d.obligationKobo)} at ${d.obligationDue}. How much is left depends on how many waiting payments arrive.`} />
          <div className="mt-8">
            <ScenarioStrip>
              <ScenarioCard label="Worst case" probabilityBps={0} position={d.scenarios[0].positionKobo} description="None of the waiting payments arrive" />
              <ScenarioCard label="Our estimate" probabilityBps={d.scenarios[1].assumptionBps} position={d.scenarios[1].positionKobo} estimated description="An assumption, not a promise" />
              <ScenarioCard label="Best case" probabilityBps={10000} position={d.scenarios[2].positionKobo} description="All of the waiting payments arrive" />
            </ScenarioStrip>
            <p className="mt-3 text-sm text-[var(--text-faint)]">All figures are illustrative. The numbers are calculated by the system, not by AI.</p>
          </div>
        </section>

        <section id="bills" className="page-width py-16" aria-labelledby="bills-heading">
          <SectionHeading id="bills-heading" kicker="Beyond the incident" title="Know which bills are safe to pay" lead="MONEQRA lines up salaries, tax, rent and suppliers by due date against money you actually have. Bills that depend on unconfirmed payments are flagged, and asking for more time becomes a request a second person approves." />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="card card-pad"><StatusPill tone="good">Covered</StatusPill><p className="mt-3 text-[var(--text-muted)]">Money already in your account pays it.</p></div>
            <div className="card card-pad"><StatusPill tone="unsure">Only if waiting payments arrive</StatusPill><p className="mt-3 text-[var(--text-muted)]">It depends on payments the provider has not confirmed, so it is labelled as an estimate.</p></div>
            <div className="card card-pad"><StatusPill tone="bad">At risk</StatusPill><p className="mt-3 text-[var(--text-muted)]">Short even if the guess is right. We suggest asking for more time, and a different person approves the request.</p></div>
          </div>
          <div className="mt-6"><ActionLink href="/bills" variant="secondary">See the bills screen <ArrowRight aria-hidden="true" className="size-4" /></ActionLink></div>
        </section>

        <section id="decision" className="border-y border-[var(--border)] bg-[var(--surface)] py-16" aria-labelledby="dec-heading">
          <div className="page-width">
            <SectionHeading id="dec-heading" kicker="The decision" title="A person always has the last word" lead="We recommend an action and explain why. You approve or decline. Both choices are recorded." />
          </div>
        </section>

        <section id="governance" className="page-width py-16" aria-labelledby="gov-heading">
          <SectionHeading id="gov-heading" kicker="Built to be safe" title="Careful by design" />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { icon: Lock, title: "Never moves money", body: "MONEQRA only advises. It cannot send or hold funds." },
              { icon: UserCheck, title: "People approve", body: "Anything with consequences waits for an approver." },
              { icon: ShieldCheck, title: "Fully recorded", body: "Every decision is saved in a tamper-evident history." },
            ].map((c) => (
              <div key={c.title} className="card card-pad"><c.icon aria-hidden="true" className="size-6 text-[var(--brand)]" /><h3 className="mt-3 text-lg">{c.title}</h3><p className="mt-1 text-[var(--text-muted)]">{c.body}</p></div>
            ))}
          </div>
          <div className="callout callout-info mt-10 items-center justify-between">
            <div><strong className="text-lg">See it in about two minutes.</strong> <span className="text-[var(--text-muted)]">The guided demo walks through one incident from start to decision.</span></div>
            <ActionLink href="/demo">Try the guided demo</ActionLink>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
