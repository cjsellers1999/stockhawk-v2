import { z } from "zod";

const stockhawkIdentitySchema = z.string().regex(/^[a-z]{3}_[a-f0-9]{32}$/);

export const onboardingCaseStageSchema = z.enum([
  "preflight",
  "storefront_audit",
  "integration",
  "qualification",
  "complete",
]);

export const onboardingCaseStatusSchema = z.enum([
  "suspended",
  "queued",
  "in_progress",
  "resolved",
]);

export const onboardingCaseSummarySchema = z
  .object({
    candidateIdentity: stockhawkIdentitySchema,
    candidateName: z.string().min(1),
    candidateUrl: z.url(),
    identity: stockhawkIdentitySchema,
    nextAction: z.string().min(1),
    revision: z.int().nonnegative(),
    sourceRecordCount: z.int().positive(),
    stage: onboardingCaseStageSchema,
    status: onboardingCaseStatusSchema,
    terminal: z.boolean(),
    updatedAt: z.iso.datetime({ offset: true }),
    waitReason: z.string().min(1).nullable(),
  })
  .strict()
  .superRefine((onboardingCase, context) => {
    if (onboardingCase.terminal !== (onboardingCase.status === "resolved")) {
      context.addIssue({
        code: "custom",
        message: "Only a resolved Onboarding Case may be terminal",
        path: ["terminal"],
      });
    }
    if (
      onboardingCase.status === "suspended" &&
      onboardingCase.waitReason === null
    ) {
      context.addIssue({
        code: "custom",
        message: "A suspended Onboarding Case requires a wait reason",
        path: ["waitReason"],
      });
    }
  });

export type OnboardingCaseSummary = z.infer<typeof onboardingCaseSummarySchema>;

export const onboardingProgressSchema = z
  .object({
    candidateSites: z.int().nonnegative(),
    cases: z
      .object({
        inProgress: z.int().nonnegative(),
        queued: z.int().nonnegative(),
        resolved: z.int().nonnegative(),
        suspended: z.int().nonnegative(),
        total: z.int().nonnegative(),
      })
      .strict(),
    focusCase: onboardingCaseSummarySchema.nullable(),
    importedAt: z.iso.datetime({ offset: true }),
    remainingCandidateSites: z.int().nonnegative(),
    sourceRecords: z
      .object({
        reconciled: z.int().nonnegative(),
        total: z.int().nonnegative(),
      })
      .strict(),
    workbookSha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict()
  .superRefine((progress, context) => {
    const caseTotal =
      progress.cases.inProgress +
      progress.cases.queued +
      progress.cases.resolved +
      progress.cases.suspended;
    if (caseTotal !== progress.cases.total) {
      context.addIssue({
        code: "custom",
        message: "Onboarding Case status counts must reconcile",
        path: ["cases"],
      });
    }
    if (progress.sourceRecords.reconciled > progress.sourceRecords.total) {
      context.addIssue({
        code: "custom",
        message: "Reconciled source records cannot exceed the imported total",
        path: ["sourceRecords", "reconciled"],
      });
    }
    if (
      progress.remainingCandidateSites !==
      progress.candidateSites - progress.cases.total
    ) {
      context.addIssue({
        code: "custom",
        message: "Remaining Candidate Sites must reconcile to opened cases",
        path: ["remainingCandidateSites"],
      });
    }
  });

export type OnboardingProgress = z.infer<typeof onboardingProgressSchema>;
