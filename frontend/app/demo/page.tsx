import Link from "next/link";

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[var(--paper)] px-5 py-16 text-[var(--ink)]">
      <div className="mx-auto max-w-4xl">
        <p className="font-mono text-xs text-[var(--vermilion)]">SIMULATION</p>
        <h1 className="mt-3 text-5xl">Ade Stores seeded simulation</h1>
        <p className="mt-5 max-w-2xl leading-7">A prototype incident workspace using fictional providers and illustrative whole-kobo values.</p>
        <Link href="/" className="mt-8 inline-block border-b border-[var(--ink)] py-2 text-sm">← Back to the story</Link>
      </div>
    </main>
  );
}
