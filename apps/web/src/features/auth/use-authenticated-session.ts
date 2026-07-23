import { useQuery } from "@tanstack/react-query";

import { sessionQueryOptions } from "./session.query";

export const useAuthenticatedSession = () =>
  useQuery(sessionQueryOptions).data?.authenticated === true;
