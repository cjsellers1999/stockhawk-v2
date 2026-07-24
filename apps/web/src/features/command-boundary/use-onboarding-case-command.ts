import type {
  OnboardingCaseCommand,
  OnboardingProgress,
  OwnerCommandReceipt,
} from "@stockhawk/contracts";
import {
  useQuery,
  useQueryClient,
  type MutationObserverOptions,
  type QueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  onboardingCommandReceiptQueryOptions,
  onboardingProgressQueryOptions,
} from "../onboarding/onboarding.query";
import { onboardingQueryKeys } from "../onboarding/onboarding.query-keys";
import { executeOnboardingCaseCommand } from "./owner-command.client";
import { ownerCommandQueryKeys } from "./owner-command.query-keys";
import { useCommandMutation } from "./use-command-mutation";

type MutationContext = {
  previousProgress: OnboardingProgress | undefined;
};

type ReceiptStatus = OwnerCommandReceipt["status"] | undefined;

const refreshProgressAfterTerminalReceipt = ({
  currentStatus,
  previousStatus,
  queryClient,
}: {
  currentStatus: ReceiptStatus;
  previousStatus: { current: ReceiptStatus };
  queryClient: QueryClient;
}) => {
  const transitionedFromQueued =
    previousStatus.current === "queued" &&
    currentStatus !== undefined &&
    currentStatus !== "queued";
  previousStatus.current = currentStatus;
  if (transitionedFromQueued) {
    void queryClient.invalidateQueries({
      exact: true,
      queryKey: onboardingQueryKeys.progress(),
    });
  }
};

const createOnboardingCommandOptions = (
  queryClient: QueryClient,
): MutationObserverOptions<
  OwnerCommandReceipt,
  Error,
  OnboardingCaseCommand,
  MutationContext
> => ({
  mutationFn: executeOnboardingCaseCommand,
  onError: (_error, _command, context) => {
    queryClient.setQueryData(
      onboardingQueryKeys.progress(),
      context?.previousProgress,
    );
    toast.error("Onboarding Case command was rejected");
  },
  onMutate: async (command) => {
    await Promise.all([
      queryClient.cancelQueries({
        queryKey: onboardingQueryKeys.progress(),
      }),
      queryClient.cancelQueries({
        queryKey: ownerCommandQueryKeys.onboarding(),
      }),
    ]);
    const previousProgress = queryClient.getQueryData<OnboardingProgress>(
      onboardingQueryKeys.progress(),
    );
    queryClient.setQueryData<OnboardingProgress>(
      onboardingQueryKeys.progress(),
      (current) => {
        if (
          current?.focusCase === null ||
          current?.focusCase.identity !== command.caseIdentity
        ) {
          return current;
        }
        return {
          ...current,
          cases: {
            ...current.cases,
            queued: current.cases.queued + 1,
            resolved:
              command.action === "reaudit"
                ? current.cases.resolved - 1
                : current.cases.resolved,
            suspended:
              command.action === "resume"
                ? current.cases.suspended - 1
                : current.cases.suspended,
          },
          focusCase: {
            ...current.focusCase,
            nextAction: "Run onboarding preflight",
            stage:
              command.action === "reaudit"
                ? "preflight"
                : current.focusCase.stage,
            status: "queued",
            terminal: false,
            waitReason: null,
          },
        };
      },
    );
    toast(
      command.action === "reaudit"
        ? "Onboarding re-audit queued"
        : "Onboarding resume queued",
    );
    return { previousProgress };
  },
  onSettled: async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        exact: true,
        queryKey: onboardingQueryKeys.progress(),
      }),
      queryClient.invalidateQueries({
        exact: true,
        queryKey: ownerCommandQueryKeys.onboarding(),
      }),
    ]);
  },
  onSuccess: (receipt) => {
    queryClient.setQueryData(ownerCommandQueryKeys.onboarding(), receipt);
  },
});

export type OnboardingCaseCommandStatus =
  "checking" | "failed" | "queued" | "ready" | "unavailable";

export const useOnboardingCaseCommand = () => {
  const queryClient = useQueryClient();
  const progressQuery = useQuery(onboardingProgressQueryOptions);
  const receiptQuery = useQuery(onboardingCommandReceiptQueryOptions);
  const mutation = useCommandMutation<
    OwnerCommandReceipt,
    Error,
    OnboardingCaseCommand,
    MutationContext
  >(createOnboardingCommandOptions);
  const submitting = useRef(false);
  const previousReceiptStatus = useRef<ReceiptStatus>(undefined);
  const receiptStatus = receiptQuery.data?.status;
  useEffect(() => {
    refreshProgressAfterTerminalReceipt({
      currentStatus: receiptStatus,
      previousStatus: previousReceiptStatus,
      queryClient,
    });
  }, [queryClient, receiptStatus]);
  const focusCase = progressQuery.data?.focusCase;
  const action = focusCase?.status === "resolved" ? "reaudit" : "resume";
  const isQueued =
    focusCase?.status === "queued" ||
    mutation.isPending ||
    receiptQuery.data?.status === "queued";
  let status: OnboardingCaseCommandStatus = "ready";
  if (isQueued) {
    status = "queued";
  } else if (progressQuery.isError || receiptQuery.isError) {
    status = "unavailable";
  } else if (
    progressQuery.isPending ||
    receiptQuery.isPending ||
    progressQuery.isFetching ||
    receiptQuery.isFetching
  ) {
    status = "checking";
  } else if (receiptQuery.data?.status === "failed") {
    status = "failed";
  }

  const queue = () => {
    if (status === "failed") {
      submitting.current = false;
    }
    if (
      submitting.current ||
      focusCase === null ||
      focusCase === undefined ||
      (focusCase.status !== "suspended" && focusCase.status !== "resolved") ||
      (status !== "ready" && status !== "failed")
    ) {
      return;
    }
    submitting.current = true;
    mutation.mutate(
      {
        action,
        caseIdentity: focusCase.identity,
        expectedRevision: focusCase.revision,
        family: "resume_onboarding",
        idempotencyKey: crypto.randomUUID(),
        schemaVersion: 1,
      },
      {
        onSettled: () => {
          submitting.current = false;
        },
      },
    );
  };

  return {
    action,
    canQueue:
      focusCase !== null &&
      focusCase !== undefined &&
      (focusCase.status === "suspended" || focusCase.status === "resolved") &&
      (status === "ready" || status === "failed"),
    queue,
    status,
  };
};
