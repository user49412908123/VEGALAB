"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import * as Switch from "@radix-ui/react-switch";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import MetricSlider from "../components/MetricSlider";
import { loadTelemetryEntries, upsertTelemetry } from "../lib/vegalabData";
import styles from "./calibration.module.css";

const STATUS_PRET = "Prêt";
const STATUS_SAVING = "Sauvegarde…";
const STATUS_SYNC = "Synchronisé avec Supabase";
const STATUS_ERROR = "Erreur de synchronisation";
const STATUS_DUPLICATE = "Jour déjà enregistré";

const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const todayIso = toIsoDate(new Date());

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

const readinessTone = (value) => {
  if (value >= 70) {
    return {
      fill: "rgba(85, 214, 164, 0.78)",
      stroke: "rgba(85, 214, 164, 0.95)",
    };
  }

  if (value >= 45) {
    return {
      fill: "rgba(245, 194, 91, 0.76)",
      stroke: "rgba(245, 194, 91, 0.95)",
    };
  }

  return {
    fill: "rgba(255, 107, 107, 0.72)",
    stroke: "rgba(255, 107, 107, 0.95)",
  };
};

const calculateReadiness = (values) => {
  const recovery =
    (Number(values.sleep_quality) + Number(values.hydration) + (11 - Number(values.soreness_index))) / 3;
  const mind =
    (Number(values.motivation) +
      Number(values.confidence) +
      Number(values.mood) +
      (11 - Number(values.work_stress))) /
    4;
  return Math.max(0, Math.min(100, Math.round(((recovery + mind) / 2) * 10)));
};

const formatChartLabel = (date) => date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
const formatChartTooltip = (date) =>
  date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

const buildSevenDayChart = (telemetry) => {
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const byDate = new Map(telemetry.map((entry) => [entry.date, entry]));

  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(end);
    current.setDate(end.getDate() - (6 - index));
    const date = toIsoDate(current);
    const entry = byDate.get(date);
    const readiness = entry ? calculateReadiness(entry) : 0;
    const tone = entry ? readinessTone(readiness) : null;

    return {
      date,
      label: formatChartLabel(current),
      tooltipLabel: formatChartTooltip(current),
      value: entry ? readiness : 12,
      readiness,
      placeholder: !entry,
      fill: entry ? tone.fill : "rgba(255, 255, 255, 0.08)",
      stroke: entry ? tone.stroke : "rgba(255, 255, 255, 0.24)",
      dash: entry ? undefined : "6 6",
    };
  });
};

const timeOptions = Array.from({ length: 24 * 2 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, "0");
  const minute = index % 2 === 0 ? "00" : "30";
  return `${hour}:${minute}`;
});

export default function CalibrationPage() {
  const [saveState, setSaveState] = useState({ kind: "idle", title: "", message: "" });
  const [telemetry, setTelemetry] = useState([]);
  const [loadError, setLoadError] = useState("");
  const form = useForm({ resolver: zodResolver(schema), defaultValues: defaults });
  const values = useWatch({ control: form.control, defaultValue: defaults });
  const watchedDate = useWatch({ control: form.control, name: "date", defaultValue: todayIso });
  const readiness = useMemo(() => calculateReadiness(values), [
   values.confidence,
   values.hydration,
   values.mood,
   values.motivation,
   values.sleep_quality,
   values.soreness_index,
   values.work_stress,
  ]);
  const duplicateDay = useMemo(
   () => telemetry.some((entry) => entry.date === watchedDate),
   [telemetry, watchedDate],
  );
  const chartData = useMemo(() => buildSevenDayChart(telemetry), [telemetry]);
  const isSaving = form.formState.isSubmitting;
  const notice =
   saveState.kind !== "idle"
     ? saveState
     : duplicateDay
       ? {
           kind: "warning",
           title: "Jour déjà enregistré",
           message: "Change la date avant d’appuyer sur “Enregistrer le jour”.",
         }
       : null;

  useEffect(() => {
   let active = true;

   loadTelemetryEntries()
     .then((entries) => {
       if (!active) return;
       setTelemetry(entries);
       setLoadError("");
     })
     .catch((error) => {
       if (!active) return;
       console.error("Failed to load telemetry:", error);
       setLoadError("Impossible de charger l’historique calibration.");
     });

   return () => {
     active = false;
   };
  }, []);

  useEffect(() => {
   setSaveState((current) => {
     if (current.kind === "idle") {
       return current;
     }

     return { kind: "idle", title: "", message: "" };
   });
  }, [watchedDate]);

  const onSubmit = async (payload) => {
   if (duplicateDay) {
     setSaveState({
       kind: "error",
       title: "Jour déjà enregistré",
       message: "Ce jour a déjà été enregistré. Change la date pour ajouter un nouveau check-in.",
     });
     return;
   }

   try {
     const saved = await upsertTelemetry(payload);
     setTelemetry((current) =>
       [...current.filter((entry) => entry.date !== saved.date), saved].sort((a, b) =>
         a.date.localeCompare(b.date),
       ),
     );
     setSaveState({
       kind: "success",
       title: "Jour enregistré",
       message: `Le check-in du ${payload.date} est synchronisé avec Supabase.`,
     });
   } catch (error) {
     console.error("Failed to save telemetry:", error);
     setSaveState({
       kind: "error",
       title: "Enregistrement impossible",
       message: "Vérifie la connexion Supabase et réessaie.",
     });
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

      {loadError ? <p className={styles.loadError}>{loadError}</p> : null}

      <form className={styles.form} onSubmit={form.handleSubmit(onSubmit)}>
        <label className={styles.dateField}>
          Date
          <input type="date" {...form.register("date")} />
          <span className={styles.dateHint}>Ce jour sera créé une seule fois dans Supabase.</span>
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

        {notice ? (
          <div
            className={`${styles.saveCard} ${
              notice.kind === "success"
                ? styles.saveCardSuccess
                : notice.kind === "warning"
                  ? styles.saveCardWarning
                  : styles.saveCardError
            }`}
            aria-live="polite"
          >
            <strong>{notice.title}</strong>
            <span>{notice.message}</span>
          </div>
        ) : null}

        <div className={styles.actions}>
          <span>
            {isSaving
              ? STATUS_SAVING
              : saveState.kind === "success"
                ? STATUS_SYNC
                : saveState.kind === "error"
                  ? STATUS_ERROR
                  : duplicateDay
                    ? STATUS_DUPLICATE
                    : STATUS_PRET}
          </span>
          <motion.button
            type="submit"
            disabled={isSaving || duplicateDay}
            whileTap={{ scale: 0.97 }}
            animate={isSaving ? { scale: [1, 0.98, 1], y: [0, 1, 0] } : { scale: 1, y: 0 }}
            transition={isSaving ? { duration: 0.7, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
          >
            Enregistrer le jour
          </motion.button>
        </div>
      </form>

      <section className={styles.chartPanel}>
        <div className={styles.chartHeader}>
          <h2>Readiness sur les 7 derniers jours</h2>
          <p>Barres colorées pour les jours enregistrés, gris pointillé pour les jours manquants.</p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
            <XAxis dataKey="label" stroke="rgba(255,255,255,0.48)" tickLine={false} axisLine={false} />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              stroke="rgba(255,255,255,0.48)"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ReadinessTooltip />} />
            <Bar dataKey="value" shape={<ReadinessBarShape />} />
          </BarChart>
        </ResponsiveContainer>
        <div className={styles.chartLegend}>
          <span>
            <i className={styles.legendGood} /> readiness élevé
          </span>
          <span>
            <i className={styles.legendMid} /> readiness moyen
          </span>
          <span>
            <i className={styles.legendLow} /> readiness bas / absent
          </span>
        </div>
      </section>
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

function ReadinessBarShape({ x, y, width, height, payload }) {
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    return null;
  }

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx="10"
      ry="10"
      fill={payload.fill}
      stroke={payload.stroke}
      strokeWidth="1.5"
      strokeDasharray={payload.dash}
    />
  );
}

function ReadinessTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  const entry = payload[0]?.payload;
  if (!entry) {
    return null;
  }

  return (
    <div className={styles.tooltip}>
      <strong>{entry.tooltipLabel}</strong>
      {entry.placeholder ? <span>Jour non coché</span> : <span>Readiness: {entry.readiness}</span>}
    </div>
  );
}
