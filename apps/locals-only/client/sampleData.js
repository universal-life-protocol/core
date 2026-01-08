// sampleData.js
// Load sample marketplace data for demonstration

import { createRecord } from "./record.js";
import { storeRecord } from "./index.js";

/**
 * Load sample listings from JSON file
 */
export async function loadSampleData(db) {
  console.log('[sampleData] Starting to load sample data...');
  try {
    console.log('[sampleData] Fetching /world/sample-data.json...');
    const response = await fetch('/world/sample-data.json');
    console.log('[sampleData] Fetch response:', response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`Failed to load sample data: ${response.status} ${response.statusText}`);
    }

    console.log('[sampleData] Parsing JSON...');
    const sampleListings = await response.json();
    console.log('[sampleData] Parsed', sampleListings.length, 'listings');

    const loaded = [];

    for (let i = 0; i < sampleListings.length; i++) {
      const item = sampleListings[i];
      try {
        console.log(`[sampleData] Creating record ${i + 1}/${sampleListings.length}...`);
        const record = await createRecord(item.text);
        await storeRecord(db, record);
        loaded.push(record);
      } catch (err) {
        console.error(`[sampleData] failed to create record ${i + 1}:`, err);
      }
    }

    console.log(`[sampleData] Successfully loaded ${loaded.length} sample listings`);
    return loaded;
  } catch (err) {
    console.error('[sampleData] error loading sample data:', err);
    console.error('[sampleData] error stack:', err.stack);
    throw err;
  }
}

/**
 * Clear all records (useful for resetting)
 */
export async function clearAllRecords(db) {
  const tx = db.transaction("records", "readwrite");
  const store = tx.objectStore("records");

  return new Promise((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => {
      console.log('[sampleData] cleared all records');
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Get count of stored records
 */
export async function getRecordCount(db) {
  const tx = db.transaction("records", "readonly");
  const store = tx.objectStore("records");

  return new Promise((resolve, reject) => {
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Generate a single random listing on the fly
 */
export async function generateRandomListing() {
  const titles = [
    "Vintage Camera", "Handmade Pottery", "Mountain Bike",
    "Acoustic Guitar", "Office Chair", "Gaming Console",
    "Coffee Table", "Yoga Mat", "Running Shoes",
    "Desk Lamp", "Backpack", "Winter Jacket"
  ];

  const locations = [
    "San Francisco, CA", "Austin, TX", "Portland, OR",
    "Seattle, WA", "Denver, CO", "Boulder, CO",
    "Brooklyn, NY", "Chicago, IL", "Miami, FL"
  ];

  const conditions = ["New", "Like New", "Excellent", "Very Good", "Good"];

  const title = titles[Math.floor(Math.random() * titles.length)];
  const price = Math.floor(Math.random() * 500) + 20;
  const location = locations[Math.floor(Math.random() * locations.length)];
  const condition = conditions[Math.floor(Math.random() * conditions.length)];

  const text = `type: listing
title: ${title}
price: $${price}
location: ${location}
condition: ${condition}
description: A great item in ${condition.toLowerCase()} condition.
timestamp: ${new Date().toISOString()}`;

  return createRecord(text);
}
