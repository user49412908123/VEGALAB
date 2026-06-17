"use client";

import { useMemo, useState } from "react";
import * as Switch from "@radix-ui/react-switch";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import MetricSlider from "../components/MetricSlider";
import { upsertTelemetry } from "../lib/vegalabData";
import styles from "./calibration.module.css";

const todayIso = new Date().toISOString().slice(0, 10);

const schema = z.object({
  date: z.string().min(10),
  sleep_quality: z.coerce.number().min(1).max(10),
  bedtime: z.string(),
  wake_time: z.string(),
  naps_count: z.coerce.number().min(0).max(4),
  naps_total_duration: z.coerce.number().min(0).max(120),
  work_stress: z.coerce.number().min(1).max(10),
  work_volume: z.coerce.number().min(1).max(10),
  personal_stress: z.coerce.number().min(1).max(10),
  work_satisfaction: z.coerce.number().min(1).max(10),
  motivation: z.coerce.number().min(1).max(10),
  confidence: z.coerce.number().min(1).max(10),
  mood: z.coerce.number().min(1).max(10),
  meditation: z.boolean(),
  hydration: z.coerce.number().min(1).max(10),
  breakfast_quality: z.coerce.number().min(1).max(10),
  lunch_quality: z.coerce.number().min(1).max(10),
  dinner_quality: z.coerce.number().min(1).max(10),
  morning_mobility: z.boolean(),
  soreness_index: z.coerce.number().min(1).max(10),
  screen_interactions: z.coerce.number().min(1).max(10),
});

const defaults = {
  date: todayIso,
  sleep_quality: 7,
  bedtime: "23:00",
  wake_time: "07:00",
  naps_count: 0,
  naps_total_duration: 0,
  work_stress: 5,
  work_volume: 5,
  personal_stress: 4,
  work_satisfaction: 7,
  motivation: 7,
  confidence: 7,
  mood: 7,
  meditation: false,
  hydration: 7,
  breakfast_quality: 7,
  lunch_quality: 7,
  dinner_quality: 7,
  morning_mobility: true,
  soreness_index: 4,
  screen_interactions: 6,
};

// status strings will use accents
const STATUS_PRET = "Prêt";
const STATUS_SAVING = "Sauvegarde…";
const STATUS_SYNC = "Synchronisé avec Supabase";
const STATUS_LOCAL = "Sauvegarde locale simulée";

const timeOptions = Array.from({ length: 24 * 2 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, "0");
  const minute = index % 2 === 0 ? "00" : "30";
  return `${hour}:${minute}`;
});

export default function CalibrationPage() {
  const [status, setStatus] = useState(STATUS_PRET);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: defaults });
  const values = useWatch({ control: form.control });

  const readiness = useMemo(() => {
    const recovery = (values.sleep_quality + values.hydration + (11 - values.soreness_index)) / 3;
    const mind = (values.motivation + values.confidence + values.mood + (11 - values.work_stress)) / 4;
    return Math.round(((recovery + mind) / 2) * 10);
  }, [
    values.confidence,
    values.hydration,
    values.mood,
    values.motivation,
    values.sleep_quality,
    values.soreness_index,
    values.work_stress,
  ]);

  const onSubmit = async (payload) => {
    setStatus(STATUS_SAVING);
    try {
      await upsertTelemetry(payload);
      setStatus(STATUS_SYNC);
    } catch {
      setStatus(STATUS_LOCAL);
    }
  };

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <span>Calibration</span>
        <h1>Check‑in quotidien sans friction.</h1>
        <p>Sliders, switches et presets rapides pour éviter le clavier au réveil.</p>
      </div>

      <div className={styles.readiness}>
        <div>
          <small>Indice readiness</small>
          <strong>{readiness}</strong>
        </div>
        <div className={styles.ring} style={{ "--score": `${readiness}%` }} aria-hidden="true" />
      </div>

      <form className={styles.form} onSubmit={form.handleSubmit(onSubmit)}>
        <label className={styles.dateField}>
          Date
          <input type="date" {...form.register("date")} />
        </label>

        <Panel title="Sommeil">
          <MetricSlider control={form.control} name="sleep_quality" label="Qualité du sommeil" />
          <TimeRow control={form.control} name="bedtime" label="Coucher" />
          <TimeRow control={form.control} name="wake_time" label="Réveil" />
          <PresetRow control={form.control} name="naps_count" label="Siestes" options={[0, 1, 2, 3]} />
          <PresetRow
            control={form.control}
            name="naps_total_duration"
            label="Durée des siestes"
            options={[0, 15, 30, 45, 60]}
            suffix="min"
          />
        </Panel>

        <Panel title="Charge mentale">
          <MetricSlider control={form.control} name="work_stress" label="Stress au travail" />
          <MetricSlider control={form.control} name="work_volume" label="Volume de travail" />
          <MetricSlider control={form.control} name="personal_stress" label="Stress personnel" />
          <MetricSlider control={form.control} name="work_satisfaction" label="Satisfaction travail" />
        </Panel>

        <Panel title="Etat interne">
          <MetricSlider control={form.control} name="motivation" label="Motivation" />
          <MetricSlider control={form.control} name="confidence" label="Confiance" />
          <MetricSlider control={form.control} name="mood" label="Humeur" />
          <MetricSlider control={form.control} name="soreness_index" label="Courbature générale" />
        </Panel>

        <Panel title="Routines">
          <Toggle control={form.control} name="meditation" label="Méditation" />
          <Toggle control={form.control} name="morning_mobility" label="Mobilité matinale" />
          <MetricSlider control={form.control} name="hydration" label="Hydratation" />
          <MetricSlider control={form.control} name="screen_interactions" label="Interactions écrans" />
        </Panel>

        <Panel title="Nutrition">
          <MetricSlider control={form.control} name="breakfast_quality" label="Repas matin" />
          <MetricSlider control={form.control} name="lunch_quality" label="Repas midi" />
          <MetricSlider control={form.control} name="dinner_quality" label="Repas soir" />
        </Panel>

        <div className={styles.actions}>
          <span>{status}</span>
          <button type="submit">Enregistrer</button>
        </div>
      </form>
    </section>
  );
}

function Panel({ title, children }) {
  return (
    <fieldset className={styles.panel}>
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}

function PresetRow({ control, name, label, options, suffix = "" }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className={styles.preset}>
          <span>{label}</span>
          <div>
            {options.map((option) => (
              <button
                key={option}
                type="button"
                className={String(field.value) === String(option) ? styles.presetActive : ""}
                onClick={() => field.onChange(option)}
              >
                {option}
                {suffix}
              </button>
            ))}
          </div>
        </div>
      )}
    />
  );
}

function SelectRow({ control, name, label, options }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <label className={styles.selectRow}>
          {label}
          <select value={field.value} onChange={field.onChange}>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      )}
    />
  );
}

function TimeRow({ control, name, label }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <label className={styles.selectRow}>
          {label}
          <input
            type="time"
            value={field.value}
            step={1800}
            onChange={(e) => field.onChange(e.target.value)}
          />
        </label>
      )}
    />
  );
}

function Toggle({ control, name, label }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className={styles.toggleRow}>
          <span>{label}</span>
          <Switch.Root className={styles.switch} checked={field.value} onCheckedChange={field.onChange}>
            <Switch.Thumb className={styles.thumb} />
          </Switch.Root>
        </div>
      )}
    />
  );
}
