import { beforeEach, describe, expect, it } from "vitest";

import {
  fetchAssessment,
  fetchAssessments,
  fetchReport,
  fetchStudentAttempts,
  startAttempt,
  submitAttempt,
} from "./client";

beforeEach(() => {
  localStorage.clear();
});

describe("local data engine", () => {
  it("lists the bundled assessments with question counts", async () => {
    const list = await fetchAssessments();
    expect(list.length).toBeGreaterThanOrEqual(10);
    const mock = list.find((a) => a.id === "mock-01");
    expect(mock).toMatchObject({ examType: "amc8", questionCount: 25, timeLimitMinutes: 40 });
  });

  it("serves assessment details without answers or explanations", async () => {
    const detail = await fetchAssessment("mock-01");
    expect(detail.questions).toHaveLength(25);
    for (const q of detail.questions) {
      expect(q).not.toHaveProperty("answerIndex");
      expect(q).not.toHaveProperty("explanation");
      expect(q.choices).toHaveLength(5);
    }
  });

  it("rejects unknown assessments", async () => {
    await expect(fetchAssessment("nope")).rejects.toThrow("Assessment not found");
  });

  it("runs an attempt end to end: start, submit, report, history", async () => {
    const attempt = await startAttempt("quiz-geometry", "Taylor Reed");
    expect(attempt.completedAt).toBeNull();

    const detail = await fetchAssessment("quiz-geometry");
    const responses = Object.fromEntries(detail.questions.map((q) => [q.id, 0]));
    const report = await submitAttempt(attempt.id, responses);
    expect(report.maxScore).toBe(6);
    expect(report.answered).toBe(6);
    expect(report.results).toHaveLength(6);
    expect(report.topicBreakdown.length).toBeGreaterThanOrEqual(1);

    // Report is rebuildable after a reload (localStorage persistence).
    const again = await fetchReport(attempt.id);
    expect(again.score).toBe(report.score);

    const history = await fetchStudentAttempts("Taylor Reed");
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ assessmentTitle: "Geometry Quiz", score: report.score });
  });

  it("applies official AMC 10 scoring: all blank earns 37.5 of 150", async () => {
    const attempt = await startAttempt("amc10-mock-01", "Taylor Reed");
    const report = await submitAttempt(attempt.id, {});
    expect(report.score).toBe(37.5);
    expect(report.maxScore).toBe(150);
  });

  it("refuses double submission", async () => {
    const attempt = await startAttempt("quiz-geometry", "Taylor Reed");
    await submitAttempt(attempt.id, {});
    await expect(submitAttempt(attempt.id, {})).rejects.toThrow("already submitted");
  });
});
