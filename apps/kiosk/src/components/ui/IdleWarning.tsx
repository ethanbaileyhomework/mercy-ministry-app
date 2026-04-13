interface IdleWarningProps {
  countdown: number;
  onDismiss: () => void;
}

export function IdleWarning({ countdown, onDismiss }: IdleWarningProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-fade-in">
      <div className="mx-4 mb-4 flex items-center justify-between gap-4
                      bg-amber-500 text-navy rounded-2xl px-6 py-4 shadow-2xl">
        <p className="font-bold text-kiosk-body">
          Screen resets in {countdown}s — tap anywhere to continue
        </p>
        <button
          onClick={onDismiss}
          className="px-5 py-2 rounded-xl bg-navy text-white font-bold text-sm
                     active:scale-95 transition-all shrink-0"
        >
          I&apos;m still here
        </button>
      </div>
    </div>
  );
}
