import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
} from "@stockhawk/ui/command";
import { Activity, Search } from "lucide-react";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

const commands = [
  { destination: "/", label: "Search offers" },
  { destination: "/health", label: "View service health" },
] as const;

type Destination = (typeof commands)[number]["destination"];

const subscribeCommandShortcut = (
  setOpen: Dispatch<SetStateAction<boolean>>,
) => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") {
      return;
    }
    event.preventDefault();
    setOpen((current) => !current);
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
};

export const CommandMenu = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchingCommands = commands.filter((command) =>
    command.label.toLocaleLowerCase().includes(normalizedQuery),
  );

  useEffect(() => subscribeCommandShortcut(setOpen), []);

  const chooseDestination = (destination: Destination) => {
    setOpen(false);
    setQuery("");
    window.location.assign(destination);
  };

  return (
    <CommandDialog onOpenChange={setOpen} open={open}>
      <CommandInput
        onChange={(event) => setQuery(event.currentTarget.value)}
        placeholder="Search commands…"
        value={query}
      />
      <div className="p-1.5">
        {matchingCommands.length === 0 ? (
          <CommandEmpty>No commands found.</CommandEmpty>
        ) : (
          matchingCommands.map((command) => {
            const Icon = command.destination === "/" ? Search : Activity;
            return (
              <CommandItem
                key={command.destination}
                onClick={() => chooseDestination(command.destination)}
              >
                <Icon aria-hidden="true" size={16} />
                {command.label}
              </CommandItem>
            );
          })
        )}
      </div>
    </CommandDialog>
  );
};
