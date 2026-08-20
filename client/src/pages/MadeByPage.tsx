import {
  Binary,
  Braces,
  BriefcaseBusiness,
  CloudLightning,
  Code2,
  Cpu,
  Database,
  Keyboard,
  MonitorCog,
  Palette,
  Rocket,
  Sparkles,
  TerminalSquare,
} from "lucide-react";
import { FaGithub as Github, FaInstagram as Instagram, FaLinkedin as Linkedin } from "react-icons/fa";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import MagneticButton from "../components/MagneticButton";
import PremiumPanel from "../components/PremiumPanel";
import Reveal from "../components/Reveal";
import { easeOutExpo, staggerContainer, staggerItem } from "../components/motion";

const signals = [
  "Booting hidden workspace...",
  "Resolving developer signature...",
  "Access Granted",
];

const stats = [
  { label: "DSA Solver", icon: Binary, value: "Algorithm-first mindset" },
  { label: "Full Stack Developer", icon: BriefcaseBusiness, value: "Frontend to backend systems" },
  { label: "Problem Solver", icon: Cpu, value: "Obsessed with clean solutions" },
];

const stack = [
  { name: "React", icon: Code2 },
  { name: "Node.js", icon: Rocket },
  { name: "Express", icon: TerminalSquare },
  { name: "PostgreSQL", icon: Database },
  { name: "Tailwind CSS", icon: Sparkles },
  { name: "Framer Motion", icon: CloudLightning },
  { name: "C++", icon: Braces },
  { name: "Docker", icon: MonitorCog },
];

const socials = [
  {
    label: "GitHub",
    href: "https://github.com/Divya-tech06",
    icon: Github,
    copy: "github.com/divya-langalia",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/divya-langalia-b46a16305/",
    icon: Linkedin,
    copy: "linkedin.com/in/divya-langalia",
  },
  {
    label: "Instagram",
    href: "https://instagram.com/divya.langalia06",
    icon: Instagram,
    copy: "instagram.com/divya-langalia",
  },
];

function TypeSequence({ lines }: { lines: string[] }) {
  const fullText = useMemo(() => lines.join("\n"), [lines]);
  const [visible, setVisible] = useState("");

  useEffect(() => {
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setVisible(fullText.slice(0, index));
      if (index >= fullText.length) {
        window.clearInterval(timer);
      }
    }, 34);

    return () => window.clearInterval(timer);
  }, [fullText]);

  return (
    <pre className="font-['Space_Grotesk'] text-xs leading-7 whitespace-pre-wrap text-emerald-300 sm:text-sm">
      {visible}
      <span className="animate-pulse text-orange-300">_</span>
    </pre>
  );
}

function KeyboardPulse() {
  const [lastKey, setLastKey] = useState("...");
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      setLastKey(event.key === " " ? "space" : event.key);
      setBurst((current) => current + 1);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Reveal>
      <PremiumPanel className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-[2rem] border border-orange-400/20 bg-orange-400/5 p-8 text-center">
        <div className="mb-4 flex items-center justify-center gap-2 text-orange-300">
          <Keyboard size={18} />
          <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.3em]">Live Input</p>
        </div>
        <motion.div
          key={burst}
          initial={{ scale: 0.8, opacity: 0, filter: "blur(8px)", y: 10 }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)", y: 0 }}
          className="text-5xl font-black uppercase text-white sm:text-6xl min-h-[72px]"
        >
          {lastKey}
        </motion.div>
        <p className="mt-4 font-['Space_Grotesk'] text-xs tracking-widest text-neutral-500 uppercase">
          Type anywhere
        </p>
      </PremiumPanel>
    </Reveal>
  );
}

export default function MadeByPage() {
  const [introIndex, setIntroIndex] = useState(0);
  const [easterEgg, setEasterEgg] = useState(false);

  useEffect(() => {
    if (introIndex >= signals.length - 1) return undefined;
    const timer = window.setTimeout(() => setIntroIndex((value) => value + 1), 800);
    return () => window.clearTimeout(timer);
  }, [introIndex]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#040404] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.14),transparent_22%),radial-gradient(circle_at_80%_20%,rgba(249,115,22,0.16),transparent_18%),linear-gradient(180deg,rgba(8,8,8,0.2),rgba(4,4,4,0.94))]" />
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-60"
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
        }}
        transition={{ duration: 18, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        style={{
          backgroundImage:
            "linear-gradient(rgba(16,185,129,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.08) 1px, transparent 1px)",
          backgroundSize: "70px 70px",
        }}
      />
      {Array.from({ length: 34 }).map((_, index) => (
        <motion.span
          key={index}
          className="pointer-events-none absolute rounded-full bg-emerald-300/70"
          style={{
            width: index % 2 === 0 ? 2 : 3,
            height: index % 2 === 0 ? 2 : 3,
            left: `${(index * 9.2) % 100}%`,
            top: `${(index * 11.7) % 100}%`,
          }}
          animate={{
            y: [0, -24 - (index % 7) * 4, 0],
            opacity: [0.12, 0.75, 0.12],
          }}
          transition={{
            duration: 4 + (index % 6),
            repeat: Number.POSITIVE_INFINITY,
            delay: index * 0.18,
            ease: "easeInOut",
          }}
        />
      ))}

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-28 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(14px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, ease: easeOutExpo }}
          className="mb-10 inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 px-5 py-2 text-xs uppercase tracking-[0.42em] text-emerald-300"
        >
          {signals[introIndex]}
        </motion.div>

        <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="max-w-3xl"
          >
            <motion.p
              variants={staggerItem}
              className="mb-5 text-xs uppercase tracking-[0.5em] text-orange-300"
            >
              Hidden Developer Archive
            </motion.p>
            <motion.h1
              variants={staggerItem}
              className="max-w-4xl text-5xl font-black uppercase leading-none tracking-tight text-white sm:text-6xl lg:text-8xl"
            >
              Crafted with code, caffeine, and obsession.
            </motion.h1>
            <motion.p
              variants={staggerItem}
              className="mt-6 font-['Space_Grotesk'] text-xl text-emerald-300 sm:text-2xl"
            >
              Made by Divya Langalia
            </motion.p>
            <motion.p
              variants={staggerItem}
              className="mt-8 max-w-2xl text-base leading-8 text-neutral-300 sm:text-lg"
            >
              Full-stack developer, interface perfectionist, and systems-minded problem solver
              who loves turning wild ideas into polished digital products that feel fast,
              intentional, and alive.
            </motion.p>

            <motion.div variants={staggerItem} className="mt-10 flex flex-wrap gap-4">
              <MagneticButton
                as="a"
                href="https://github.com/divya-tech06"
                target="_blank"
                rel="noreferrer"
                className="cta-glow rounded-full border border-emerald-300/30 bg-emerald-400/10 px-6 py-3 text-sm font-bold uppercase tracking-[0.24em] text-white"
              >
                Open GitHub
              </MagneticButton>
            </motion.div>
          </motion.div>

          <Reveal scale={0.97}>
            <PremiumPanel className="rounded-[2rem] border border-emerald-400/20 bg-black/45 p-6 shadow-[0_0_80px_rgba(16,185,129,0.12)] backdrop-blur-2xl sm:p-8">
              <div className="mb-5 flex items-center gap-3 text-emerald-300">
                <TerminalSquare size={18} />
                <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.38em]">
                  divya.langalia//terminal
                </p>
              </div>
              <TypeSequence
                lines={[
                  "> initializing secret portfolio layer",
                  "> stack.react = active",
                  "> stack.node = active",
                  "> motion.status = silky_smooth",
                  "> obsession.level = maximum",
                  "> result = experience_engineered",
                ]}
              />
            </PremiumPanel>
          </Reveal>
        </section>

        <section className="mt-20 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Reveal>
            <PremiumPanel className="rounded-[2rem] border border-white/10 bg-white/5 p-7 backdrop-blur-2xl sm:p-9">
              <p className="text-xs uppercase tracking-[0.4em] text-orange-300">About Me</p>
              <p className="mt-6 text-lg leading-9 text-neutral-300">
                I am the kind of developer who enjoys every layer of the build:
                designing modern web apps, shaping smooth UI/UX, architecting backend systems,
                solving DSA and competitive programming problems, and pushing interfaces toward
                something more futuristic than expected.
              </p>
              <p className="mt-5 text-lg leading-9 text-neutral-300">
                I love scalable architecture, clean abstractions, cinematic motion, and the
                process of taking a rough idea and turning it into something real, usable, and
                hard to forget.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  "I don’t just build websites. I build experiences.",
                  "Obsessed with performance, design, and clean code.",
                  "Late nights, music, and debugging sessions.",
                ].map((line) => (
                  <div
                    key={line}
                    className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4 font-['Space_Grotesk'] text-sm leading-7 text-white"
                  >
                    {line}
                  </div>
                ))}
              </div>
            </PremiumPanel>
          </Reveal>

          <KeyboardPulse />
        </section>

        <section className="mt-20">
          <Reveal>
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.42em] text-emerald-300">Signal Set</p>
              <h2 className="mt-4 text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
                Developer Stats
              </h2>
            </div>
          </Reveal>
          <motion.div
            className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            {stats.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div key={item.label} variants={staggerItem}>
                  <PremiumPanel className="rounded-[1.75rem] border border-emerald-400/20 bg-emerald-400/5 p-6">
                    <div className="inline-flex rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-emerald-300">
                      <Icon size={22} />
                    </div>
                    <p className="mt-6 text-2xl font-black uppercase text-white whitespace-nowrap">{item.label}</p>
                    <p className="mt-3 text-sm leading-7 text-neutral-300">{item.value}</p>
                  </PremiumPanel>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        <section className="mt-20">
          <Reveal>
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.42em] text-orange-300">Preferred Arsenal</p>
              <h2 className="mt-4 text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
                Tech Stack I Like
              </h2>
            </div>
          </Reveal>
          <motion.div
            className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.18 }}
          >
            {stack.map((tech, index) => {
              const Icon = tech.icon;
              return (
                <motion.div key={tech.name} variants={staggerItem}>
                  <PremiumPanel className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(16,185,129,0.06))] p-6">
                    <motion.div
                      animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
                      transition={{
                        duration: 5 + index * 0.2,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                      }}
                      className="inline-flex rounded-2xl border border-orange-300/20 bg-orange-400/10 p-3 text-orange-300"
                    >
                      <Icon size={22} />
                    </motion.div>
                    <p className="mt-6 text-2xl font-black uppercase text-white">{tech.name}</p>
                    <p className="mt-3 font-['Space_Grotesk'] text-sm uppercase tracking-[0.28em] text-neutral-400">
                      Stable. Fast. Battle-ready.
                    </p>
                  </PremiumPanel>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        <section className="mt-20">
          <Reveal>
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.42em] text-emerald-300">Outbound Signals</p>
              <h2 className="mt-4 text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
                Social Links
              </h2>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {socials.map((social, index) => {
              const Icon = social.icon;
              return (
                <Reveal key={social.label} delay={index * 0.08} scale={0.98}>
                  <MagneticButton
                    as="a"
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-[1.75rem] border border-white/10 bg-white/5 p-0 text-left backdrop-blur-2xl"
                  >
                    <PremiumPanel className="rounded-[1.75rem] p-6">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.38em] text-orange-300">
                            {social.label}
                          </p>
                          <p className="mt-3 text-xl font-black uppercase text-white">
                            {social.copy}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-emerald-300">
                          <Icon size={22} />
                        </div>
                      </div>
                    </PremiumPanel>
                  </MagneticButton>
                </Reveal>
              );
            })}
          </div>
        </section>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 text-center"
        >
          <p className="font-['Space_Grotesk'] text-sm uppercase tracking-[0.45em] text-neutral-500">
            Secret page remains unlisted. Discovery requires intent.
          </p>
        </motion.div>
      </div>

      <motion.div
        animate={
          easterEgg
            ? { opacity: [0, 1, 1, 0], scale: [0.94, 1.02, 1, 0.98] }
            : { opacity: 0 }
        }
        transition={{ duration: 2.8, ease: easeOutExpo }}
        className="pointer-events-none fixed inset-0 z-[130] flex items-center justify-center px-6"
      >
        <div className="rounded-[2rem] border border-orange-300/25 bg-black/65 px-8 py-6 text-center shadow-[0_0_70px_rgba(249,115,22,0.24)] backdrop-blur-2xl">
          <p className="text-xs uppercase tracking-[0.45em] text-orange-300"></p>
          <p className="mt-4 text-2xl font-black uppercase text-white">
          </p>
        </div>
      </motion.div>
    </div>
  );
}
