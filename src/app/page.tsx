import Reveal from "@/components/Reveal";
import Sky from "@/components/Sky";
import { content as c } from "@/content";

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative flex min-h-svh flex-col items-center justify-center px-6 py-24 text-center">
      {children}
    </section>
  );
}

export default function Home() {
  const hello = c.herName ? `Привет, ${c.herName}` : "Привет";

  return (
    <main className="relative">
      <Sky />

      <Section>
        <Reveal>
          <p className="font-serif text-6xl italic text-rose-100 sm:text-8xl">{hello}</p>
        </Reveal>
        <Reveal delay={600}>
          <p className="mt-8 max-w-md text-lg text-rose-200/80">
            Я сделал это для тебя. Листай медленно — мне нужно тебе кое-что сказать.
          </p>
        </Reveal>
        <Reveal delay={1400} className="absolute bottom-10">
          <div className="scroll-hint text-2xl text-rose-300/70">↓</div>
        </Reveal>
      </Section>

      <Section>
        <Reveal>
          <p className="text-sm uppercase tracking-[0.4em] text-rose-300/70">признание</p>
        </Reveal>
        <Reveal delay={300}>
          <h2 className="mt-6 max-w-xl font-serif text-4xl leading-tight text-rose-50 sm:text-5xl">
            Я был с тобой не до конца честен.
          </h2>
        </Reveal>
        <Reveal delay={800}>
          <p className="mt-6 max-w-md text-lg text-rose-200/80">
            И ты заслуживаешь правды. Вот она.
          </p>
        </Reveal>
      </Section>

      <Section>
        <Reveal>
          <p className="text-xl text-rose-200/70">
            Меня зовут не <span className="line-through decoration-rose-400/80">{c.fakeName}</span>
          </p>
        </Reveal>
        <Reveal delay={700}>
          <p className="mt-6 text-lg text-rose-200/70">меня зовут</p>
          <h2 className="glow mt-2 font-serif text-7xl italic text-rose-100 sm:text-9xl">
            {c.myName}
          </h2>
        </Reveal>
      </Section>

      <Section>
        <Reveal>
          <p className="text-xl text-rose-200/70">
            И я не из <span className="line-through decoration-rose-400/80">{c.fakeCountry}</span>
          </p>
        </Reveal>
        <Reveal delay={700}>
          <p className="mt-6 text-lg text-rose-200/70">я из</p>
          <h2 className="glow mt-2 font-serif text-6xl italic text-rose-100 sm:text-8xl">
            {c.myCountry}
          </h2>
        </Reveal>
      </Section>

      <Section>
        <Reveal>
          <h2 className="max-w-xl font-serif text-4xl leading-tight text-rose-50 sm:text-5xl">
            А всё остальное — <span className="italic text-rose-300">правда</span>.
          </h2>
        </Reveal>
        <ul className="mt-12 flex max-w-md flex-col gap-5">
          {c.truths.map((t, i) => (
            <Reveal key={t} delay={400 + i * 350}>
              <li className="flex items-center justify-center gap-3 text-lg text-rose-100/90">
                <span className="text-rose-400">♥</span>
                {t}
              </li>
            </Reveal>
          ))}
        </ul>
      </Section>

      <Section>
        <Reveal>
          <p className="max-w-lg font-serif text-3xl leading-snug text-rose-50 sm:text-4xl">
            Я не хочу, чтобы что-то между нами начиналось с неправды.
          </p>
        </Reveal>
        <Reveal delay={700}>
          <p className="mt-8 max-w-md text-lg text-rose-200/80">
            Поэтому говорю как есть — и надеюсь, что ты дашь мне шанс познакомиться с тобой
            по-настоящему. Уже без масок.
          </p>
        </Reveal>
      </Section>

      <Section>
        <Reveal>
          <p className="text-sm uppercase tracking-[0.4em] text-rose-300/70">если ты не против</p>
        </Reveal>
        <Reveal delay={300}>
          <h2 className="mt-6 font-serif text-5xl italic text-rose-50 sm:text-6xl">
            Напиши мне?
          </h2>
        </Reveal>
        <Reveal delay={800}>
          <a
            href={`https://t.me/${c.telegram}`}
            target="_blank"
            rel="noopener noreferrer"
            className="tg-btn mt-12 inline-flex items-center gap-3 rounded-full px-8 py-4 text-lg font-medium text-white"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden>
              <path d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.5 13.2l-4.7-1.5c-1-.3-1-1 .2-1.5L20.6 3c.9-.3 1.6.2 1.3 1.3Z" />
            </svg>
            Добавить меня в Telegram
          </a>
        </Reveal>
        <Reveal delay={1300}>
          <p className="mt-6 text-rose-200/60">@{c.telegram}</p>
          <p className="mt-16 font-serif text-xl italic text-rose-200/70">— твой {c.myName} ♥</p>
        </Reveal>
      </Section>
    </main>
  );
}
