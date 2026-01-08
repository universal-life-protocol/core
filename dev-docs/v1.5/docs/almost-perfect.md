Good — this fits *cleanly* into the same minimal model.
We can add **runtime path constraints** (`.include` / `.ignore`) **without adding power**, only *restricting traversal*. This is exactly how Prolog modules or Datalog strata work.

Below is the **same one-AWK universal engine**, extended *minimally* with **include / ignore predicates**, still:

* binary only
* quadratic join
* fixpoint
* single script
* POSIX awk
* no semantic numbers

---

## 1. Semantics first (very important)

We define **constraints as unary predicates** on atoms.

### Interpretation

| File       | Meaning                                   |
| ---------- | ----------------------------------------- |
| `.include` | atom is allowed as an intermediate node   |
| `.ignore`  | atom is forbidden as an intermediate node |

Rules:

* `(X,Y)` is always allowed as a *fact*
* `(X,Y) ⨂ (Y,Z) → (X,Z)` **only if `Y` is included and not ignored**
* Absence of `.include` means **allow all**
* Presence of `.ignore` always blocks

This is *path constraint logic*, not computation logic.

---

## 2. Input format (still minimal)

We keep **binary facts** plus **unary constraints**:

```
A B
B C
C D
```

Optional constraint files:

**.include**

```
B
C
```

**.ignore**

```
C
```

No numbers.
Only symbols.

---

## 3. One AWK script (with constraints)

This is the **entire machine**:

```awk
# constrained_closure.awk
# Binary graph + include / ignore path constraints

FILENAME == ".include" {
    include[$1] = 1
    has_include = 1
    next
}

FILENAME == ".ignore" {
    ignore[$1] = 1
    next
}

{
    edge[$1, $2] = 1
}

END {
    changed = 1

    while (changed) {
        changed = 0

        for (e1 in edge) {
            split(e1, a, SUBSEP)
            x = a[1]; y = a[2]

            # path constraint at join point
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
    }

    for (e in edge) {
        split(e, a, SUBSEP)
        print a[1], a[2]
    }
}
```

Run it:

```sh
awk -f constrained_closure.awk .include .ignore edges
```

(Any missing file is simply ignored.)

---

## 4. Why this is still minimal

Nothing fundamental was added:

| Feature    | Type            |
| ---------- | --------------- |
| `.include` | unary predicate |
| `.ignore`  | unary predicate |
| join rule  | unchanged       |
| memory     | unchanged       |
| loop       | unchanged       |

This is **monotonic logic with guards** — exactly Datalog with constraints.

---

## 5. Logical form (for clarity)

This AWK script implements *exactly*:

```
path(X,Z) :-
  path(X,Y),
  path(Y,Z),
  include(Y),
  not ignore(Y).
```

If `.include` is absent, `include(Y)` is vacuously true.

This is **pure logic**, not control flow.

---

## 6. Why this matches your `.manifest` idea

Conceptually:

| Your dotfile | Role                         |
| ------------ | ---------------------------- |
| `.genesis`   | rewrite rule                 |
| `.sequence`  | fixpoint                     |
| `.include`   | admissible paths             |
| `.ignore`    | forbidden paths              |
| `.manifest`  | which constraints are active |
| `.atom`      | symbols                      |

The AWK script is just the **executor**.

---

## 7. BFS / DFS behavior (unchanged)

* **BFS**: fixpoint, fair
* **DFS**: ordering of edge insertion
* **Termination**: monotonic growth → finite closure

Constraints only *prune*, never add power.

---

## 8. Important theoretical note

Adding `.include` / `.ignore`:

* does **not** increase expressive power
* does **not** threaten minimality
* does **not** break universality

It simply restricts the search space — like types or modules.

---

## 9. Minimal invariant preserved

You still have **one invariant equation**:

> **Computation = constrained binary join until stable**

That is the irreducible core.

---

## 10. If you want to go even further

Possible next reductions (all valid):

* Compile `.include` / `.ignore` into the edge set itself
* Encode constraints as self-loops
* Collapse everything into **one relation**
* Remove `while` by self-feeding input (stream fixpoint)
* Encode `.manifest` as higher-order rules

Just tell me how close to the bone you want to cut.
