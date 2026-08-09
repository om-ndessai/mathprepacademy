import type {
  Assessment,
  AssessmentDetail,
  AssessmentSummary,
  Attempt,
  AttemptSummary,
  Question,
  ResponseMap,
  ScoreReport,
} from "@mathprep/core";
import { EXAM_SCORING, gradeResponses, topicBreakdown } from "@mathprep/core";
import { ALL_QUESTIONS, ASSESSMENTS } from "@mathprep/question-bank";

// The portal runs fully client-side for the static Cloudflare Pages deploy:
// the question bank is bundled, grading happens in the browser, and attempts
// live in localStorage. The function signatures mirror the old HTTP client so
// pages don't care where the data comes from.

const questionById = new Map(ALL_QUESTIONS.map((q) => [q.id, q]));
const assessmentById = new Map(ASSESSMENTS.map((a) => [a.id, a]));

function assessmentQuestions(assessment: Assessment): Question[] {
  return assessment.questionIds.map((qid) => {
    const q = questionById.get(qid);
    if (!q) {
      throw new Error(`Question ${qid} referenced by ${assessment.id} not found`);
    }
    return q;
  });
}

// ── Attempt storage ─────────────────────────────────────────────────────

const ATTEMPTS_KEY = "mathprep.attempts.v1";

type StoredAttempt = Attempt & { responses: ResponseMap | null };

function loadAttempts(): Record<string, StoredAttempt> {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredAttempt>) : {};
  } catch {
    return {};
  }
}

function saveAttempt(attempt: StoredAttempt): void {
  const all = loadAttempts();
  all[attempt.id] = attempt;
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(all));
}

function buildReport(attempt: StoredAttempt, assessment: Assessment): ScoreReport {
  const graded = gradeResponses(
    assessmentQuestions(assessment),
    attempt.responses ?? {},
    EXAM_SCORING[assessment.examType],
  );
  return {
    attemptId: attempt.id,
    assessmentId: assessment.id,
    assessmentTitle: assessment.title,
    examType: assessment.examType,
    studentName: attempt.studentName,
    startedAt: attempt.startedAt,
    completedAt: attempt.completedAt ?? new Date().toISOString(),
    score: graded.score,
    maxScore: graded.maxScore,
    answered: graded.answered,
    results: graded.results,
    topicBreakdown: topicBreakdown(graded.results),
  };
}

// ── Public API (same shapes the HTTP client used to return) ─────────────

export function fetchAssessments(): Promise<AssessmentSummary[]> {
  return Promise.resolve(
    ASSESSMENTS.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      kind: a.kind,
      examType: a.examType,
      timeLimitMinutes: a.timeLimitMinutes,
      questionCount: a.questionIds.length,
    })),
  );
}

export function fetchAssessment(id: string): Promise<AssessmentDetail> {
  const assessment = assessmentById.get(id);
  if (!assessment) {
    return Promise.reject(new Error("Assessment not found"));
  }
  // Answers and explanations stay out of the test-taking payload shape; for
  // this client-side PMF build they are in the bundle regardless.
  const detail: AssessmentDetail = {
    id: assessment.id,
    title: assessment.title,
    description: assessment.description,
    kind: assessment.kind,
    examType: assessment.examType,
    timeLimitMinutes: assessment.timeLimitMinutes,
    questionCount: assessment.questionIds.length,
    questions: assessmentQuestions(assessment).map(
      ({ id: qid, topic, difficulty, stem, choices }) => ({
        id: qid,
        topic,
        difficulty,
        stem,
        choices,
      }),
    ),
  };
  return Promise.resolve(detail);
}

export function startAttempt(assessmentId: string, studentName: string): Promise<Attempt> {
  if (!assessmentById.has(assessmentId)) {
    return Promise.reject(new Error("Assessment not found"));
  }
  const attempt: StoredAttempt = {
    id: crypto.randomUUID(),
    assessmentId,
    studentName,
    startedAt: new Date().toISOString(),
    completedAt: null,
    score: null,
    maxScore: null,
    responses: null,
  };
  saveAttempt(attempt);
  const { responses: _responses, ...publicAttempt } = attempt;
  return Promise.resolve(publicAttempt);
}

export function submitAttempt(attemptId: string, responses: ResponseMap): Promise<ScoreReport> {
  const attempt = loadAttempts()[attemptId];
  if (!attempt) {
    return Promise.reject(new Error("Attempt not found"));
  }
  if (attempt.completedAt) {
    return Promise.reject(new Error("Attempt already submitted"));
  }
  const assessment = assessmentById.get(attempt.assessmentId);
  if (!assessment) {
    return Promise.reject(new Error("Assessment not found"));
  }
  const completed: StoredAttempt = {
    ...attempt,
    responses,
    completedAt: new Date().toISOString(),
  };
  const report = buildReport(completed, assessment);
  completed.score = report.score;
  completed.maxScore = report.maxScore;
  saveAttempt(completed);
  return Promise.resolve(report);
}

export function fetchReport(attemptId: string): Promise<ScoreReport> {
  const attempt = loadAttempts()[attemptId];
  if (!attempt) {
    return Promise.reject(new Error("Attempt not found"));
  }
  if (!attempt.completedAt) {
    return Promise.reject(new Error("Attempt not yet submitted"));
  }
  const assessment = assessmentById.get(attempt.assessmentId);
  if (!assessment) {
    return Promise.reject(new Error("Assessment not found"));
  }
  return Promise.resolve(buildReport(attempt, assessment));
}

export function fetchStudentAttempts(studentName: string): Promise<AttemptSummary[]> {
  const summaries = Object.values(loadAttempts())
    .filter((a) => a.studentName === studentName)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 50)
    .map(({ responses: _responses, ...attempt }) => ({
      ...attempt,
      assessmentTitle: assessmentById.get(attempt.assessmentId)?.title ?? attempt.assessmentId,
    }));
  return Promise.resolve(summaries);
}
