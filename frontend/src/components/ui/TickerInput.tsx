import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
}

/** Uppercasing ticker field with quick-pick suggestions from the backend. */
export function TickerInput({ value, onChange, onSubmit, placeholder = "e.g. AAPL" }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    api
      .get<{ tickers: string[] }>("/api/market/tickers")
      .then((r) => setSuggestions(r.data.tickers))
      .catch(() => setSuggestions(["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META"]));
  }, []);

  return (
    <div>
      <input
        className="input nums uppercase"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onSubmit) onSubmit();
        }}
        aria-label="Ticker symbol"
      />
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange(t)}
              className="chip cursor-pointer bg-surface-overlay/60 text-ink-muted transition-colors hover:bg-brand/15 hover:text-brand nums"
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
