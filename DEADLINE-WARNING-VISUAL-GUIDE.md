# Deadline Warning Visual Guide

Quick reference guide showing how deadline warnings appear in the UI.

---

## Calendar Cell Badges

### Urgent Deadline (≤3 days)

```
┌─────────────┐
│     15      │  ← Day number
│             │
│ [⏱ Blair]  │  ← Red badge with pulse animation
│  🔴🔴🔴     │     bg-red-100, text-red-700, font-semibold
└─────────────┘
  ↑ Red tint background (bg-red-50/50)
```

**Visual Characteristics:**
- 🔴 Red background (`bg-red-100`)
- 🔴 Red text (`text-red-700`)
- ⚡ Pulse animation (`animate-pulse`)
- 📍 Red cell tint (`bg-red-50/50`)
- ⏱️ Timer icon
- **B** Bold font weight (`font-semibold`)

---

### Warning Deadline (4-7 days)

```
┌─────────────┐
│     18      │  ← Day number
│             │
│ [⏱ Centre] │  ← Amber badge (no animation)
│  🟡🟡🟡     │     bg-amber-100, text-amber-700, font-medium
└─────────────┘
  ↑ Amber tint background (bg-amber-50/30)
```

**Visual Characteristics:**
- 🟡 Amber background (`bg-amber-100`)
- 🟡 Amber text (`text-amber-700`)
- 📍 Amber cell tint (`bg-amber-50/30`)
- ⏱️ Timer icon
- Medium font weight (`font-medium`)

---

### Normal Deadline (>7 days)

```
┌─────────────┐
│     25      │  ← Day number
│             │
│ [⏱ Bedford]│  ← Gray badge
│  ⚪⚪⚪     │     bg-slate-100, text-slate-700
└─────────────┘
  ↑ No background tint
```

**Visual Characteristics:**
- ⚪ Gray background (`bg-slate-100`)
- ⚪ Gray text (`text-slate-700`)
- ⏱️ Timer icon
- Normal font weight

---

## Registration Deadlines Panel

### Urgent Status (≤3 days)

```
┌─────────────────────────────────────────────────────────────┐
│ REGISTRATION DEADLINES                                      │
├─────────────────────────────────────────────────────────────┤
│ 🔴  Blair County, PA              2 days   [URGENT]        │
│ ⚡   Deadline: Jan 25, 2026                                 │
│ 💥 ← Animated ping effect                                  │
└─────────────────────────────────────────────────────────────┘
    ↑ Row background: bg-red-50/50
```

**Visual Characteristics:**
- 🔴 Red Timer icon (`text-red-500`)
- 💥 Animated ping effect on icon
- 🔴 Red badge: "URGENT" (`bg-red-100 text-red-700`)
- **2 days** in bold red (`text-red-600 font-bold`)
- Row has red background tint (`bg-red-50/50`)

---

### Soon Status (4-14 days)

```
┌─────────────────────────────────────────────────────────────┐
│ REGISTRATION DEADLINES                                      │
├─────────────────────────────────────────────────────────────┤
│ 🟡  Centre County, PA             5 days   [SOON]          │
│     Deadline: Jan 28, 2026                                 │
└─────────────────────────────────────────────────────────────┘
```

**Visual Characteristics:**
- 🟡 Amber Timer icon (`text-amber-500`)
- 🟡 Amber badge: "SOON" (`bg-amber-100 text-amber-700`)
- **5 days** in amber semibold (`text-amber-600 font-semibold`)

---

### Open Status (>14 days)

```
┌─────────────────────────────────────────────────────────────┐
│ REGISTRATION DEADLINES                                      │
├─────────────────────────────────────────────────────────────┤
│ 🟢  Bedford County, PA            21 days  [OPEN]          │
│     Deadline: Feb 13, 2026                                 │
└─────────────────────────────────────────────────────────────┘
```

**Visual Characteristics:**
- 🟢 Green Timer icon (`text-green-500`)
- 🟢 Green badge: "OPEN" (`bg-green-100 text-green-700`)
- **21 days** in normal text (`text-slate-700`)

---

### Closed Status (Past Deadline)

```
┌─────────────────────────────────────────────────────────────┐
│ REGISTRATION DEADLINES                                      │
├─────────────────────────────────────────────────────────────┤
│ ⚪  Franklin County, PA           Closed   [CLOSED]        │
│     Deadline: Jan 15, 2026                                 │
└─────────────────────────────────────────────────────────────┘
```

**Visual Characteristics:**
- ⚪ Gray Timer icon (`text-slate-400`)
- ⚪ Gray badge: "CLOSED" (`bg-slate-100 text-slate-500`)
- "Closed" in gray text

---

## Legend Display

The calendar includes a legend showing all indicator types:

```
┌─────────────────────────────────────────────────────────────┐
│ Legend:                                                      │
│ • [Blue badge] Auction Sale                                 │
│ • [Red badge with ⏱] Registration Deadline (≤3 days) 🔴    │
│ • [Amber badge with ⏱] Registration Deadline (4-7 days) 🟡  │
│ • Today highlighted in amber                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Animation Details

### 1. Pulse Animation (Urgent Badges)

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

- **Applied to:** Calendar cell badges when deadline ≤3 days
- **Duration:** ~2 seconds per cycle
- **Purpose:** Draw immediate attention to critical deadlines

### 2. Ping Animation (Urgent Icon)

```css
@keyframes ping {
  0% { transform: scale(1); opacity: 1; }
  75%, 100% { transform: scale(2); opacity: 0; }
}
```

- **Applied to:** Timer icon in registration list when ≤3 days
- **Duration:** ~1 second per cycle
- **Purpose:** Create ripple effect for maximum urgency

---

## Color Coding Summary

| Urgency Level | Days Until | Badge Color | Text Color | Background | Animation |
|---------------|------------|-------------|------------|------------|-----------|
| **Critical** | 0-3 | Red-100 | Red-700 | Red-50/50 | Pulse + Ping |
| **Warning** | 4-7 | Amber-100 | Amber-700 | Amber-50/30 | None |
| **Normal** | 8+ | Slate-100 | Slate-700 | None | None |
| **Closed** | Past | Slate-100 | Slate-500 | None | None |

---

## Typography

### Font Weights

- **Critical (≤3 days):** `font-semibold` or `font-bold`
- **Warning (4-7 days):** `font-medium` or `font-semibold`
- **Normal (>7 days):** Regular font weight
- **Closed:** Regular font weight (grayed)

### Font Sizes

- **Calendar badges:** `text-xs` (0.75rem)
- **Days remaining:** `text-sm` (0.875rem)
- **County names:** `text-sm` or base
- **Deadline dates:** `text-sm`

---

## Responsive Behavior

### Mobile (< 640px)
- Badges remain visible but may truncate county names
- Full deadline information available on tap
- Animations still visible

### Tablet (640px - 1024px)
- Optimal badge layout
- Full county names visible
- All features accessible

### Desktop (> 1024px)
- Full calendar view with all badges
- Side-by-side calendar and registration list
- Maximum information density

---

## Accessibility

### Color Contrast Ratios

All color combinations meet WCAG AA standards:

| Background | Text | Ratio | Status |
|------------|------|-------|--------|
| Red-100 | Red-700 | 4.5:1+ | ✅ AA |
| Amber-100 | Amber-700 | 4.5:1+ | ✅ AA |
| Slate-100 | Slate-700 | 4.5:1+ | ✅ AA |

### Screen Reader Support

- Timer icons have `aria-label` for accessibility
- Status badges include text labels (not icon-only)
- Animations don't interfere with screen reader navigation

---

## Example: Multiple Deadlines on Same Day

```
┌─────────────┐
│     15      │
│             │
│ [⏱ Blair]  │  ← Urgent (2 days)
│ [⏱ Centre] │  ← Warning (5 days)
│ +1 more     │
└─────────────┘
  ↑ Red background (most urgent takes precedence)
```

When multiple deadlines fall on the same day:
1. Most urgent deadline determines cell background color
2. Up to 2 badges shown
3. "+X more" indicator if >2 deadlines
4. Click to see full list

---

## Testing Deadlines

### Quick Test Scenarios

1. **Today:** Create deadline for today
   → Should show "Today!" in red with pulse

2. **Tomorrow:** Create deadline for tomorrow (1 day)
   → Should show red badge with pulse

3. **3 Days:** Create deadline for 3 days from now
   → Should show red badge with pulse

4. **4 Days:** Create deadline for 4 days from now
   → Should show amber badge (no pulse)

5. **7 Days:** Create deadline for 7 days from now
   → Should show amber badge (no pulse)

6. **8 Days:** Create deadline for 8 days from now
   → Should show gray badge

7. **Past:** Create deadline in the past
   → Should show "CLOSED" status in gray

---

## Developer Notes

### CSS Classes Reference

**Urgent (≤3 days):**
```css
.deadline-urgent {
  @apply bg-red-100 text-red-700 font-semibold animate-pulse;
}
.cell-urgent {
  @apply bg-red-50/50;
}
```

**Warning (4-7 days):**
```css
.deadline-warning {
  @apply bg-amber-100 text-amber-700 font-medium;
}
.cell-warning {
  @apply bg-amber-50/30;
}
```

**Normal (>7 days):**
```css
.deadline-normal {
  @apply bg-slate-100 text-slate-700;
}
```

---

This visual guide serves as a quick reference for developers, designers, and QA testers to understand how deadline warnings should appear throughout the application.
