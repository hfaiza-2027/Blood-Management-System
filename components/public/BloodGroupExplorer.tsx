"use client";

import { useState } from "react";
import type { BloodGroup } from "@/types";
import { BLOOD_GROUPS, BLOOD_GROUP_NOTES, canDonateTo, canReceiveFrom } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function BloodGroupExplorer() {
  const [group, setGroup] = useState<BloodGroup>("O-");
  const gives = canDonateTo(group);
  const gets = canReceiveFrom(group);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <p id="bg-picker-label" className="text-sm font-semibold text-ink-800">Choose a blood group</p>
        <div role="radiogroup" aria-labelledby="bg-picker-label" className="mt-3 grid grid-cols-4 gap-2">
          {BLOOD_GROUPS.map((g) => (
            <button
              key={g}
              role="radio"
              aria-checked={g === group}
              onClick={() => setGroup(g)}
              className={cn(
                "h-14 rounded-md border text-lg font-bold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hemo-500 focus-visible:ring-offset-2",
                g === group ? "border-hemo-600 bg-hemo-600 text-white" : "border-line bg-white text-ink-800 hover:border-ink-300",
              )}
            >
              {g}
            </button>
          ))}
        </div>
        <p className="mt-5 text-[15px] leading-relaxed text-ink-600" aria-live="polite">
          <span className="font-semibold text-ink-900">{group}.</span> {BLOOD_GROUP_NOTES[group]}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { title: "Can give red cells to", list: gives },
          { title: "Can receive red cells from", list: gets },
        ].map((col) => (
          <div key={col.title} className="rounded-card border border-line bg-paper p-5">
            <p className="text-sm font-semibold text-ink-800">{col.title}</p>
            <ul className="mt-4 grid grid-cols-4 gap-2">
              {BLOOD_GROUPS.map((g) => {
                const on = col.list.includes(g);
                return (
                  <li
                    key={g}
                    className={cn("flex h-10 items-center justify-center rounded text-sm font-semibold tabular-nums", on ? "bg-ink-900 text-white" : "bg-white text-ink-300 line-through decoration-ink-200")}
                  >
                    <span className="sr-only">{on ? "Yes: " : "No: "}</span>
                    {g}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[13px] text-ink-500">{col.list.length} of 8 groups</p>
          </div>
        ))}
        <p className="text-[13px] text-ink-500 sm:col-span-2">Compatibility shown is for red cell transfusion. Hospitals always cross-match before transfusing.</p>
      </div>
    </div>
  );
}
