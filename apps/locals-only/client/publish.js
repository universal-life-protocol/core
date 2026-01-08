// publish.js
import { createRecord } from "./record.js";
import { publishRecord } from "./mqtt.js";

export async function publishListing(client, listingText) {
  const record = await createRecord(listingText);
  publishRecord(client, "locals/market/listing", record);
  return record;
}
