# -*- coding: utf-8 -*-
from pathlib import Path
import re
path = Path('app/page.tsx')
text = path.read_text(encoding='utf-8')
pattern = r"(      /\* Controls \*/\n      <section[\s\S]*?</section>)"
replacement = '''      {/* Controls */}
      <section className="surface rounded-2xl p-3 md:p-4 shadow-sm grid items-end gap-3 md:grid-cols-12">
        <div className="md:col-span-5">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Search size={16} /> Search firms
          </label>
          <form
            className="mt-1 flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setQ(searchDraft);
            }}
          >
            <Input
              placeholder="Search by name…"
              list="home-firm-search-options"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              className="flex-1"
            />
            <datalist id="home-firm-search-options">
              {firmNameOptions
                .filter((name) => {
                  const drafted = searchDraft.trim().toLowerCase();
                  if (!drafted) return false;
                  return name.toLowerCase().startsWith(drafted);
                })
                .map((name) => (
                  <option key={name} value={name} />
                ))}
            </datalist>
            <Button type="submit" size="sm">
              Search
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white"
              onClick={() => {
                setSearchDraft("");
                setQ("");
              }}
            >
              Clear
            </Button>
          </form>
        </div>

        <div className="md:col-span-3">
          <label className="text-sm font-medium">Model</label>
          <div className="mt-1 flex flex-wrap gap-2">
            <FilterChips options={["", ...MODELS]} value={model} onChange={(v) => setModel(v as any)} />
          </div>
        </div>

        <div className="md:col-span-4">
          <label className="text-sm font-medium">Platform</label>
          <div className="mt-1 flex flex-wrap gap-2">
            <FilterChips options={["", ...PLATFORMS]} value={platform} onChange={(v) => setPlatform(v as any)} />
          </div>
        </div>

        <div className="md:col-span-12">
          <label className="text-sm font-medium">Account size</label>
          <FilterChips
            className="mt-1 flex flex-wrap gap-2"
            options={ACCOUNT_SIZE_OPTIONS as unknown as string[]}
            value={accountSizeFilter}
            onChange={setAccountSizeFilter}
            formatLabel={(opt) => (opt == "" ? "All" : f"${{int(opt)//1000}}K".replace('K', 'K'))}
          />
        </div>

        <div className="md:col-span-6">
          <label className="flex justify-between text-sm font-medium">
            <span>Minimum Max Funding</span>
            <span className="tabular-nums">${maxMinFunding.toLocaleString()}</span>
          </label>
          <Slider min={0} max={1_000_000} step={50_000} value={[maxMinFunding]} onValueChange={([v = 0]) => setMaxMinFunding(v)} />
        </div>

        <div className="md:col-span-6">
          <label className="flex justify-between text-sm font-medium">
            <span>Minimum Payout Split</span>
            <span className="tabular-nums">{minPayout}%</span>
          </label>
          <Slider min={50} max={100} step={5} value={[minPayout]} onValueChange={([v = 70]) => setMinPayout(v)} />
        </div>

        <div className="md:col-span-6">
          <label className="text-sm font-medium">Drawdown type</label>
          <FilterChips className="mt-1 flex flex-wrap gap-2" options={["", ...DRAW_DOWN_OPTIONS]} value={drawdownFilter} onChange={setDrawdownFilter} />
        </div>

        <div className="md:col-span-6">
          <label className="text-sm font-medium">Payout speed</label>
          <FilterChips
            className="mt-1 flex flex-wrap gap-2"
            options={PAYOUT_SPEED_PRESETS.map((preset) => preset.value)}
            value={payoutSpeedFilter}
            onChange={setPayoutSpeedFilter}
            formatLabel={(opt) => (next(filter(lambda p: p['value'] == opt, PAYOUT_SPEED_PRESETS), {{}}).get('label', 'Any'))}
          />
        </div>

        <div className="md:col-span-6 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-emerald-400"
            checked={oneDayEvalOnly}
            onChange={(event) => setOneDayEvalOnly(event.target.checked)}
          />
          <span>Show only firms with 1-day pass</span>
        </div>

        <div className="md:col-span-12 space-y-2">
          <label className="text-sm font-medium uppercase tracking-[0.2em] text-amber-200">Score focus</label>
          <div className="flex flex-wrap gap-2">
            {SCORE_FOCUS_PRESETS.map((preset) => {
              const active = scoreFocus.includes(preset.value);
              return (
                <Button
                  key={preset.value}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  onClick={() =>
                    setScoreFocus((prev) => {
                      if (active) {
                        const next = [value for value in prev if value != preset.value];
                        return next if next else list(DEFAULT_SCORE_FOCUS)
                      }
                      return prev + [preset.value]
                    })
                  }
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>
          <p className="text-xs text-white/50">Used when sorting by Score.</p>
        </div>
...
'''  # truncated due to python limitations
