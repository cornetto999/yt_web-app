import Link from 'next/link';

export const metadata = {
  title: 'About | YT NO ads',
  description: 'Learn what this app does, how it works, and what makes the experience different.',
};

const featureCards = [
  {
    eyebrow: 'Cleaner Feed',
    title: 'Watch without clutter',
    body: 'The app keeps the experience focused on discovery, playback, and fast navigation instead of pushing extra noise around the player.',
  },
  {
    eyebrow: 'Background Audio',
    title: 'Keep listening while you move',
    body: 'Music and playback controls stay accessible through the shared mini player so your session keeps going between screens.',
  },
  {
    eyebrow: 'Fast Browse',
    title: 'Search, shorts, and trending',
    body: 'Switch between trending videos, shorts, and direct search without losing your place in the feed.',
  },
];

const principles = [
  'Simple browsing that feels fast on desktop and mobile.',
  'Playback controls that stay accessible while you keep exploring.',
  'A visual style that feels modern without getting in the way of content.',
];

export default function AboutPage() {
  return (
    <main className="min-h-screen pb-20 pt-4 md:pt-8">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 mx-auto h-[28rem] max-w-6xl rounded-[120px] bg-gradient-to-br from-sky-300/20 via-cyan-300/10 to-blue-500/20 blur-3xl" />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 md:px-6">
        <section className="glass-panel relative overflow-hidden px-5 py-8 md:px-8 md:py-10">
          <div className="absolute -left-14 top-8 h-44 w-44 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="absolute -right-10 bottom-0 h-52 w-52 rounded-full bg-sky-400/20 blur-3xl" />

          <div className="relative">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700/80">About</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
                  A cleaner YouTube-style experience built around speed and playback.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                  This project focuses on the parts people actually use: search, trending, shorts, watch flow, and background-friendly listening.
                  The goal is a lightweight interface that feels modern, direct, and easy to keep open for long sessions.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.24)] transition hover:bg-slate-800"
                >
                  Back Home
                </Link>
                <Link
                  href="/music"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/75 bg-white/80 px-5 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-slate-900"
                >
                  Open Music
                </Link>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {featureCards.map((card) => (
                <article
                  key={card.title}
                  className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-sm"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700/75">{card.eyebrow}</p>
                  <h2 className="mt-3 text-lg font-bold text-slate-900">{card.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-[1.3fr_0.9fr]">
          <div className="rounded-3xl border border-white/65 bg-white/55 p-6 shadow-[0_8px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700/80">What It Prioritizes</p>
            <div className="mt-4 space-y-3">
              {principles.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-4 text-sm leading-6 text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-3xl border border-white/65 bg-slate-900 p-6 text-white shadow-[0_14px_36px_rgba(15,23,42,0.22)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200/80">Project Snapshot</p>
            <div className="mt-5 space-y-5">
              <div>
                <p className="text-sm text-slate-300">Experience</p>
                <p className="mt-1 text-xl font-bold">Trending, Shorts, Search, Watch, Music</p>
              </div>
              <div>
                <p className="text-sm text-slate-300">Built For</p>
                <p className="mt-1 text-base leading-7 text-slate-100">Fast browsing, lighter playback flow, and a cleaner interface that stays useful across screens.</p>
              </div>
              <div>
                <p className="text-sm text-slate-300">Next Step</p>
                <p className="mt-1 text-base leading-7 text-slate-100">Keep refining playback, discovery, and consistency across the app surface.</p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
