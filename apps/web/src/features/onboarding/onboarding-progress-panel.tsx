import { Button } from "@stockhawk/ui/button";
import { RotateCcw } from "lucide-react";

import { useOnboardingCaseCommand } from "../command-boundary/use-onboarding-case-command";
import { useOnboardingProgress } from "./use-onboarding-progress";

const count = new Intl.NumberFormat("en-US");

const commandLabels = {
  checking: "Checking",
  failed: "Retry command",
  queued: "Queued",
  ready: "Resume audit",
  unavailable: "Unavailable",
} as const;

const commandLabel = ({
  action,
  status,
}: ReturnType<typeof useOnboardingCaseCommand>) => {
  if (action === "reaudit" && status === "ready") {
    return "Re-audit";
  }
  return commandLabels[status];
};

export const OnboardingProgressPanel = () => {
  const progressQuery = useOnboardingProgress();
  const command = useOnboardingCaseCommand();

  if (progressQuery.isPending) {
    return (
      <section className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-heading-4">Seed List onboarding</h2>
        <p className="mt-2 text-caption text-muted-foreground">
          Loading reconciled progress…
        </p>
      </section>
    );
  }
  if (progressQuery.isError) {
    return (
      <section className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-heading-4">Seed List onboarding</h2>
        <p className="mt-2 text-caption text-danger">
          Onboarding progress unavailable.
        </p>
      </section>
    );
  }

  const { focusCase } = progressQuery.data;
  const label = commandLabel(command);

  return (
    <section
      aria-labelledby="onboarding-progress-title"
      className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4 max-sm:flex-col">
        <div>
          <h2 className="text-heading-4" id="onboarding-progress-title">
            Seed List onboarding
          </h2>
          <p className="text-caption text-muted-foreground">
            Immutable workbook provenance and durable Candidate progress
          </p>
        </div>
        {focusCase === null ? null : (
          <Button
            disabled={!command.canQueue}
            onClick={command.queue}
            type="button"
            variant="ghost"
          >
            <RotateCcw aria-hidden="true" data-icon="inline-start" size={16} />
            {label}
          </Button>
        )}
      </div>
      <div className="mt-4 grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <div>
          <div className="text-caption text-muted-foreground">
            Seed records reconciled
          </div>
          <div className="text-body-strong">
            {count.format(progressQuery.data.sourceRecords.reconciled)} /{" "}
            {count.format(progressQuery.data.sourceRecords.total)}
          </div>
        </div>
        <div>
          <div className="text-caption text-muted-foreground">
            Candidate Sites
          </div>
          <div className="text-body-strong">
            {count.format(progressQuery.data.candidateSites)}
          </div>
        </div>
        <div>
          <div className="text-caption text-muted-foreground">Cases opened</div>
          <div className="text-body-strong">
            {count.format(progressQuery.data.cases.total)}
          </div>
        </div>
        <div>
          <div className="text-caption text-muted-foreground">
            Remaining queue
          </div>
          <div className="text-body-strong">
            {count.format(progressQuery.data.remainingCandidateSites)}
          </div>
        </div>
      </div>
      {focusCase === null ? (
        <div className="mt-4 border-t border-border pt-4">
          <h3 className="text-body-strong">No Onboarding Case opened</h3>
          <p className="mt-1 text-caption text-muted-foreground">
            Imported Candidate Sites remain queued for a durable case.
          </p>
        </div>
      ) : (
        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-start justify-between gap-4 max-sm:flex-col">
            <div>
              <div className="text-body-strong">{focusCase.candidateName}</div>
              <div className="text-caption text-muted-foreground">
                {focusCase.candidateUrl}
              </div>
            </div>
            <div className="text-caption text-muted-foreground">
              {focusCase.stage.replaceAll("_", " ")} · {focusCase.status}
            </div>
          </div>
          <p className="mt-2 text-caption text-muted-foreground">
            {focusCase.waitReason ?? focusCase.nextAction}
          </p>
        </div>
      )}
      <output aria-live="polite" className="sr-only">
        Onboarding command status: {label}.
      </output>
    </section>
  );
};
