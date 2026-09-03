// Profile picker component — TASKS.md §2. Thin Ink layer over profile-picker.ts's classification
// plus profiles/store.ts's real loaders. Integration/manual, not unit-tested, per this project's
// convention — the parsing logic it calls is what's actually tested.

import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { parseProfilePickerInput } from "./profile-picker.ts";
import { loadProfileFromUrl } from "../profiles/store.ts";
import type { Profile, UntrustedProfile } from "../profiles/types.ts";

export interface ProfilePickerProps {
  availableProfiles: readonly Profile[];
  onSelect: (profile: Profile | UntrustedProfile) => void;
  /** Invoked on Esc, so the picker isn't a dead end. */
  onCancel?: () => void;
}

export function ProfilePicker({ availableProfiles, onSelect, onCancel }: ProfilePickerProps) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  function submit() {
    const parsed = parseProfilePickerInput(input);

    if (parsed.kind === "name") {
      const found = availableProfiles.find((p) => p.id === parsed.name || p.name === parsed.name);
      if (found === undefined) {
        setStatus(`no profile named "${parsed.name}" found`);
        return;
      }
      setStatus(undefined);
      onSelect(found);
      return;
    }

    setLoading(true);
    setStatus(`loading ${parsed.url} (untrusted source)...`);
    loadProfileFromUrl(parsed.url).then((result) => {
      setLoading(false);
      if (!result.ok) {
        setStatus(result.error);
        return;
      }
      setStatus(undefined);
      onSelect(result.profile);
    });
  }

  // Esc only. Text editing itself is delegated to ink-text-input below, which is the point of
  // using it: this field previously hand-rolled character handling and silently dropped anything
  // arriving as a multi-character chunk — i.e. every paste, which is exactly how a profile URL
  // gets entered.
  useInput((_char, key) => {
    if (loading) return;
    if (key.escape) onCancel?.();
  });

  // Listing the available profiles is the whole difference between a usable picker and a blank
  // prompt: without it you have to already know the exact profile ids to type, so shipped profiles
  // are effectively invisible. Names are shown alongside ids because either is accepted.
  return (
    <Box flexDirection="column">
      {availableProfiles.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Available profiles</Text>
          {availableProfiles.map((p) => (
            <Text key={p.id}>
              <Text color="cyan">{p.id}</Text>
              <Text dimColor>
                {` — ${p.description} (${p.entryKeys.length} ${
                  p.entryKeys.length === 1 ? "entry" : "entries"
                })`}
              </Text>
            </Text>
          ))}
        </Box>
      )}
      <Box>
        <Text>Profile name or URL:</Text>
        <TextInput value={input} onChange={setInput} onSubmit={submit} />
      </Box>
      {status && <Text color="yellow">{status}</Text>}
    </Box>
  );
}
