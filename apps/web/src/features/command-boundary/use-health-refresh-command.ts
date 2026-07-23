import { useRef } from "react";

import { useOptimisticOwnerCommand } from "./use-optimistic-owner-command";

export const useHealthRefreshCommand = () => {
  const command = useOptimisticOwnerCommand();
  const submitting = useRef(false);

  const queue = () => {
    if (submitting.current || command.isQueued) {
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

  return { isQueued: command.isQueued, queue };
};
