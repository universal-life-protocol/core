Excellent — we can add **I/O channels and a TTL guard** **without breaking minimality** by treating them as **optional control predicates**, not semantics.

Below is **one AWK script**, still POSIX-portable, that supports:

* optional **stdin** (initial facts)
* optional **stdout** (result sink)
* optional **stderr** (diagnostics)
* optional **TTL** (bounded fixpoint / fuel)
* `.include` / `.ignore` path constraints
* the **same single quadratic rule**

All additions are **orthogonal** and removable.

---

## 1. Semantics (tight and minimal)

### Channels

| File           | Meaning              |
| -------------- | -------------------- |
| stdin (or `-`) | initial facts        |
| `.stdout`      | where results go     |
| `.stderr`      | where diagnostics go |

If `.stdout` / `.stderr` do not exist → default to standard streams.

---

### TTL (fuel, not logic)

* `.ttl` contains **symbols only**, one per line
* Each fixpoint iteration consumes **one symbol**
* When empty → halt
* No arithmetic meaning; only **presence / exhaustion**

This is *fuel semantics*, not counting.

---

## 2. One AWK script (complete machine)

```awk
# machine.awk
# Binary graph rewrite with include/ignore, I/O channels, TTL fuel

# ---------- constraints ----------
FILENAME == ".include" {
    include[$1] = 1
    has_include = 1
    next
}

FILENAME == ".ignore" {
    ignore[$1] = 1
    next
}

# ---------- ttl fuel ----------
FILENAME == ".ttl" {
    fuel[++fuel_n] = $1
    next
}

# ---------- edges / stdin ----------
{
    edge[$1, $2] = 1
}

END {
    # output channels
    out = (system("test -f .stdout") == 0 ? ".stdout" : "/dev/stdout")
    err = (system("test -f .stderr") == 0 ? ".stderr" : "/dev/stderr")

    changed = 1

    while (changed) {
        # TTL guard (fuel exhaustion)
        if (fuel_n > 0) {
            delete fuel[fuel_n]
            fuel_n--
        } else if (fuel_n == 0 && ".ttl" in FILENAME) {
            print "halt: ttl exhausted" > err
            break
        }

        changed = 0

        for (e1 in edge) {
            split(e1, a, SUBSEP)
            x = a[1]; y = a[2]

            # path constraints
            if (ignore[y]) continue
            if (has_include && !include[y]) continue

            for (e2 in edge) {
                split(e2, b, SUBSEP)
                if (b[1] == y) {
                    z = b[2]
                    if (!edge[x, z]) {
                        edge[x, z] = 1
                        changed = 1
                    }
                }
            }
        }

        if (!changed)
            print "fixpoint reached" > err
    }

    for (e in edge) {
        split(e, a, SUBSEP)
        print a[1], a[2] > out
    }
}
```

---

## 3. How to run it (examples)

### Default (stdin/stdout)

```sh
awk -f machine.awk edges
```

### With constraints and TTL

```sh
awk -f machine.awk .include .ignore .ttl edges
```

### Streaming stdin

```sh
cat edges | awk -f machine.awk
```

### Capture output explicitly

```sh
touch .stdout .stderr
awk -f machine.awk edges
```

---

## 4. Why this is still minimal

Nothing essential was added:

| Feature          | Role                  |
| ---------------- | --------------------- |
| stdin            | initial facts         |
| stdout           | sink                  |
| stderr           | diagnostics           |
| TTL              | fuel / bounded search |
| include / ignore | path guards           |
| join             | unchanged             |
| fixpoint         | unchanged             |

The **core equation** is untouched:

```
(x,y) ∧ (y,z) ⇒ (x,z)
```

Everything else is **execution policy**, not computation.

---

## 5. Conceptual mapping back to your model

| Dotfile     | Meaning          |
| ----------- | ---------------- |
| `.atom`     | symbol           |
| `.link`     | edge             |
| `.genesis`  | rewrite rule     |
| `.sequence` | fixpoint loop    |
| `.include`  | admissible paths |
| `.ignore`   | forbidden paths  |
| `.ttl`      | fuel             |
| stdin       | initial world    |
| stdout      | observed world   |
| stderr      | meta-world       |

You now have:

* **logic**
* **constraints**
* **fuel**
* **channels**

…all in **one irreducible AWK executor**.

---

## 6. Final invariant (still true)

> **Computation = constrained binary join
> repeated until fuel or stability**

That is the smallest *operational* universal machine that still feels like UNIX.

If you want, next we can:

* encode TTL *structurally* (no `.ttl` file)
* collapse stderr into the graph itself
* remove `system()` calls
* turn this into a self-hosting executor

Just say how sharp you want the blade.
