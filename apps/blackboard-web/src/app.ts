import { TraceStore } from "./core/store";
import { makeTrace, validateTrace } from "./core/trace";
import { projectFeed } from "./core/projection";
import type { ULPTrace } from "./core/types";
import { el, clear } from "./ui/dom";
import { HttpAdapter } from "./adapters/httpAdapter";
import {
  CHAT_TEMPLATE,
  DEFAULT_TEMPLATE,
  projectFromTemplate,
  validateTemplatePayload
} from "./core/templates";
import { loadInterrupts } from "./core/interrupts";
import { MqttAdapter } from "./adapters/mqttAdapter";
import { verifySignature } from "./core/signature";
import type { TransportAdapter } from "./adapters/adapter";

export async function startApp(root: HTMLElement) {
  const store = new TraceStore();

  const relay = localStorage.getItem("ulp_relay") ?? "";
  const httpAdapter = relay ? new HttpAdapter(relay) : null;
  const interrupts = await loadInterrupts();
  const mqttAdapter =
    interrupts.MQTT || interrupts.WS ? new MqttAdapter({ mqtt: interrupts.MQTT, ws: interrupts.WS }) : null;
  const adapters: TransportAdapter[] = [];
  if (httpAdapter) adapters.push(httpAdapter);
  if (mqttAdapter) adapters.push(mqttAdapter);

  const header = el("div", { class: "row" }, el("h1", {}, "ULP Blackboard (minimal)"));

  const relayRow = el(
    "div",
    { class: "row" },
    el("input", { id: "relay", placeholder: "Relay base URL (optional)", value: relay }),
    el(
      "button",
      {
        onclick: () => {
          const v = (document.getElementById("relay") as HTMLInputElement).value.trim();
          localStorage.setItem("ulp_relay", v);
          location.reload();
        }
      },
      "Set relay"
    )
  );

  const composer = el(
    "div",
    { class: "card" },
    el(
      "div",
      { class: "row" },
      el(
        "select",
        { id: "kind" },
        el("option", { value: "post" }, "post"),
        el("option", { value: "listing" }, "listing")
      ),
      el("input", { id: "template", placeholder: "template", value: DEFAULT_TEMPLATE })
    ),
    el(
      "div",
      { class: "row", id: "listing-fields" },
      el("input", { id: "title", placeholder: "title (listing)" }),
      el("input", { id: "price", placeholder: "price", type: "number", step: "0.01" })
    ),
    el("textarea", { id: "text", placeholder: "Write something..." }),
    el(
      "div",
      { class: "row" },
      el("button", { onclick: () => onPublish() }, "Publish (local + relay)"),
      el("button", { onclick: () => render() }, "Refresh")
    )
  );

  let feedFilter: "all" | "post" | "listing" = "all";
  const filterRow = el(
    "div",
    { class: "row" },
    el(
      "button",
      {
        class: "tab active",
        onclick: () => {
          feedFilter = "all";
          updateFilterButtons();
          render();
        }
      },
      "All"
    ),
    el(
      "button",
      {
        class: "tab",
        onclick: () => {
          feedFilter = "post";
          updateFilterButtons();
          render();
        }
      },
      "Posts"
    ),
    el(
      "button",
      {
        class: "tab",
        onclick: () => {
          feedFilter = "listing";
          updateFilterButtons();
          render();
        }
      },
      "Listings"
    )
  );

  const status = el("div", { class: "status muted" }, "");
  const feed = el("div", { class: "feed" });

  let chatRoomFilter = "";
  const chatList = el("div", { class: "chat-list" });

  const chatCard = el(
    "div",
    { class: "card chat" },
    el(
      "div",
      { class: "row" },
      el("h2", {}, "Chat"),
      el("input", {
        id: "chat-filter",
        placeholder: "Filter room (optional)",
        oninput: (event: Event) => {
          chatRoomFilter = (event.target as HTMLInputElement).value.trim();
          render();
        }
      })
    ),
    el(
      "div",
      { class: "row" },
      el("input", { id: "chat-room", placeholder: "Room (optional)" }),
      el("button", { onclick: () => onSendChat() }, "Send")
    ),
    el("textarea", { id: "chat-text", placeholder: "Type a message..." }),
    chatList
  );

  const peersCard = el(
    "div",
    { class: "card peers" },
    el("h2", {}, "Peers"),
    el("div", { class: "peers-list" })
  );

  root.append(header, relayRow, composer, filterRow, status, feed, chatCard, peersCard);

  const kindSelect = document.getElementById("kind") as HTMLSelectElement;
  const listingFields = document.getElementById("listing-fields") as HTMLDivElement;
  function syncListingFields() {
    listingFields.style.display = kindSelect.value === "listing" ? "flex" : "none";
  }
  kindSelect.addEventListener("change", syncListingFields);
  syncListingFields();

  function updateFilterButtons() {
    const buttons = Array.from(filterRow.querySelectorAll("button"));
    for (const button of buttons) button.classList.remove("active");
    if (feedFilter === "all") buttons[0]?.classList.add("active");
    if (feedFilter === "post") buttons[1]?.classList.add("active");
    if (feedFilter === "listing") buttons[2]?.classList.add("active");
  }

  function setStatus(message: string) {
    status.textContent = message;
  }

  async function onPublish() {
    const kind = (document.getElementById("kind") as HTMLSelectElement).value;
    const template =
      (document.getElementById("template") as HTMLInputElement).value.trim() || DEFAULT_TEMPLATE;
    const text = (document.getElementById("text") as HTMLTextAreaElement).value.trim();
    const title = (document.getElementById("title") as HTMLInputElement).value.trim();
    const priceRaw = (document.getElementById("price") as HTMLInputElement).value.trim();
    const price = priceRaw ? Number(priceRaw) : null;
    if (!text && kind !== "listing") return;

    const payload =
      kind === "listing"
        ? {
            title,
            price: price ?? 0,
            text
          }
        : { text };
    const payloadCheck = validateTemplatePayload(template, payload);
    if (!payloadCheck.ok) {
      setStatus(`Template error: ${payloadCheck.reason}`);
      return;
    }

    const trace = await makeTrace({
      kind,
      template,
      payload
    });

    await store.put(trace);

    for (const adapter of adapters) {
      await adapter.publish(trace);
    }

    (document.getElementById("text") as HTMLTextAreaElement).value = "";
    (document.getElementById("title") as HTMLInputElement).value = "";
    (document.getElementById("price") as HTMLInputElement).value = "";
    setStatus("");
    await render();
  }

  async function onSendChat() {
    const text = (document.getElementById("chat-text") as HTMLTextAreaElement).value.trim();
    const room = (document.getElementById("chat-room") as HTMLInputElement).value.trim();
    if (!text) return;

    const payload = room ? { text, room } : { text };
    const payloadCheck = validateTemplatePayload(CHAT_TEMPLATE, payload);
    if (!payloadCheck.ok) {
      setStatus(`Template error: ${payloadCheck.reason}`);
      return;
    }

    const trace = await makeTrace({
      kind: "chat",
      template: CHAT_TEMPLATE,
      payload
    });

    await store.put(trace);

    for (const adapter of adapters) {
      await adapter.publish(trace);
    }

    (document.getElementById("chat-text") as HTMLTextAreaElement).value = "";
    setStatus("");
    await render();
  }

  async function render() {
    const recent = await store.listRecent(200);
    const feedKinds =
      feedFilter === "all" ? ["post", "listing"] : ([feedFilter] as Array<"post" | "listing">);
    const projected = projectFeed(recent, { kinds: feedKinds });
    clear(feed);
    if (!projected.length) {
      feed.append(
        el(
          "div",
          { class: "empty" },
          "No traces yet. Publish a post or listing to start the feed."
        )
      );
    } else {
      for (const t of projected) feed.append(renderTrace(t));
    }

    const chatProjected = projectFeed(recent, { kinds: ["chat"] });
    const chatVisible = chatRoomFilter
      ? chatProjected.filter(
          (t) => (t.payload as { room?: unknown })?.room === chatRoomFilter
        )
      : chatProjected;

    clear(chatList);
    if (!chatVisible.length) {
      chatList.append(
        el(
          "div",
          { class: "empty" },
          "No chat messages yet. Send one to start the conversation."
        )
      );
      return;
    }
    for (const t of chatVisible) chatList.append(renderChat(t));
  }

  function renderTrace(t: ULPTrace) {
    const projection = projectFromTemplate(t.template, t.payload);
    const text = projection.text ?? "";
    const title = projection.title ?? "";
    return el(
      "div",
      { class: "item" },
      el(
        "div",
        { class: "meta" },
        el("span", { class: "pill" }, t.kind),
        el("span", { class: "pill" }, t.template),
        el("span", { class: "muted" }, new Date(t.ts * 1000).toLocaleString())
      ),
      title ? el("div", { class: "title" }, title) : el("div", { class: "body" }, text || "(no text)"),
      title ? el("div", { class: "body" }, text || "(no text)") : el("span", {}),
      el("div", { class: "muted" }, t.id)
    );
  }

  function renderChat(t: ULPTrace) {
    const projection = projectFromTemplate(t.template, t.payload);
    const text = projection.text ?? "";
    const room = (t.payload as { room?: unknown })?.room;
    return el(
      "div",
      { class: "chat-item" },
      el(
        "div",
        { class: "chat-meta" },
        room ? el("span", { class: "pill" }, String(room)) : el("span", { class: "muted" }, "public"),
        el("span", { class: "muted" }, new Date(t.ts * 1000).toLocaleTimeString())
      ),
      el("div", { class: "chat-body" }, text || "(no text)")
    );
  }

  for (const adapter of adapters) {
    (async () => {
      for await (const t of adapter.subscribe({ since: Math.floor(Date.now() / 1000) - 60 * 60 })) {
        const ok = await validateTrace(t);
        if (!ok.ok) continue;
        if (t.sig && t.author) {
          const verified = await verifySignature(t);
          if (!verified) continue;
        }
        await store.put(t);
        await render();
      }
    })();
  }

  let relayPeerCount: number | null = null;
  let relayLastError: string | null = null;
  async function pollRelayPeers() {
    if (!relay) return;
    try {
      const res = await fetch(`${relay.replace(/\/$/, "")}/health`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { peers?: number };
      relayPeerCount = typeof data.peers === "number" ? data.peers : null;
      relayLastError = null;
    } catch (err) {
      relayLastError = err instanceof Error ? err.message : String(err);
    }
  }

  function renderPeers() {
    const list = peersCard.querySelector(".peers-list") as HTMLElement;
    clear(list);
    if (!adapters.length && !relay) {
      list.append(el("div", { class: "muted" }, "No adapters configured."));
      return;
    }
    if (httpAdapter) {
      list.append(
        el(
          "div",
          { class: "peer-row" },
          el("span", { class: "pill" }, "http"),
          el(
            "span",
            { class: "muted" },
            relayPeerCount != null ? `peers: ${relayPeerCount}` : "peers: unknown"
          ),
          relayLastError ? el("span", { class: "muted" }, relayLastError) : el("span", { class: "muted" }, "")
        )
      );
    }
    for (const adapter of adapters) {
      if (adapter.name === "http") continue;
      const status = adapter.status();
      list.append(
        el(
          "div",
          { class: "peer-row" },
          el("span", { class: "pill" }, adapter.name),
          el("span", { class: "muted" }, status.connected ? "connected" : "disconnected"),
          el(
            "span",
            { class: "muted" },
            status.peerCount != null ? `peers: ${status.peerCount}` : ""
          ),
          status.lastError ? el("span", { class: "muted" }, status.lastError) : el("span", { class: "muted" }, "")
        )
      );
    }
  }

  if (relay) {
    pollRelayPeers().then(renderPeers);
    window.setInterval(() => {
      pollRelayPeers().then(renderPeers);
    }, 5_000);
  }
  window.setInterval(renderPeers, 5_000);

  await render();
  renderPeers();
}
