# Renders report charts from a JSON spec: a line against last year, a plain line, and a dot plot over any list of items.
import json
import math
import os
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager

SURFACE = "#ffffff"
INK = "#0b0b0b"
INK2 = "#52514e"
MUTED = "#8a8984"
GRID = "#e6e5e0"
BLUE = "#2a78d6"
LAST_YEAR = "#b8b7b0"
BAND = "#eaf2fc"
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MIN_LINE_MONTHS = 2


def pick_font():
    for name in ("Helvetica Neue", "DejaVu Sans"):
        try:
            font_manager.findfont(name, fallback_to_default=False)
            return name
        except ValueError:
            continue
    return "sans-serif"


plt.rcParams.update(
    {
        "font.family": pick_font(),
        "font.size": 11,
        "axes.edgecolor": GRID,
        "axes.labelcolor": INK2,
        "xtick.color": INK2,
        "ytick.color": INK2,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "axes.spines.left": False,
        "figure.facecolor": SURFACE,
        "axes.facecolor": SURFACE,
    }
)


class Skip(Exception):
    pass


def month_label(month, with_year=False):
    year, number = month.split("-")
    name = MONTHS[int(number) - 1]
    return f"{name} '{year[2:]}" if with_year else name


def next_months(month, count):
    year, number = (int(part) for part in month.split("-"))
    out = []
    for step in range(1, count + 1):
        index = year * 12 + number - 1 + step
        out.append(f"{index // 12}-{index % 12 + 1:02d}")
    return out


def months_between(start, end):
    a = [int(part) for part in start.split("-")]
    b = [int(part) for part in end.split("-")]
    return (b[0] - a[0]) * 12 + b[1] - a[1]


def number_format(unit):
    divide = unit.get("divide", 1) or 1
    suffix = unit.get("suffix", "")
    decimals = unit.get("decimals", 0)
    return lambda value: f"{value / divide:,.{decimals}f}{suffix}"


def tick_format(unit):
    divide = unit.get("divide", 1) or 1
    suffix = unit.get("suffix", "")
    decimals = unit.get("decimals", 0)

    def label(value, _):
        scaled = value / divide
        places = 0 if float(scaled).is_integer() else decimals
        return f"{scaled:,.{places}f}{suffix}"

    return label


def present(values):
    return [(i, v) for i, v in enumerate(values) if v is not None]


def y_limits(values, pad_share=0.25):
    low, high = min(values), max(values)
    pad = (high - low) * pad_share or max(abs(high) * 0.1, 1)
    return low - pad, high + pad


def finish(fig, ax, spec, out_dir):
    title = spec["title"]
    fig.text(0.035, 0.95, title, fontsize=13 if len(title) > 60 else 14, fontweight="bold", color=INK, va="top")
    fig.text(0.035, 0.885, spec["subtitle"], fontsize=10.5, color=INK2, va="top")
    fig.text(0.035, 0.03, spec["footer"], fontsize=9, color=MUTED, va="bottom")
    ax.tick_params(length=0)
    ax.tick_params(axis="x", pad=10)
    fig.savefig(os.path.join(out_dir, spec["file"]), dpi=200)
    plt.close(fig)


def line_yoy(spec, out_dir):
    months, values, last = spec["months"], spec["values"], spec["lastYear"]
    if len(present(values)) < MIN_LINE_MONTHS:
        raise Skip(f"a line chart needs {MIN_LINE_MONTHS} or more months of data, this has {len(present(values))}")
    fmt = number_format(spec.get("unit", {}))
    labels = spec.get("labels", {"current": "This year", "last": "Last year"})
    fig, ax = plt.subplots(figsize=(8, 3.6))
    fig.subplots_adjust(left=0.07, right=0.80, top=0.76, bottom=0.17)
    x = list(range(len(months)))
    ax.plot(x, [math.nan if v is None else v for v in last], color=LAST_YEAR, linewidth=2, solid_capstyle="round")
    if present(last):
        ax.scatter([present(last)[-1][0]], [present(last)[-1][1]], s=40, color=LAST_YEAR, zorder=2, edgecolor=SURFACE, linewidth=2)
    ax.plot(x, [math.nan if v is None else v for v in values], color=BLUE, linewidth=2.4, solid_capstyle="round")
    end_i, end_v = present(values)[-1]
    ax.scatter([end_i], [end_v], s=50, color=BLUE, zorder=3, edgecolor=SURFACE, linewidth=2)
    ax.text(end_i + 0.25, end_v, f"{labels['current']}: {fmt(end_v)}", color=INK, fontsize=10, va="center")
    if present(last):
        last_i, last_v = present(last)[-1]
        spread = max(values_present(values, last)) - min(values_present(values, last))
        close = last_i == end_i and abs(last_v - end_v) <= spread * 0.12
        ax.text(last_i + 0.25, last_v, f"{labels['last']}: {fmt(last_v)}", color=INK2, fontsize=10, va="top" if close else "center")
    ax.set_xticks(x)
    ax.set_xticklabels([month_label(m) for m in months])
    ax.set_ylim(*y_limits(values_present(values, last)))
    ax.yaxis.set_major_formatter(tick_format(spec.get("unit", {})))
    ax.grid(axis="y", color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    finish(fig, ax, spec, out_dir)


def values_present(*series):
    return [v for one in series for v in one if v is not None]


def line_plain(spec, out_dir):
    months, values = list(spec["months"]), spec["values"]
    if len(present(values)) < MIN_LINE_MONTHS:
        raise Skip(f"a line chart needs {MIN_LINE_MONTHS} or more months of data, this has {len(present(values))}")
    fmt = number_format(spec.get("unit", {}))
    end_month = spec.get("endMonth")
    target = spec.get("target")
    extra = months_between(months[-1], end_month) if end_month else 0
    all_months = months + next_months(months[-1], extra)
    fig, ax = plt.subplots(figsize=(8, 3.6))
    fig.subplots_adjust(left=0.08, right=0.84, top=0.76, bottom=0.17)
    end_i, end_v = present(values)[-1]
    ax.plot(range(len(values)), [math.nan if v is None else v for v in values], color=BLUE, linewidth=2.4, solid_capstyle="round")
    ax.scatter([end_i], [end_v], s=50, color=BLUE, zorder=3, edgecolor=SURFACE, linewidth=2)
    shown = values_present(values)
    if target:
        low, high = target["low"], target["high"]
        shown += [low, high]
        far = len(all_months) - 1
        if low != high and extra:
            ax.fill_between([end_i, far], [end_v, low], [end_v, high], color=BAND, zorder=0)
        elif extra:
            ax.plot([end_i, far], [end_v, low], color=BLUE, linewidth=1.4, linestyle="--", zorder=1)
        else:
            ax.axhline(low, color=BLUE, linewidth=1.4, linestyle="--", zorder=1)
        ax.text(far + 0.3 if extra else len(values) - 0.7, (low + high) / 2, target.get("label", ""), color=BLUE, fontsize=10, va="center")
    ax.text(end_i, end_v + (max(shown) - min(shown)) * 0.09, f"{fmt(end_v)} now", color=INK, fontsize=10, ha="center", bbox=dict(pad=1, fc=SURFACE, ec="none"))
    step = 1 if len(all_months) <= 12 else 3
    ticks = list(range(0, len(all_months), step))
    ax.set_xticks(ticks)
    ax.set_xticklabels([month_label(all_months[i], len(all_months) > 12) for i in ticks])
    ax.set_ylim(*y_limits(shown))
    ax.set_xlim(-0.3, len(all_months) - 0.2)
    ax.yaxis.set_major_formatter(tick_format(spec.get("unit", {})))
    ax.grid(axis="y", color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    finish(fig, ax, spec, out_dir)


def ordinal(value):
    if 10 <= value % 100 <= 20:
        return f"{value}th"
    suffix = {1: "st", 2: "nd", 3: "rd"}.get(value % 10, "th")
    return f"{value}{suffix}"


def dots(spec, out_dir):
    items = spec.get("items") or []
    if not items:
        raise Skip("a dot plot needs at least one item, this has none")
    band = spec.get("band")
    ordered = sorted(items, key=lambda item: item["value"])
    count = len(ordered)
    longest = max(len(str(item["label"])) for item in ordered)
    fig, ax = plt.subplots(figsize=(8, max(3.2, 1.9 + 0.22 * count)))
    fig.subplots_adjust(left=min(0.45, max(0.12, 0.05 + 0.011 * longest)), right=0.95, top=0.80, bottom=0.18)
    if band:
        ax.axvspan(band["low"] - 0.5, band["high"] + 0.5, color=BAND, zorder=0)
        ax.text((band["low"] + band["high"]) / 2, -1.1, band.get("label", ""), ha="center", color=BLUE, fontsize=10, fontweight="bold")
    for row, item in enumerate(ordered):
        inside = band is None or item["value"] <= band["high"]
        colour = BLUE if inside else MUTED
        ax.plot([0.5, item["value"]], [row, row], color=GRID, linewidth=2, zorder=1)
        ax.scatter(item["value"], row, s=70, color=colour, zorder=3, edgecolor=SURFACE, linewidth=2)
        ax.text(item["value"] + 0.9, row, f"{item['value']}", va="center", fontsize=10, color=INK if inside else INK2)
    ax.set_yticks(range(count))
    ax.set_yticklabels([str(item["label"]) for item in ordered])
    ax.set_ylim(count - 0.4, -1.6)
    top = max(item["value"] for item in ordered)
    ax.set_xlim(0.5, max(top * 1.15, (band or {}).get("high", 10) + 2))
    ticks = [1] + [t for t in range(10, int(top) + 10, 10)]
    ax.set_xticks(ticks)
    ax.set_xticklabels([ordinal(t) for t in ticks])
    ax.grid(False)
    finish(fig, ax, spec, out_dir)


RENDERERS = {"line-yoy": line_yoy, "line": line_plain, "dots": dots}


def render(spec, out_dir):
    written, skipped = [], []
    for chart in spec["charts"]:
        renderer = RENDERERS.get(chart["type"])
        if renderer is None:
            skipped.append({"file": chart["file"], "reason": f"unknown chart type {chart['type']}"})
            continue
        try:
            renderer(chart, out_dir)
            written.append(chart["file"])
        except Skip as why:
            skipped.append({"file": chart["file"], "reason": str(why)})
    return {"written": written, "skipped": skipped}


def main(argv):
    if len(argv) != 2:
        sys.stderr.write("usage: charts.py <spec.json> <out-dir>\n")
        return 2
    with open(argv[0], encoding="utf-8") as handle:
        spec = json.load(handle)
    os.makedirs(argv[1], exist_ok=True)
    sys.stdout.write(json.dumps(render(spec, argv[1])) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
