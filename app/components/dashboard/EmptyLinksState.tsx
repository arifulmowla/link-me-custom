type EmptyLinksStateProps = {
  onCreateClick: () => void;
};

export function EmptyLinksState({ onCreateClick }: EmptyLinksStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--stroke)]/40 bg-[#f9f8f2] p-8 text-center">
      <div
        aria-hidden
        className="mx-auto mb-4 h-16 w-16 rounded-full border border-[var(--stroke)] bg-[var(--bg-hero)]"
      />
      <h3 className="text-xl font-bold tracking-tight">No links yet</h3>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Create your first short link and start tracking clicks from this dashboard.
      </p>
      <button
        type="button"
        onClick={onCreateClick}
        className="focus-ring hover-lift mt-5 rounded-full border border-[var(--stroke)] bg-[var(--text-primary)] px-5 py-2 text-sm font-semibold text-white"
      >
        Create your first link
      </button>
    </div>
  );
}
