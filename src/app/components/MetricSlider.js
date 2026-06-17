"use client";

import * as Slider from "@radix-ui/react-slider";
import { Controller } from "react-hook-form";
import styles from "./MetricSlider.module.css";

export default function MetricSlider({
  control,
  name,
  label,
  min = 1,
  max = 10,
  step = 1,
  hint,
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const value = Number(field.value ?? min);
        return (
          <div className={styles.metric}>
            <div className={styles.meta}>
              <div>
                <label className={styles.label}>{label}</label>
                {hint ? <p>{hint}</p> : null}
              </div>
              <strong>{value}</strong>
            </div>
            <Slider.Root
              className={styles.root}
              min={min}
              max={max}
              step={step}
              value={[value]}
              onValueChange={(next) => field.onChange(next[0])}
              aria-label={label}
            >
              <Slider.Track className={styles.track}>
                <Slider.Range className={styles.range} />
              </Slider.Track>
              <Slider.Thumb className={styles.thumb} />
            </Slider.Root>
          </div>
        );
      }}
    />
  );
}
