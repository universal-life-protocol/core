# ULP v4 View Stub (Minimal Grammar)

This document defines a minimal `.view` grammar sufficient for v4 renderer
compliance and adapter defaults. It is not a full replacement for v3 view
specs; it is a stable stub that declares layout intent only.

## 1. Minimal grammar (EBNF)

```
ViewFile     = ViewDecl, { ViewStmt }, "end", WS, "view", NL ;
ViewDecl     = "view", WS, "v1", NL ;

ViewStmt     = CanvasStmt
             | LayoutStmt
             | NodeStmt
             | KindMapStmt
             | Comment
             | Blank ;

CanvasStmt   = "canvas", WS, "infinite", NL
             | "canvas", WS, "bounded", WS, Bounds, NL ;

LayoutStmt   = "layout", WS, "quadrant", NL
             | "layout", WS, "free", NL ;

NodeStmt     = "node", WS, "default", NL, NodeBody, "end", WS, "node", NL ;
NodeBody     = { NodeProp } ;
NodeProp     = "shape", WS, ("card" | "dot" | "glyph"), NL ;

KindMapStmt  = "map", WS, "kind", NL, { KindMapRule }, "end", WS, "map", NL ;
KindMapRule  = TraceType, WS, KindValue, NL ;
TraceType    = Ident ;
KindValue    = "FACT" | "QUESTION" | "COMMITMENT" | "REQUEST" | "OFFER" | "STORY" | "CONSENT" ;

Bounds       = "x", "=", Number, WS, "y", "=", Number, WS,
               "w", "=", Number, WS, "h", "=", Number ;

Comment      = ("#" | "//"), { any_char_except_NL }, NL ;
Blank        = { WS }, NL ;

Number       = DIGIT, { DIGIT }, [ ".", DIGIT, { DIGIT } ] ;
WS           = 1*(" " | "\t") ;
NL           = "\n" ;
DIGIT        = "0"…"9" ;
```

## 2. Semantics (normative)

- `canvas infinite` declares unbounded coordinate space. Coordinates are view
  hints only and MUST NOT be treated as truth.
- `layout quadrant` declares four semantic quadrants (KK/KU/UK/UU) as the
  default spatial layout.
- `layout free` allows renderer-defined layout without quadrant alignment.
- `node default` defines the default visual primitive for nodes.
- A renderer MAY ignore `shape` if it offers a different visual language, but
  MUST preserve node identity and quadrant mapping.
- `map kind` declares trace-type to kind overrides for adapters and renderers.
  Unknown trace types MUST fall back to adapter defaults.

## 3. Minimal adapter output (recommended)

```
view v1
canvas infinite
layout quadrant
node default
  shape card
end node
map kind
  STDIN REQUEST
  STDOUT FACT
  STDERR FACT
  CLAUSE COMMITMENT
end map
end view
```
