"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AppShell.module.css";

const navItems = [
  { href: "/sequenceur", label: "Séquenceur", short: "SQ" },
  { href: "/calibration", label: "Calibration", short: "CA" },
  { href: "/labo", label: "Labo", short: "LB" },
];

export default function AppShell({ children }) {
  const pathname = usePathname();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/sequenceur" className={styles.brand} aria-label="VEGALAB">
          <span className={styles.mark}>VG</span>
          <span>
            <strong>VEGALAB</strong>
            <small>Sports performance lab</small>
          </span>
        </Link>
        <span className={styles.status}>Private</span>
      </header>

      <main className={styles.main}>{children}</main>

      <nav className={styles.nav} aria-label="Navigation principale">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${active ? styles.active : ""}`}
            >
              <span className={styles.navCode}>{item.short}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
