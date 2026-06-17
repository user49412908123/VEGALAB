"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { motion } from "framer-motion";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import MetricSlider from "../components/MetricSlider";
import { sessionTypes } from "../lib/demoData";
import {
  deleteCycle,
  deleteSession,
  insertCycle,
  insertSession,
  loadVegalabData,
  updateCycle,
  updateSession,
} from "../lib/vegalabData";
import styles from "./sequenceur.module.css";

const localIsoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const todayIso = localIsoDate(new Date());

const addDays = (date, days) => {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + days);
  return localIsoDate(next);
};

const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!hours) return `${minutes} min`;
  if (!remaining) return `${hours} h`;
  return `${hours} h ${String(remaining).padStart(2, "0")}`;
};

const locations = ["Charleroi", "Bruxelles", "Anvers", "Nivelles", "Autre"];
const cycleColors = [
  { value: "pink", label: "Rose" },
  { value: "green", label: "Vert" },
  { value: "blue", label: "Bleu" },
  { value: "amber", label: "Ambre" },
  { value: "slate", label: "Gris" },
];

const durationOptions = [30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390, 420];

const filters = [
  { id: "today", label: "Aujourd'hui", days: 0 },
  { id: "3", label: "3 prochains jours", days: 3 },
  { id: "7", label: "7 prochains jours", days: 7 },
  { id: "all", label: "Toutes", days: null },
];

const sessionSchema = z.object({
  cycle_id: z.string().default(""),
  name: z.string().min(2, "Nom requis"),
  date: z.string().min(10),
  time: z.string().min(4),
  duration: z.coerce.number().min(15).max(240),
  location: z.enum(locations),
  objective: z.string().optional(),
  notes: z.string().optional(),
  type: z.enum(sessionTypes),
  rpe: z.coerce.number().min(1).max(10),
  internal_load: z.coerce.number().min(1).max(100),
  predicted_muscular_form: z.coerce.number().min(1).max(10),
  predicted_finger_form: z.coerce.number().min(1).max(10),
  predicted_neural_form: z.coerce.number().min(1).max(10),
  predicted_general_form: z.coerce.number().min(1).max(10),
  success_rate: z.coerce.number().min(1).max(100),
  motivation: z.coerce.number().min(1).max(10),
  one_arm_hang_feeling: z.coerce.number().min(1).max(10),
  explosive_pull_feeling: z.coerce.number().min(1).max(10),
});

const defaultSession = {
  cycle_id: "",
  name: "Nouvelle séance",
  date: todayIso,
  time: "18:30",
  duration: 75,
  location: "Charleroi",
  objective: "",
  notes: "",
  type: "Force",
  rpe: 6,
  internal_load: 55,
  predicted_muscular_form: 7,
  predicted_finger_form: 7,
  predicted_neural_form: 7,
  predicted_general_form: 7,
  success_rate: 70,
  motivation: 7,
  one_arm_hang_feeling: 6,
  explosive_pull_feeling: 6,
};

const cycleSchema = z.object({
  name: z.string().min(2, "Nom requis"),
  start_date: z.string().min(10),
  end_date: z.string().min(10),
  objective: z.string().optional(),
  main_theme: z.string().min(2, "Theme requis"),
  color: z.enum(cycleColors.map((color) => color.value)),
});

const defaultCycle = {
  name: "Nouveau cycle",
  start_date: todayIso,
  end_date: addDays(todayIso, 21),
  objective: "",
  main_theme: "Force doigts",
  color: "pink",
};

const formatDay = (date) =>
  new Intl.DateTimeFormat("fr-BE", { weekday: "short", day: "2-digit", month: "short" }).format(
    new Date(`${date}T12:00:00`),
  );

const prepareSessionPayload = (values) => ({
  ...values,
  cycle_id: values.cycle_id || null,
});

const sessionDefaultsFrom = (session) => ({
  ...defaultSession,
  ...session,
  cycle_id: session.cycle_id ?? "",
  location: locations.includes(session.location) ? session.location : "Autre",
});

export default function SequenceurPage() {
  const [sessions, setSessions] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [sessionModal, setSessionModal] = useState({ open: false, mode: "create", item: null });
  const [cycleModal, setCycleModal] = useState({ open: false, mode: "create", item: null });
  const [duplicate, setDuplicate] = useState(null);
  const [filter, setFilter] = useState("7");
  const [saving, setSaving] = useState(false);
  const [cycleSaving, setCycleSaving] = useState(false);
  const [syncError, setSyncError] = useState("");

  const form = useForm({ resolver: zodResolver(sessionSchema), defaultValues: defaultSession });
  const cycleForm = useForm({ resolver: zodResolver(cycleSchema), defaultValues: defaultCycle });

  useEffect(() => {
    let active = true;
    const selected = filters.find((item) => item.id === filter);
    const days = selected?.days ?? 7;
    loadVegalabData(days === null ? null : days).then((data) => {
      if (!active) return;
      setSessions(data.sessions);
      setCycles(data.cycles);
      setSyncError("");
    }).catch((error) => {
      if (!active) return;
      console.error("Failed to load Supabase data:", error);
      setSyncError("Impossible de charger les données Supabase.");
    });
    return () => {
      active = false;
    };
  }, [filter]);

  const visibleSessions = useMemo(() => {
    return [...sessions].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }, [sessions]);

  const openNewSession = () => {
    form.reset({ ...defaultSession, cycle_id: cycles[0]?.id ?? "" });
    setSessionModal({ open: true, mode: "create", item: null });
  };

  const openEditSession = (session) => {
    form.reset(sessionDefaultsFrom(session));
    setSessionModal({ open: true, mode: "edit", item: session });
  };

  const openNewCycle = () => {
    cycleForm.reset(defaultCycle);
    setCycleModal({ open: true, mode: "create", item: null });
  };

  const openEditCycle = (cycle) => {
    cycleForm.reset({ ...defaultCycle, ...cycle });
    setCycleModal({ open: true, mode: "edit", item: cycle });
  };

  const onSubmit = async (values) => {
    setSaving(true);
    setSyncError("");
    const payload = prepareSessionPayload(values);
    const editingId = sessionModal.item?.id;
    try {
      const saved = editingId ? await updateSession(editingId, payload) : await insertSession(payload);
      setSessions((current) =>
        editingId
          ? current.map((session) => (session.id === editingId ? saved : session))
          : [...current, saved],
      );
      setSessionModal({ open: false, mode: "create", item: null });
    } catch (error) {
      console.error("Failed to save session:", error);
      setSyncError("La séance n'a pas pu être enregistrée dans Supabase.");
    } finally {
      setSaving(false);
    }
  };

  const onCycleSubmit = async (values) => {
    setCycleSaving(true);
    setSyncError("");
    const editingId = cycleModal.item?.id;
    try {
      const saved = editingId ? await updateCycle(editingId, values) : await insertCycle(values);
      setCycles((current) =>
        editingId ? current.map((cycle) => (cycle.id === editingId ? saved : cycle)) : [...current, saved],
      );
      setCycleModal({ open: false, mode: "create", item: null });
    } catch (error) {
      console.error("Failed to save cycle:", error);
      setSyncError("Le cycle n'a pas pu être enregistré dans Supabase.");
    } finally {
      setCycleSaving(false);
    }
  };

  const removeSession = async (session) => {
    if (!window.confirm(`Supprimer "${session.name}" ?`)) return;
    setSyncError("");
    try {
      await deleteSession(session.id);
      setSessions((current) => current.filter((item) => item.id !== session.id));
      setSessionModal({ open: false, mode: "create", item: null });
    } catch (error) {
      console.error("Failed to delete session:", error);
      setSyncError("La suppression de la séance a échoué.");
    }
  };

  const removeCycle = async (cycle) => {
    if (!window.confirm(`Supprimer le cycle "${cycle.name}" ?`)) return;
    setSyncError("");
    try {
      await deleteCycle(cycle.id);
      setCycles((current) => current.filter((item) => item.id !== cycle.id));
      setSessions((current) =>
        current.map((session) => ({
          ...session,
          cycle_id: session.cycle_id === cycle.id ? null : session.cycle_id,
        })),
      );
      setCycleModal({ open: false, mode: "create", item: null });
    } catch (error) {
      console.error("Failed to delete cycle:", error);
      setSyncError("La suppression du cycle a échoué.");
    }
  };

  const duplicateSession = async (session, dayOffset) => {
    const payload = {
      ...sessionDefaultsFrom(session),
      id: undefined,
      date: addDays(session.date, dayOffset),
      name: `${session.name} bis`,
    };
    try {
      const saved = await insertSession(prepareSessionPayload(payload));
      setSessions((current) => [...current, saved]);
    } catch (error) {
      console.error("Failed to duplicate session:", error);
      setSyncError("La duplication de la séance a échoué.");
    }
    setDuplicate(null);
  };

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div>
          <span className={styles.kicker}>Séquenceur</span>
          <h1>Planning d&apos;entraînement.</h1>
          <p>Une timeline compacte pour programmer, ajuster et relier les séances aux cycles.</p>
        </div>
        <div className={styles.heroActions}>
          <button className={styles.secondaryButton} type="button" onClick={openNewCycle}>
            Cycle
          </button>
          <button className={styles.primaryButton} type="button" onClick={openNewSession}>
            Séance
          </button>
        </div>
      </div>

      {syncError ? <p style={{ color: "var(--danger)", marginTop: 12 }}>{syncError}</p> : null}

      <div className={styles.filters} aria-label="Filtrer les séances">
        {filters.map((item) => (
          <button
            key={item.id}
            className={filter === item.id ? styles.filterActive : ""}
            type="button"
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={styles.cycles} aria-label="Cycles">
        {cycles.map((cycle) => (
          <article key={cycle.id ?? cycle.name} className={styles.cycle}>
            <button
              type="button"
              className={styles.cycleBody}
              onClick={() => openEditCycle(cycle)}
            >
              <span className={`${styles.cycleDot} ${styles[cycle.color] ?? styles.pink}`} aria-hidden="true" />
              <div className={styles.cycleCopy}>
                <span>{cycle.main_theme}</span>
                <strong>{cycle.name}</strong>
                <small>
                  {cycle.start_date} → {cycle.end_date}
                </small>
                {cycle.objective ? <p>{cycle.objective}</p> : null}
              </div>
            </button>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger
                className={styles.select}
                type="button"
                onClick={(e) => e.stopPropagation()}
                aria-label="Cycle options"
              >
                ⋯
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className={styles.menu} sideOffset={8}>
                  <DropdownMenu.Item
                    className={styles.menuItem}
                    onSelect={() => openEditCycle(cycle)}
                  >
                    Modifier
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className={styles.menuItem}
                    onSelect={() => removeCycle(cycle)}
                  >
                    Supprimer
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </article>
        ))}
      </div>

      <div className={styles.timeline}>
        {visibleSessions.map((session, index) => (
          <SessionCard
            key={session.id ?? `${session.date}-${session.name}`}
            session={session}
            cycles={cycles.filter((cycle) => session.cycle_id === cycle.id)}
            index={index}
            onEdit={openEditSession}
            onDelete={removeSession}
            onDuplicate={setDuplicate}
            onSwipeDuplicate={() => duplicateSession(session, 1)}
          />
        ))}
        {!visibleSessions.length ? <p className={styles.empty}>Aucune séance dans cette période.</p> : null}
      </div>

      <SessionDialog
        cycles={cycles}
        form={form}
        modal={sessionModal}
        saving={saving}
        onClose={() => setSessionModal({ open: false, mode: "create", item: null })}
        onSubmit={onSubmit}
        onDelete={removeSession}
      />

      <CycleDialog
        form={cycleForm}
        modal={cycleModal}
        saving={cycleSaving}
        onClose={() => setCycleModal({ open: false, mode: "create", item: null })}
        onSubmit={onCycleSubmit}
        onDelete={removeCycle}
      />

      <Dialog.Root open={Boolean(duplicate)} onOpenChange={() => setDuplicate(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.overlay} />
          <Dialog.Content className={styles.duplicateSheet}>
            <Dialog.Title className={styles.sheetTitle}>Dupliquer la séance</Dialog.Title>
            <p className={styles.duplicateText}>{duplicate?.name}</p>
            <div className={styles.duplicateGrid}>
              {[1, 2, 3, 7].map((offset) => (
                <button key={offset} type="button" onClick={() => duplicateSession(duplicate, offset)}>
                  J+{offset}
                </button>
              ))}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}

function DurationPicker({ control, name, options }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className={styles.durationPicker}>
          <span>Durée</span>
          <div className={styles.durationGrid}>
            {options.map((duration) => {
              const selected = Number(field.value) === Number(duration);
              return (
                <button
                  key={duration}
                  type="button"
                  className={selected ? styles.durationActive : ""}
                  onClick={() => field.onChange(duration)}
                >
                  {formatDuration(duration)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    />
  );
}

function SessionDialog({ cycles, form, modal, saving, onClose, onSubmit, onDelete }) {
  return (
    <Dialog.Root open={modal.open} onOpenChange={(open) => (!open ? onClose() : null)}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.sheet}>
          <Dialog.Title className={styles.sheetTitle}>
            {modal.mode === "edit" ? "Modifier la séance" : "Programmer une séance"}
          </Dialog.Title>
          <form className={styles.form} onSubmit={form.handleSubmit(onSubmit)}>
            <label>
              Nom
              <input {...form.register("name")} />
            </label>
            <div className={styles.formGrid}>
              <label>
                Date
                <input type="date" {...form.register("date")} />
              </label>
              <label>
                Heure
                <input type="time" {...form.register("time")} />
              </label>
            </div>

            <DropdownField control={form.control} name="type" options={sessionTypes} />
            <DropdownField control={form.control} name="location" options={locations} />

            <DropdownField
              control={form.control}
              name="cycle_id"
              options={["", ...cycles.map((cycle) => cycle.id)]}
              labels={Object.fromEntries([
                ["", "Aucun cycle"],
                ...cycles.map((cycle) => [cycle.id, cycle.name]),
              ])}
            />

            <DurationPicker control={form.control} name="duration" options={durationOptions} />

            <label>
              Objectif
              <textarea rows="2" {...form.register("objective")} />
            </label>

            <MetricSlider control={form.control} name="rpe" label="RPE" />
            <MetricSlider control={form.control} name="internal_load" label="Charge interne" max={100} />
            <MetricSlider control={form.control} name="predicted_finger_form" label="Forme doigts presentie" />
            <MetricSlider control={form.control} name="predicted_muscular_form" label="Forme musculaire" />
            <MetricSlider control={form.control} name="predicted_neural_form" label="Forme nerveuse" />
            <MetricSlider control={form.control} name="predicted_general_form" label="Forme generale" />
            <MetricSlider control={form.control} name="success_rate" label="Taux de réussite" max={100} />
            <MetricSlider control={form.control} name="motivation" label="Motivation" />
            <MetricSlider control={form.control} name="one_arm_hang_feeling" label="Suspension un bras" />
            <MetricSlider control={form.control} name="explosive_pull_feeling" label="Traction explosive" />

            <label>
              Notes libres
              <textarea rows="3" {...form.register("notes")} />
            </label>

            <div className={styles.sheetActions}>
              {modal.mode === "edit" ? (
                <button className={styles.dangerButton} type="button" onClick={() => onDelete(modal.item)}>
                  Supprimer
                </button>
              ) : (
                <Dialog.Close className={styles.secondaryButton} type="button">
                  Annuler
                </Dialog.Close>
              )}
              <button className={styles.primaryButton} type="submit" disabled={saving}>
                {saving ? "Sauvegarde..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CycleDialog({ form, modal, saving, onClose, onSubmit, onDelete }) {
  return (
    <Dialog.Root open={modal.open} onOpenChange={(open) => (!open ? onClose() : null)}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.sheet}>
          <Dialog.Title className={styles.sheetTitle}>
            {modal.mode === "edit" ? "Modifier le cycle" : "Créer un cycle"}
          </Dialog.Title>
          <form className={styles.form} onSubmit={form.handleSubmit(onSubmit)}>
            <label>
              Nom
              <input {...form.register("name")} />
            </label>
            <div className={styles.formGrid}>
              <label>
                Debut
                <input type="date" {...form.register("start_date")} />
              </label>
              <label>
                Fin
                <input type="date" {...form.register("end_date")} />
              </label>
            </div>
            <label>
              Theme principal
              <input {...form.register("main_theme")} />
            </label>
            <DropdownField
              control={form.control}
              name="color"
              options={cycleColors.map((color) => color.value)}
              labels={Object.fromEntries(cycleColors.map((color) => [color.value, color.label]))}
            />
            <label>
              Objectif
              <textarea rows="3" {...form.register("objective")} />
            </label>
            <div className={styles.sheetActions}>
              {modal.mode === "edit" ? (
                <button className={styles.dangerButton} type="button" onClick={() => onDelete(modal.item)}>
                  Supprimer
                </button>
              ) : (
                <Dialog.Close className={styles.secondaryButton} type="button">
                  Annuler
                </Dialog.Close>
              )}
              <button className={styles.primaryButton} type="submit" disabled={saving}>
                {saving ? "Sauvegarde..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DropdownField({ control, name, options, labels = {} }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger className={styles.select} type="button">
            {labels[field.value] ?? field.value}
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className={styles.menu} sideOffset={8}>
              {options.map((option) => (
                <DropdownMenu.Item
                  key={option}
                  className={styles.menuItem}
                  onSelect={() => field.onChange(option)}
                >
                  {labels[option] ?? option}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    />
  );
}

function SessionCard({ session, cycles, index, onEdit, onDelete, onDuplicate, onSwipeDuplicate }) {
  const pressTimer = useRef(null);
  const startX = useRef(0);

  const clearPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  return (
    <motion.article
      className={styles.session}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      onPointerDown={(event) => {
        startX.current = event.clientX;
        pressTimer.current = setTimeout(() => onDuplicate(session), 560);
      }}
      onPointerUp={(event) => {
        const delta = event.clientX - startX.current;
        clearPress();
        if (Math.abs(delta) > 70) onSwipeDuplicate(session);
      }}
      onPointerCancel={clearPress}
      onPointerLeave={clearPress}
    >
      <button className={styles.sessionBody} type="button" onClick={() => onEdit(session)}>
        <div className={styles.sessionTop}>
          <div>
            <time>{formatDay(session.date)}</time>
            <h2>{session.name}</h2>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span>{session.time}</span>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger
                className={styles.select}
                type="button"
                onClick={(e) => e.stopPropagation()}
                aria-label="Options séance"
              >
                ⋯
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className={styles.menu} sideOffset={8}>
                  <DropdownMenu.Item
                    className={styles.menuItem}
                    onSelect={() => onEdit(session)}
                  >
                    Modifier
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className={styles.menuItem}
                    onSelect={() => onDelete(session)}
                  >
                    Supprimer
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
        {session.objective ? <p>{session.objective}</p> : null}
        <div className={styles.sessionMeta}>
          <span>{session.location}</span>
        </div>
        {cycles.length ? (
          <div className={styles.cycleLinks}>
            {cycles.map((cycle) => (
              <span key={cycle.id} className={styles[cycle.color] ?? styles.pink}>
                {cycle.name}
              </span>
            ))}
          </div>
        ) : null}
      </button>
    </motion.article>
  );
}
