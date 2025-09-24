// server/services/mqttService.js
import mqtt from 'mqtt';
import Device from '../models/Device.js';

// const ADAFRUIT_USER = process.env.ADAFRUIT_IO_USERNAME;
// const ADAFRUIT_KEY = process.env.ADAFRUIT_IO_KEY;

// if (!ADAFRUIT_USER || !ADAFRUIT_KEY) {
//   console.warn('ADAFRUIT_IO_USERNAME / ADAFRUIT_IO_KEY not set — mqtt will not start until provided');
// }

// const MQTT_URL = `mqtts://${ADAFRUIT_USER}:${ADAFRUIT_KEY}@io.adafruit.com`;

/**
 * Maps feed name (from adafruit topic) to SensorPoint field name
 */
function feedToField(feed) {
  const f = String(feed).toLowerCase();
  if (f.includes('sonar') || f === 'sonardepth' || f.includes('sonardepth')) return 'sonarDepth';
  if (f.includes('pressure')) return 'pressure';
  if (f.includes('latitude') || f === 'lat') return 'latitude';
  if (f.includes('longitude') || f === 'lon') return 'longitude';
  if (f === 'rssi' || f.includes('rssi')) return 'rssi';
  return feed; // unknown feed -> store under its key
}

export async function startMqtt(io, { user, key }) {
  if (!user || !key) {
    console.warn('Skipping MQTT start because credentials are missing.');
    return;
  }
  const MQTT_URL = `mqtts://${user}:${key}@io.adafruit.com`;
  const client = mqtt.connect(MQTT_URL);

  client.on('connect', () => {
    console.log('Connected to Adafruit IO MQTT');
    // subscribe to all feeds for the user
    const topic = `${user}/feeds/#`;
    client.subscribe(topic, (err) => {
      if (err) console.error('mqtt subscribe err', err);
      else console.log('Subscribed to', topic);
    });
  });

  client.on('error', (err) => {
    console.error('MQTT error', err);
  });

  const pendingEmits = new Map(); // token -> { timer, snapshot }
  const lastEmitted = new Map(); // token -> snapshot (for dedupe)

  /** parse numbers robustly from messy Adafruit payloads like "3.9,,," */
  function parseNumeric(val) {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') return Number.isNaN(val) ? null : val;
    // if it's an object with value property (rare)
    if (typeof val === 'object') {
      if (val.value !== undefined) return parseNumeric(val.value);
      return null;
    }
    // string handling
    const s = String(val).trim();
    if (s === '') return null;

    // parseFloat handles "3.9,,," -> 3.9
    const pf = parseFloat(s);
    if (!Number.isNaN(pf)) return pf;

    // fallback: extract first numeric token via regex
    const m = s.match(/-?\d+(\.\d+)?/);
    if (m) return Number(m[0]);

    return null;
  }

  /** helper: shallow compare numeric snapshot (treat undefined/null same) */
  function snapshotEquals(a = {}, b = {}) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      const va = a[k] === undefined ? null : a[k];
      const vb = b[k] === undefined ? null : b[k];
      // both nullish
      if (va === null && vb === null) continue;
      // compare numbers with small tolerance if numbers
      if (typeof va === 'number' && typeof vb === 'number') {
        if (Math.abs(va - vb) > 1e-9) return false;
        continue;
      }
      // strict equality otherwise
      if (va !== vb) return false;
    }
    return true;
  }

  client.on('message', async (topic, message) => {
    try {
      const raw = message.toString();
      const parts = topic.split('/');
      let feedKey = parts[parts.length - 1];
      const lastSeg = String(feedKey).toLowerCase();
      if (lastSeg === 'json' || lastSeg === 'csv') feedKey = parts[parts.length - 2];

      // parse JSON payload if present
      let parsed = null;
      try { parsed = JSON.parse(raw); } catch (e) { /* not JSON */ }

      if (parsed && (parsed.key || parsed.feed_key || (parsed.data && parsed.data.key))) {
        feedKey = parsed.key || parsed.feed_key || parsed.data.key;
      }

      // determine rawValue from JSON or plain payload
      let rawValue;
      if (parsed && parsed.data && parsed.data.value !== undefined) rawValue = parsed.data.value;
      else if (parsed && parsed.value !== undefined) rawValue = parsed.value;
      else rawValue = raw;

      // robust numeric parsing
      const numericValue = parseNumeric(rawValue);

      const timestamp = Date.now();
      console.log('[MQTT] message received', { topic, feedKey: String(feedKey), raw, numericValue, timestamp });

      feedKey = String(feedKey);

      // load devices (small scale)
      const allDevices = await Device.find({});
      // console.log(`[MQTT] loaded ${allDevices.length} devices`);

      for (const device of allDevices) {
        // normalize device.feeds
        let feedsObj = device.feeds;
        if (feedsObj && typeof feedsObj.toObject === 'function') {
          try { feedsObj = feedsObj.toObject(); } catch (e) {}
        }
        if (feedsObj instanceof Map) {
          const tmp = {}; for (const [k, v] of feedsObj.entries()) tmp[k] = v; feedsObj = tmp;
        }

        let feedKeys = [], feedVals = [];
        if (feedsObj && typeof feedsObj === 'object' && !Array.isArray(feedsObj)) {
          feedKeys = Object.keys(feedsObj).map(String);
          feedVals = Object.values(feedsObj).map(String);
        } else if (Array.isArray(feedsObj)) {
          feedVals = feedsObj.map(String);
        } else if (typeof feedsObj === 'string') {
          feedVals = [String(feedsObj)];
        }

        const matches =
          feedKeys.includes(feedKey) ||
          feedVals.includes(feedKey) ||
          (/^\d+$/.test(feedKey) && (feedVals.includes(feedKey) || feedKeys.includes(feedKey)));

        if (!matches) continue;

        // map feedKey to sensor field and create typed value
        const field = feedToField(feedKey); // e.g. 'sonarDepth'

        // --- atomic partial update to avoid race conditions ---
        // Build atomic $set object so we only update the single field + timestamp
        const setObj = {};
        setObj[`lastReading.${field}`] = numericValue;
        setObj['lastReading.timestamp'] = timestamp;

        let refreshed = null;
        try {
          // findOneAndUpdate returns the updated document so we get the merged snapshot
          refreshed = await Device.findOneAndUpdate(
            { _id: device._id },
            { $set: setObj },
            { new: true, returnDocument: 'after' } // return the new doc (Mongoose >=6 semantics)
          );
        } catch (saveErr) {
          console.error('[MQTT] device lastReading atomic update err', saveErr);
          // fallback: attempt updateOne then fetch
          try {
            await Device.updateOne({ _id: device._id }, { $set: setObj });
            refreshed = await Device.findById(device._id);
          } catch (e2) {
            console.error('[MQTT] fallback update err', e2);
          }
        }

        // use the refreshed merged lastReading for emission; if unavailable, build snapshot conservatively
        const snapshot = (refreshed && refreshed.lastReading)
          ? refreshed.lastReading
          : ({ ...(device.lastReading || {}), [field]: numericValue, timestamp });

        const token = device.token;
        const room = `user_${String(device.userId)}`;

        // If snapshot equals lastEmitted, skip (dedupe)
        const prevEmitted = lastEmitted.get(token);
        if (prevEmitted && snapshotEquals(prevEmitted, snapshot)) {
          // nothing changed meaningfully; skip scheduling
          // but still update lastEmitted timestamp if needed
          // console.log('[MQTT] snapshot unchanged — skipping emit for', token);
          continue;
        }

        // If snapshot has >= 2 non-null numeric fields (useful partial), emit immediately
        const numericFieldsCount = ['sonarDepth','pressure','latitude','longitude']
          .reduce((c, k) => (snapshot[k] !== null && snapshot[k] !== undefined ? c+1 : c), 0);

        if (numericFieldsCount >= 2 || numericFieldsCount === 4) {
          // emit immediately and update lastEmitted
          io.to(room).emit('measurement', { deviceToken: token, reading: snapshot });
          lastEmitted.set(token, snapshot);
          console.log(`[MQTT] emitted immediate measurement for device ${token}`, snapshot);
          // clear any pending debounce timers
          const p = pendingEmits.get(token);
          if (p) { clearTimeout(p.timer); pendingEmits.delete(token); }
          continue;
        }

        // Else schedule a short debounce (aggregate more fields)
        const existing = pendingEmits.get(token);
        if (existing) {
          clearTimeout(existing.timer);
        }

        const timer = setTimeout(() => {
          // re-fetch latest from DB just before emitting (optional)
          (async () => {
            try {
              const refreshed = await Device.findOne({ _id: device._id });
              const snap = (refreshed && refreshed.lastReading) ? refreshed.lastReading : snapshot;
              io.to(room).emit('measurement', { deviceToken: token, reading: snap });
              lastEmitted.set(token, snap);
              console.log(`[MQTT] emitted debounced measurement to room ${room} for device ${token}`, snap);
            } catch (err) {
              console.error('[MQTT] debounce emit err', err);
            } finally {
              pendingEmits.delete(token);
            }
          })();
        }, 100); // 100 ms debounce window (fast)

        pendingEmits.set(token, { timer, snapshot });
      } // devices loop
    } catch (err) {
      console.error('mqtt message processing err', err);
    }
  });

  return client;
}
