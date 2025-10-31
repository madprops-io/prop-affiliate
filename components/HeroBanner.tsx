"use client";

export default function HeroBanner() {
  return (
    <section
      aria-label="MadProps hero"
      className="relative isolate overflow-hidden bg-[#0b1320] w-full
                 h-[440px] md:h-[520px] lg:h-[600px]"
    >
      {/* Background image */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-no-repeat bg-right-bottom bg-cover"
        style={{
          backgroundImage: "url('/hero-candles-vibrant.png')",
          backgroundSize: "cover",
          backgroundPosition: "right bottom",
        }}
      />

      {/* Left gradient for readability */}
      <div className="absolute inset-y-0 left-0 w-1/2 md:w-[44%] -z-10
                      bg-gradient-to-r from-[#0b1320]/80 via-[#0b1320]/30 to-transparent" />

      {/* Bottom fade (kept slim) */}
      <div className="absolute inset-x-0 bottom-0 h-10 -z-10
                      bg-gradient-to-b from-transparent to-[#0b1320]" />

      {/* Content: bottom-left */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 h-full flex flex-col">
        {/* small top pad so we clear the nav/logo */}
        <div className="pt-16 md:pt-20 lg:pt-22" />

        {/* headline block pinned to bottom */}
        <div className="mt-auto pb-6 md:pb-8 max-w-3xl">
          <h1 className="leading-tight">
            <span className="block text-[1.125rem] md:text-[1.35rem] lg:text-[1.5rem] font-medium text-white/90 tracking-tight">
              <span className="text-emerald-300">Compare</span>{" "}
              <span className="text-white/85">prop firms.</span>
            </span>
          </h1>
          <p className="mt-2 text-[0.95rem] md:text-base text-white/72">
            Find your best match by payout, funding, rules, and platform.
          </p>
        </div>
      </div>

      {/* Tagline bottom-right, same size as headline */}
      <div className="pointer-events-none absolute right-6 md:right-10 bottom-6 md:bottom-8">
        <div className="text-[1.125rem] md:text-[1.35rem] lg:text-[1.5rem] font-medium italic text-amber-300/95 drop-shadow-[0_0_10px_rgba(245,158,11,0.35)]">
          Trade smarter.
        </div>
      </div>
    </section>
  );
}
