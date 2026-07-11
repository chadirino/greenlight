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

export interface Subtopic {
  id: string;
  label: string;
  chunkId: string;
}

export interface Topic {
  id: string;
  chapter: number;
  label: string;
  subtopics: Subtopic[];
}

export interface TopicsFile {
  state: string;
  source: {
    name: string;
    publisher: string;
    formNumber: string;
    edition: string;
    url: string;
  };
  topics: Topic[];
}

export interface ManualMeta {
  state: string;
  stateName: string;
  source: {
    name: string;
    publisher: string;
    formNumber: string;
    edition: string;
    url: string;
  };
  chapterCount: number;
  chunkCount: number;
  generatedAt: string;
}