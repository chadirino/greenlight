const STEPS = [
  {
    number: "01",
    label: "Read",
    description: "Study the official Illinois Rules of the Road handbook",
  },
  {
    number: "02",
    label: "Practice",
    description: "Work through topic quizzes here on Greenlight",
  },
  {
    number: "03",
    label: "Track mastery",
    description: "See which topics you've mastered, chapter by chapter",
  },
];

export default function HowItWorks() {
  return (
    <div className="grid w-full max-w-[720px] grid-cols-1 divide-y-2 divide-ink border-2 border-ink text-left md:grid-cols-3 md:divide-x-2 md:divide-y-0">
      {STEPS.map((step) => (
        <div
          key={step.number}
          className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-6 py-6"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-orange">
            {step.number}
          </span>
          <span className="text-[15px] font-semibold text-ink">{step.label}</span>
          <p className="text-[13px] leading-[1.5] text-text-3">{step.description}</p>
        </div>
      ))}
    </div>
  );
}
