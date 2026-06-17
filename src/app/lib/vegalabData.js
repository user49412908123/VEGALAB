"use client";

import { createClient } from "./supabase";
import { demoCycles, demoSessions, demoTelemetry } from "./demoData";

const byDateAsc = (a, b) => `${a.date} ${a.time ?? ""}`.localeCompare(`${b.date} ${b.time ?? ""}`);

const pick = (item, keys, fallback = undefined) => {
  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null) {
      return item[key];
    }
  }
  return fallback;
};

export const normalizeSession = (session) => ({
  ...session,
  cycle_id: pick(session, ["cycle_id", "cycleId", "cycle", "id_cycle"], ""),
  cycle_ids: pick(session, ["cycle_ids", "cycleIds", "cycles_ids"], pick(session, ["cycle_id", "cycleId", "cycle", "id_cycle"], "") ? [pick(session, ["cycle_id", "cycleId", "cycle", "id_cycle"], "")] : []),
  name: pick(session, ["name", "nom"], ""),
  date: pick(session, ["date"], ""),
  time: pick(session, ["time", "heure"], ""),
  duration: pick(session, ["duration", "duree"], 0),
  location: pick(session, ["location", "lieu"], "Autre"),
  objective: pick(session, ["objective", "objectif"], ""),
  notes: pick(session, ["notes"], ""),
  type: pick(session, ["type", "session_type", "type_seance"], "Autre"),
  rpe: pick(session, ["rpe"], 5),
  internal_load: pick(session, ["internal_load", "charge_interne"], 0),
  predicted_muscular_form: pick(session, ["predicted_muscular_form", "forme_musculaire_presentie"], 5),
  predicted_finger_form: pick(session, ["predicted_finger_form", "forme_doigts_presentie"], 5),
  predicted_neural_form: pick(session, ["predicted_neural_form", "forme_nerveuse_presentie"], 5),
  predicted_general_form: pick(session, ["predicted_general_form", "forme_generale_presentie"], 5),
  success_rate: pick(session, ["success_rate", "taux_reussite"], 0),
  motivation: pick(session, ["motivation"], 5),
  one_arm_hang_feeling: pick(session, ["one_arm_hang_feeling", "ressenti_suspension_un_bras"], 5),
  explosive_pull_feeling: pick(session, ["explosive_pull_feeling", "sensation_traction_explosive"], 5),
});

export const normalizeCycle = (cycle) => ({
  ...cycle,
  name: pick(cycle, ["name", "nom"], ""),
  start_date: pick(cycle, ["start_date", "date_debut"], ""),
  end_date: pick(cycle, ["end_date", "date_fin"], ""),
  objective: pick(cycle, ["objective", "objectif"], ""),
  main_theme: pick(cycle, ["main_theme", "theme_principal"], ""),
  color: pick(cycle, ["color", "couleur"], "pink"),
});

export const normalizeTelemetry = (entry) => ({
  ...entry,
  date: pick(entry, ["date"], ""),
  sleep_quality: pick(entry, ["sleep_quality", "qualite_sommeil"], 5),
  bedtime: pick(entry, ["bedtime", "heure_coucher"], ""),
  wake_time: pick(entry, ["wake_time", "heure_reveil"], ""),
  naps_count: pick(entry, ["naps_count", "nombre_siestes"], 0),
  naps_total_duration: pick(entry, ["naps_total_duration", "duree_totale_siestes"], 0),
  work_stress: pick(entry, ["work_stress", "stress_travail"], 5),
  work_volume: pick(entry, ["work_volume", "volume_travail"], 5),
  personal_stress: pick(entry, ["personal_stress", "stress_personnel"], 5),
  work_satisfaction: pick(entry, ["work_satisfaction", "satisfaction_travail"], 5),
  motivation: pick(entry, ["motivation"], 5),
  confidence: pick(entry, ["confidence", "confiance"], 5),
  mood: pick(entry, ["mood", "humeur"], 5),
  meditation: pick(entry, ["meditation"], false),
  hydration: pick(entry, ["hydration"], 5),
  breakfast_quality: pick(entry, ["breakfast_quality", "qualite_repas_matin"], 5),
  lunch_quality: pick(entry, ["lunch_quality", "qualite_repas_midi"], 5),
  dinner_quality: pick(entry, ["dinner_quality", "qualite_repas_soir"], 5),
  morning_mobility: pick(entry, ["morning_mobility", "mobilite_matinale"], false),
  soreness_index: pick(entry, ["soreness_index", "indice_courbature_generale"], 5),
  screen_interactions: pick(entry, ["screen_interactions", "interactions_ecrans"], 5),
});

const sessionPayloads = (session) => [
  session,
  {
    cycle_id: session.cycle_id,
    cycle_ids: session.cycle_ids,
    nom: session.name,
    date: session.date,
    heure: session.time,
    duree: session.duration,
    lieu: session.location,
    objectif: session.objective,
    notes: session.notes,
    type: session.type,
    rpe: session.rpe,
    charge_interne: session.internal_load,
    forme_musculaire_presentie: session.predicted_muscular_form,
    forme_doigts_presentie: session.predicted_finger_form,
    forme_nerveuse_presentie: session.predicted_neural_form,
    forme_generale_presentie: session.predicted_general_form,
    taux_reussite: session.success_rate,
    motivation: session.motivation,
    ressenti_suspension_un_bras: session.one_arm_hang_feeling,
    sensation_traction_explosive: session.explosive_pull_feeling,
  },
];

const cyclePayloads = (cycle) => [
  cycle,
  {
    nom: cycle.name,
    date_debut: cycle.start_date,
    date_fin: cycle.end_date,
    objectif: cycle.objective,
    theme_principal: cycle.main_theme,
    couleur: cycle.color,
  },
];

const telemetryPayloads = (entry) => [
  entry,
  {
    date: entry.date,
    qualite_sommeil: entry.sleep_quality,
    heure_coucher: entry.bedtime,
    heure_reveil: entry.wake_time,
    nombre_siestes: entry.naps_count,
    duree_totale_siestes: entry.naps_total_duration,
    stress_travail: entry.work_stress,
    volume_travail: entry.work_volume,
    stress_personnel: entry.personal_stress,
    satisfaction_travail: entry.work_satisfaction,
    motivation: entry.motivation,
    confiance: entry.confidence,
    humeur: entry.mood,
    meditation: entry.meditation,
    hydration: entry.hydration,
    qualite_repas_matin: entry.breakfast_quality,
    qualite_repas_midi: entry.lunch_quality,
    qualite_repas_soir: entry.dinner_quality,
    mobilite_matinale: entry.morning_mobility,
    indice_courbature_generale: entry.soreness_index,
    interactions_ecrans: entry.screen_interactions,
  },
];

async function firstSuccessfulWrite(payloads, writer) {
  let lastError;
  for (const payload of payloads) {
    const { data, error } = await writer(payload);
    if (!error) return data;
    lastError = error;
  }
  throw lastError;
}

async function readTable(table, fallback, query) {
  try {
    const supabase = createClient();
    const request = query ? query(supabase.from(table)) : supabase.from(table).select("*");
    const { data, error } = await request;
    if (error) {
      return { data: fallback, source: "demo", error };
    }
    return { data: data?.length ? data : fallback, source: data?.length ? "supabase" : "demo" };
  } catch (error) {
    return { data: fallback, source: "demo", error };
  }
}

export async function loadVegalabData(days = undefined) {
  // days: number -> load sessions from today up to today+days
  // days === null or undefined -> load all sessions (backwards compatible)
  const sessionQuery = (table) => {
    if (days === null || days === undefined) return table.select("*").order("date");
    const today = new Date();
    const startIso = today.toISOString().slice(0, 10);
    const end = new Date();
    end.setDate(today.getDate() + Number(days));
    const endIso = end.toISOString().slice(0, 10);
    return table.select("*").gte("date", startIso).lte("date", endIso).order("date");
  };

  const [sessionsResult, cyclesResult, telemetryResult] = await Promise.all([
    readTable("sessions", demoSessions, sessionQuery),
    readTable("cycles", demoCycles),
    readTable("daily_telemetry", demoTelemetry, (table) => table.select("*").order("date")),
  ]);

  return {
    sessions: sessionsResult.data.map(normalizeSession).sort(byDateAsc),
    cycles: cyclesResult.data.map(normalizeCycle).sort((a, b) => a.start_date.localeCompare(b.start_date)),
    telemetry: telemetryResult.data.map(normalizeTelemetry),
    source:
      sessionsResult.source === "supabase" ||
      cyclesResult.source === "supabase" ||
      telemetryResult.source === "supabase"
        ? "supabase"
        : "demo",
  };
}

export async function insertSession(session) {
  const supabase = createClient();
  const data = await firstSuccessfulWrite(sessionPayloads(session), (payload) =>
    supabase.from("sessions").insert(payload).select().single(),
  );
  return normalizeSession(data);
}

export async function updateSession(id, session) {
  const supabase = createClient();
  const data = await firstSuccessfulWrite(sessionPayloads(session), (payload) =>
    supabase.from("sessions").update(payload).eq("id", id).select().single(),
  );
  return normalizeSession(data);
}

export async function deleteSession(id) {
  const supabase = createClient();
  const { error } = await supabase.from("sessions").delete().eq("id", id);
  if (error) throw error;
}

export async function insertCycle(cycle) {
  const supabase = createClient();
  const data = await firstSuccessfulWrite(cyclePayloads(cycle), (payload) =>
    supabase.from("cycles").insert(payload).select().single(),
  );
  return normalizeCycle(data);
}

export async function updateCycle(id, cycle) {
  const supabase = createClient();
  const data = await firstSuccessfulWrite(cyclePayloads(cycle), (payload) =>
    supabase.from("cycles").update(payload).eq("id", id).select().single(),
  );
  return normalizeCycle(data);
}

export async function deleteCycle(id) {
  const supabase = createClient();
  const { error } = await supabase.from("cycles").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertTelemetry(entry) {
  const supabase = createClient();
  const data = await firstSuccessfulWrite(telemetryPayloads(entry), (payload) =>
    supabase.from("daily_telemetry").upsert(payload, { onConflict: "date" }).select().single(),
  );
  return normalizeTelemetry(data);
}
