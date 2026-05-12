import { useEffect, useState } from "react";

type MaintenancePopupProps = {
  start: string;
  end: string;
};

export default function MaintenancePopup({
  start,
  end,
}: MaintenancePopupProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("maintenance-dismissed");

    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);

    // Show only before maintenance ends
    if (now < endDate && dismissed !== "true") {
      setVisible(true);
    }
  }, [start, end]);

  const closePopup = () => {
    localStorage.setItem("maintenance-dismissed", "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#16181d] p-6 shadow-2xl">
        {/* Glow */}
        <div className="absolute inset-0 rounded-2xl ring-1 ring-white/5" />

        {/* Content */}
        <div className="relative">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/15">
              <svg
                className="h-5 w-5 text-yellow-400"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.29 3.86l-7.5 13A1 1 0 003.67 18h16.66a1 1 0 00.87-1.5l-7.5-13a1 1 0 00-1.74 0z"
                />
              </svg>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white">
                Scheduled Maintenance
              </h2>

              <p className="text-sm text-zinc-400">
                Polymart will briefly be offline.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-4 text-sm text-zinc-300">
            <p>
              Maintenance begins on{" "}
              <span className="font-medium text-white">
                {new Date(start).toLocaleString()}
              </span>
            </p>

            <p className="mt-2">
              Expected downtime:{" "}
              <span className="font-medium text-white">
                15–30 minutes
              </span>
            </p>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={closePopup}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/15"
            >
              Dismiss
            </button>

            <a
              href="https://status.polymart.org"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              Status Page
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}