import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const styles = {
    primary: "bg-teal text-white hover:bg-teal-bright shadow-sm",
    secondary: "bg-card text-ink border border-line hover:border-teal",
    ghost: "bg-transparent text-ink-soft hover:bg-mist/60",
    danger: "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/15",
  }[variant];
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50",
        styles,
        className,
      )}
      {...props}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted focus:border-teal",
        props.className,
      )}
      {...props}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted focus:border-teal min-h-24",
        props.className,
      )}
      {...props}
    />
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-line/80 bg-card/90 p-5 shadow-[0_10px_40px_-24px_rgba(11,26,28,0.35)] backdrop-blur", className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-paper/70 px-6 py-10 text-center">
      <p className="font-display text-lg font-semibold text-ink-soft">{title}</p>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

export function Avatar({
  src,
  name,
  size = "md",
}: {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-16 w-16 text-xl" : "h-10 w-10 text-sm";
  const initial = (name ?? "?").slice(0, 1).toUpperCase();
  if (src) {
    return <img src={src} alt="" className={cn(dim, "rounded-full object-cover ring-2 ring-mist")} />;
  }
  return (
    <div className={cn(dim, "grid place-items-center rounded-full bg-teal/15 font-semibold text-teal")}>
      {initial}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "ok" | "warn" }) {
  const styles = {
    neutral: "bg-mist text-ink-soft",
    ok: "bg-online/15 text-online",
    warn: "bg-coral/15 text-coral",
  }[tone];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", styles)}>
      {children}
    </span>
  );
}

export function Spinner() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-mist border-t-teal" />
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{message}</div>
  );
}

export function IntraGate({ linked, children }: { linked: boolean; children: ReactNode }) {
  if (linked) return <>{children}</>;
  return (
    <Card className="max-w-xl">
      <h2 className="font-display text-xl font-bold">Lie ton Intra</h2>
      <p className="mt-2 text-sm text-muted">
        Ces données viennent de l’API 42. Connecte ton compte Intra pour débloquer profil, projets,
        agenda, chat et analytics.
      </p>
      <LinkIntraButton className="mt-4" />
    </Card>
  );
}

function LinkIntraButton({ className }: { className?: string }) {
  return (
    <Button
      className={className}
      onClick={async () => {
        const { api } = await import("../lib/api");
        const res = await api<{ authorize_url: string }>("/auth/42");
        if (res.ok && res.data?.authorize_url) {
          window.location.href = res.data.authorize_url;
        }
      }}
    >
      Connecter Intra 42
    </Button>
  );
}
