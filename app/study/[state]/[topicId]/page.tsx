import { notFound } from "next/navigation";
import { getQuestionsForTopic, getSupportedStates, getTopic, getTopics } from "@/lib/content";
import QuizRunner from "@/app/components/QuizRunner";

export const dynamicParams = false;

export function generateStaticParams() {
  return getSupportedStates().flatMap((state) =>
    getTopics(state).map((topic) => ({ state, topicId: topic.id })),
  );
}

export default async function StudyTopicPage({
  params,
}: {
  params: Promise<{ state: string; topicId: string }>;
}) {
  const { state, topicId } = await params;
  const topic = getTopic(state, topicId);
  if (!topic) notFound();

  const questions = getQuestionsForTopic(state, topicId);

  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <QuizRunner state={state} topicId={topicId} topic={topic} questions={questions} />
    </main>
  );
}
