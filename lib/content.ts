import fs from "node:fs";
import path from "node:path";
import type { Question, Topic, TopicsFile } from "@/lib/types";

const CONTENT_ROOT = path.join(process.cwd(), "content", "states");

function readJson<T>(state: string, file: string): T | undefined {
  const filePath = path.join(CONTENT_ROOT, state, file);
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

export function getSupportedStates(): string[] {
  if (!fs.existsSync(CONTENT_ROOT)) return [];
  return fs
    .readdirSync(CONTENT_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

export function getTopics(state: string): Topic[] {
  const topics = readJson<TopicsFile>(state, "topics.json")?.topics ?? [];
  return [...topics].sort((a, b) => a.chapter - b.chapter);
}

export function getTopic(state: string, topicId: string): Topic | undefined {
  return getTopics(state).find((topic) => topic.id === topicId);
}

export function getQuestionsForTopic(state: string, topicId: string): Question[] {
  const questions = readJson<Question[]>(state, "questions.json") ?? [];
  return questions.filter(
    (question) => question.state === state && question.topicId === topicId,
  );
}
