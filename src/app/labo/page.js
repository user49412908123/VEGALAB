"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { demoSessions, demoTelemetry } from "../lib/demoData";
import { loadVegalabData } from "../lib/vegalabData";
import styles from "./labo.module.css";

const average = (items, selector) => {
  if (!items.length) return 0;
  return Math.round(items.reduce((sum, item) => sum + Number(selector(item) ?? 0), 0) / items.length);
};

export default function LaboPage() {
  const [sessions, setSessions] = useState(demoSessions);
  const [telemetry, setTelemetry] = useState(demoTelemetry);

  useEffect(() => {
    let active = true;
    loadVegalabData().then((data) => {
      if (!active) return;
      setSessions(data.sessions);
      setTelemetry(data.telemetry);
    });
    return () => {
      active = false;
    };
  }, []);

  const merged = useMemo(() => {
    return sessions
      .map((session) => {
        const day = telemetry.find((entry) => entry.date === session.date) ?? {};
        return {
          date: session.date.slice(5),
          type: session.type,
          sleep: Number(day.sleep_quality ?? 0),
          hydration: Number(day.hydration ?? 0),
          stress: Number(day.work_stress ?? 0) + Number(day.personal_stress ?? 0),
          success: Number(session.success_rate ?? 0),
          fingers: Number(session.predicted_finger_form ?? 0),
          load: Number(session.internal_load ?? 0),
          rpe: Number(session.rpe ?? 0),
          duration: Number(session.duration ?? 0),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [sessions, telemetry]);

  const kpis = useMemo(() => {
    const totalMinutes = sessions.reduce((sum, session) => sum + Number(session.duration ?? 0), 0);
    const avgSuccess = average(sessions, (session) => session.success_rate);
    const avgFatigue = average(sessions, (session) => session.rpe);
    const avgSleep = average(telemetry, (entry) => entry.sleep_quality);
    return [
      { label: "Volume total", value: `${totalMinutes}m`, tone: "neutral" },
      { label: "Réussite moy.", value: `${avgSuccess}%`, tone: "pink" },
      { label: "Fatigue RPE", value: avgFatigue, tone: "warn" },
      { label: "Sommeil moy.", value: avgSleep, tone: "good" },
    ];
  }, [sessions, telemetry]);

  const fatigueTrend = useMemo(() => {
    return telemetry.map((entry) => ({
      date: entry.date.slice(5),
      fatigue: Math.round(
        (Number(entry.soreness_index) + Number(entry.work_stress) + Number(entry.screen_interactions)) / 3,
      ),
      mood: Number(entry.mood),
      hydration: Number(entry.hydration),
    }));
  }, [telemetry]);

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <span>Labo</span>
        <h1>Analyse croisée de la performance et biométrie.</h1>
        <p>Sommeil, hydratation, stress, doigts, charge interne et progression dans un tableau de bord compact.</p>
      </div>


      <ChartPanel title="Readiness vs réussite">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={merged} margin={{ top: 10, right: 4, bottom: 0, left: -24 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
            <XAxis dataKey="date" stroke="rgba(255,255,255,0.48)" tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(255,255,255,0.48)" tickLine={false} axisLine={false} />
            <Tooltip content={<LabTooltip />} />
            <Bar dataKey="success" fill="rgba(255, 79, 163, 0.55)" radius={[8, 8, 0, 0]} />
            <Line type="monotone" dataKey="sleep" stroke="#55d6a4" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="hydration" stroke="#ffb4d6" strokeWidth={3} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Charge et doigts">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={merged} margin={{ top: 10, right: 4, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="load" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff4fa3" stopOpacity={0.55} />
                <stop offset="95%" stopColor="#ff4fa3" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
            <XAxis dataKey="date" stroke="rgba(255,255,255,0.48)" tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(255,255,255,0.48)" tickLine={false} axisLine={false} />
            <Tooltip content={<LabTooltip />} />
            <Area type="monotone" dataKey="load" stroke="#ff4fa3" fill="url(#load)" strokeWidth={2} />
            <Line type="monotone" dataKey="fingers" stroke="#f5c25b" strokeWidth={3} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Fatigue globale">
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={fatigueTrend} margin={{ top: 10, right: 4, bottom: 0, left: -24 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
            <XAxis dataKey="date" stroke="rgba(255,255,255,0.48)" tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(255,255,255,0.48)" tickLine={false} axisLine={false} />
            <Tooltip content={<LabTooltip />} />
            <Bar dataKey="fatigue" fill="rgba(245, 194, 91, 0.76)" radius={[8, 8, 0, 0]} />
            <Line type="monotone" dataKey="mood" stroke="#ff7abe" strokeWidth={3} dot={false} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>
    </section>
  );
}

function ChartPanel({ title, children }) {
  return (
    <article className={styles.chart}>
      <h2>{title}</h2>
      {children}
    </article>
  );
}

function LabTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.dataKey}>
          {item.dataKey}: {item.value}
        </span>
      ))}
    </div>
  );
}
