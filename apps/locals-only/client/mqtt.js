// mqtt.js
// Transport only — no semantics

import mqtt from "https://unpkg.com/mqtt/dist/mqtt.min.js";

export function connectMQTT(brokerUrl, options = {}) {
  const client = mqtt.connect(brokerUrl);

  const subscribeToTemplates = options.subscribeToTemplates !== false;

  client.on("connect", () => {
    console.log("[mqtt] connected");
    client.subscribe("locals/market/#");

    // Subscribe to template propagation topic
    if (subscribeToTemplates) {
      client.subscribe("locals/template/#");
      console.log("[mqtt] subscribed to templates");
    }
  });

  client.on("error", err => {
    console.error("[mqtt] error", err);
  });

  return client;
}

export function publishRecord(client, topic, record) {
  client.publish(
    topic,
    JSON.stringify(record),
    { qos: 1 }
  );
}

/**
 * Publish a template to the network
 * Templates propagate like any other record
 */
export function publishTemplate(client, templateRecord) {
  client.publish(
    "locals/template",
    JSON.stringify(templateRecord),
    { qos: 1 }
  );
  console.log("[mqtt] published template:", templateRecord.rid);
}
