import { getManualMeta } from "@/lib/content";

interface HomeFooterProps {
  state: string;
}

export default function HomeFooter({ state }: HomeFooterProps) {
  const meta = getManualMeta(state);
  if (!meta) return null;

  const { source } = meta;

  return (
    <div className="mt-16 w-full bg-ink px-6 py-6">
      <p className="mx-auto max-w-md font-mono text-[12px] leading-[1.5] text-bg">
        Practice questions grounded in the {source.edition} {source.name} (
        {source.formNumber}), {source.publisher}. Not affiliated with or
        endorsed by the {source.publisher}.{" "}
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-on-ink-secondary underline underline-offset-2 transition-colors duration-150 hover:text-on-ink-accent"
        >
          Read the official handbook →
        </a>
      </p>
    </div>
  );
}
