import { useRef } from "react";

import { useOptimisticOwnerCommand } from "./use-optimistic-owner-command";

export const useHealthRefreshCommand = () => {
  const command = useOptimisticOwnerCommand();
  const submitting = useRef(false);

  const queue = () => {
    if (submitting.current || !command.canExecute) {
      return;
    }
    submitting.current = true;
    command.execute(
      {
        family: "refresh_health",
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
    canQueue: command.canExecute,
    isQueued: command.isQueued,
    queue,
    status: command.status,
  };
};
