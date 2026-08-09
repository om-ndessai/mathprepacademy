import type { Question } from "@mathprep/core";

import { PRACTICE_SETS } from "./sets";
import { QUESTION_BANK } from "./questions";

export { ASSESSMENTS } from "./assessments";
export { QUESTION_BANK } from "./questions";
export { PRACTICE_SETS, type PracticeSet } from "./sets";

/** Every question in the bank: the topic-quiz pool plus all practice sets. */
export const ALL_QUESTIONS: Question[] = [
  ...QUESTION_BANK,
  ...PRACTICE_SETS.flatMap((s) => s.questions),
];
