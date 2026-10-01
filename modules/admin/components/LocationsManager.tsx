"use client";

import { useState, type FormEvent } from "react";
import { MapPin, Plus, X } from "lucide-react";
import type { CityLocation } from "@/types";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { formatNumber } from "@/lib/utils";
import { hospitalService } from "@/services/hospitalService";

export function LocationsManager({ initial }: { initial: CityLocation[] }) {
  const toast = useToast();
  const [rows, setRows] = useState(initial);
  const [target, setTarget] = useState<CityLocation | "new" | null>(null);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<{ city: string; area: string } | null>(null);

  function open(t: CityLocation | "new") {
    setTarget(t);
    setName("");
    setErr(undefined);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const n = name.trim().replace(/\s+/g, " ");
    if (n.length < 2) return setErr(target === "new" ? "Enter a city name." : "Enter an area name.");
    const exists = target === "new"
      ? rows.some((r) => r.city.toLowerCase() === n.toLowerCase())
      : target?.areas.some((a) => a.toLowerCase() === n.toLowerCase());
    if (exists) return setErr(`${n} is already listed.`);
    setBusy(true);
    try {
      if (target === "new") {
        const saved = await hospitalService.saveLocation({ city: n, areas: [] });
        setRows((xs) => [...xs, { id: saved.id ?? `loc-${Date.now()}`, city: n, areas: [], activeDonors: 0, openRequests: 0, facilities: 0 }]);
        toast.success(`${n} added.`, "Add its areas so donors can pick them.");
      } else if (target) {
        const areas = [...target.areas, n].sort();
        await hospitalService.saveLocation({ id: target.id, city: target.city, areas });
        setRows((xs) => xs.map((x) => (x.id === target.id ? { ...x, areas } : x)));
        toast.success(`${n} added to ${target.city}.`);
      }
      setTarget(null);
    } catch (err) {
      setErr(err instanceof Error ? err.message : "Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removeArea() {
    if (!removing) return;
    const city = rows.find((x) => x.city === removing.city);
    if (!city) return;
    const areas = city.areas.filter((a) => a !== removing.area);
    setBusy(true);
    try {
      await hospitalService.saveLocation({ id: city.id, city: city.city, areas });
      setRows((xs) => xs.map((x) => (x.id === city.id ? { ...x, areas } : x)));
      toast.success(`${removing.area} removed from ${removing.city}.`);
      setRemoving(null);
    } catch (err) {
      toast.error("Couldn't remove this area.", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button icon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => open("new")}>Add city</Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((c) => (
          <Card key={c.id}>
            <CardHeader
              title={c.city}
              description={`${c.areas.length} areas`}
              action={<Button size="sm" variant="outline" icon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => open(c)}>Add area</Button>}
            />
            <dl className="grid grid-cols-3 divide-x divide-line border-y border-line text-center">
              {[
                ["Active donors", formatNumber(c.activeDonors)],
                ["Open requests", c.openRequests],
                ["Facilities", c.facilities],
              ].map(([k, v]) => (
                <div key={k} className="px-2 py-3">
                  <dt className="text-xs text-ink-500">{k}</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums text-ink-900">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="p-5">
              {c.areas.length ? (
                <ul className="flex flex-wrap gap-2" aria-label={`Areas in ${c.city}`}>
                  {c.areas.map((a) => (
                    <li key={a} className="inline-flex items-center gap-1 rounded-full border border-line bg-paper py-1 pl-3 pr-1 text-[13px] text-ink-700">
                      <MapPin className="h-3.5 w-3.5 text-ink-400" aria-hidden />
                      {a}
                      <button type="button" onClick={() => setRemoving({ city: c.city, area: a })} className="ml-0.5 grid h-6 w-6 place-items-center rounded-full text-ink-400 hover:bg-hemo-50 hover:text-hemo-700" aria-label={`Remove ${a}`}>
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-500">No areas yet. Add at least one so donors in {c.city} can register.</p>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={target !== null}
        onClose={() => setTarget(null)}
        title={target === "new" ? "Add city" : `Add area to ${target ? target.city : ""}`}
        description="Areas are used for approximate donor matching. Exact addresses are never stored."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
            <Button type="submit" form="location-form" loading={busy} loadingText="Adding…">Add</Button>
          </>
        }
      >
        <form id="location-form" onSubmit={save} noValidate>
          <Input id="loc-name" label={target === "new" ? "City name" : "Area name"} required value={name} onChange={(e) => { setName(e.target.value); setErr(undefined); }} error={err} placeholder={target === "new" ? "Gujranwala" : "Valencia Town"} />
        </form>
      </Modal>

      <ConfirmDialog
        open={removing !== null}
        title={`Remove ${removing?.area ?? "area"}?`}
        description="Donors already registered in this area keep their profile; they will be asked to choose a new area next time they sign in."
        confirmLabel="Remove area"
        loading={busy}
        onConfirm={removeArea}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
}
