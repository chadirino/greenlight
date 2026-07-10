export interface Question {
  id: string;
  state: string;
  topicId: string;
  subtopicId: string;
  chapter: number;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  source: {
    chunkId: string;
    chapterTitle: string;
  };
}