"use client";

import { FormEvent, useMemo, useState } from "react";

type ShortenApiSuccess = {
  shortUrl: string;
  code: string;
};

type ShortenApiError = {
  error: string;
};

function normalizeUrl(rawValue: string) {
  let value = rawValue.trim();
  if (!value) {
    return { normalized: "", error: "Please enter a URL." };
  }

  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(value)) {
    value = `https://${value}`;
  }

  try {
    const parsedUrl = new URL(value);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return { normalized: "", error: "Only http and https URLs are supported." };
    }
    return { normalized: parsedUrl.toString(), error: "" };
  } catch {
    return { normalized: "", error: "Enter a valid absolute URL." };
  }
}

export function HeroShortenForm() {
  const [inputValue, setInputValue] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [isPending, setIsPending] = useState(false);

  const canSubmit = useMemo(() => inputValue.trim().length > 0 && !isPending, [inputValue, isPending]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setShortUrl("");

    const { normalized, error } = normalizeUrl(inputValue);
    if (error) {
      setErrorMessage(error);
      return;
    }

    setIsPending(true);
    try {
      const response = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized, source: "homepage_hero" }),
      });

      const data = (await response.json()) as ShortenApiSuccess | ShortenApiError;

      if (!response.ok) {
        const errorCode = "error" in data ? data.error : "unexpected_error";
        if (errorCode === "invalid_url") {
          setErrorMessage("That URL is invalid. Please use a full and valid URL.");
        } else {
          setErrorMessage("Something went wrong while shortening your link.");
        }
        return;
      }

      if (!("shortUrl" in data)) {
        setErrorMessage("Unexpected API response.");
        return;
      }

      setShortUrl(data.shortUrl);
      setInputValue(normalized);
    } catch {
      setErrorMessage("Network issue. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="mt-6">
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit} noValidate>
        <label className="sr-only" htmlFor="long-url">
          Long URL
        </label>
        <input
          id="long-url"
          name="long-url"
          type="text"
          autoComplete="url"
          placeholder="Paste your long URL here"
          className="focus-ring h-12 w-full rounded-2xl border-[1.5px] border-[var(--stroke)] bg-white px-4 text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          aria-invalid={errorMessage ? "true" : "false"}
          aria-describedby="hero-form-message"
        />
        <button
          type="submit"
          className="focus-ring hover-lift h-12 shrink-0 rounded-2xl border-[1.5px] border-[var(--stroke)] bg-[var(--text-primary)] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-75"
          disabled={!canSubmit}
        >
          {isPending ? "Shortening..." : "Shorten Link Now"}
        </button>
      </form>

      <div
        id="hero-form-message"
        className="mt-3 min-h-6 text-sm"
        role="status"
        aria-live="polite"
      >
        {errorMessage ? (
          <p className="font-medium text-red-700">{errorMessage}</p>
        ) : shortUrl ? (
          <p className="font-medium text-[var(--success)]">
            Your short link:{" "}
            <a className="focus-ring underline underline-offset-2" href={shortUrl}>
              {shortUrl}
            </a>
          </p>
        ) : (
          <p className="text-[var(--text-muted)]">No signup needed to try it.</p>
        )}
      </div>
    </div>
  );
}
