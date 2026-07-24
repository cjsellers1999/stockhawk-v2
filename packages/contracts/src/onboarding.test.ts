import { describe, expect, it } from "vitest";

import { onboardingProgressSchema } from "./onboarding.js";

describe("Onboarding progress contract", () => {
  it("keeps imported rows, Candidate Sites, and case states reconciled", () => {
    const progress = onboardingProgressSchema.parse({
      candidateSites: 2_489,
      cases: {
        inProgress: 0,
        queued: 0,
        resolved: 0,
        suspended: 1,
        total: 1,
      },
      focusCase: {
        candidateIdentity: "cnd_c473d673479129cabf67849530aa60e3",
        candidateName: "101 West Vine",
        candidateUrl: "https://101westvine.store",
        identity: "obc_6d6294f35cc2c20a72a5e88f56fca573",
        nextAction: "Resume onboarding preflight",
        revision: 0,
        sourceRecordCount: 2,
        stage: "preflight",
        status: "suspended",
        terminal: false,
        updatedAt: "2026-07-24T17:00:00.000Z",
        waitReason: "Awaiting explicit owner resume",
      },
      importedAt: "2026-07-24T17:00:00.000Z",
      remainingCandidateSites: 2_488,
      sourceRecords: { reconciled: 2_712, total: 2_712 },
      workbookSha256:
        "0c4d846c6547e4d36d49de7c4aff250b63ec2cec9b39bfa166aa648586f53bbf",
    });

    expect(progress.sourceRecords.reconciled).toBe(2_712);
    expect(progress.candidateSites).toBe(2_489);
    expect(progress.focusCase?.status).toBe("suspended");
  });
});
