import { notFound } from "next/navigation";
import { getSupportedStates, getTopics } from "@/lib/content";
import TopicList from "@/app/components/TopicList";

export const dynamicParams = false;

export function generateStaticParams() {
  return getSupportedStates().map((state) => ({ state }));
}

export default async function StudyStatePage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state } = await params;
  if (!getSupportedStates().includes(state)) notFound();

  const topics = getTopics(state);

  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-[24px] font-semibold tracking-tight text-ink">
          {state} Rules of the Road
        </h1>
        <p className="mt-2 text-[14px] text-text-3">Pick a topic to start practicing.</p>
        <div className="mt-8">
          <TopicList topics={topics} state={state} />
        </div>
      </div>
    </main>
  );
}
