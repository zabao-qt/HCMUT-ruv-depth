/* 
  ESP32 -> Adafruit IO via plain MQTT (PubSubClient)
  Publishes: pressure, sonardepth, latitude, longitude
  Sends simple payloads (no lat/lon/ele metadata)
*/

#include <WiFi.h>
#include <PubSubClient.h>

// -------- WiFi Credentials --------
#define WIFI_SSID   "bruh"        // <-- replace
#define WIFI_PASS   "hahahaha"    // <-- replace

// -------- Adafruit IO / MQTT --------
#define AIO_SERVER   "io.adafruit.com"
#define AIO_PORT     1883
#define AIO_USERNAME ""               // <-- replace if needed
#define AIO_KEY      "" // <-- replace with your key

WiFiClient espClient;
PubSubClient mqtt(espClient);

// Feed topic helpers
String feedTopic(const char *feedName) {
  // e.g. "username/feeds/pressure"
  String t = String(AIO_USERNAME) + "/feeds/" + String(feedName);
  return t;
}

// ----- Feed names -----
const char* FEED_PRESSURE = "pressure";
const char* FEED_SONAR    = "sonardepth";
const char* FEED_LATITUDE = "latitude";
const char* FEED_LONGITUDE= "longitude";
const char* FEED_RSSI     = "rssi";

// Publish interval
const unsigned long PUBLISH_INTERVAL = 10000UL; // 10s

// Base location (example HCM)
double BASE_LAT = 10.762622;
double BASE_LON = 106.660172;

// Ranges & steps
const float PRESSURE_MIN = 0.0;
const float PRESSURE_MAX = 0.5;
const float PRESSURE_STEP = 0.01;

const float SONAR_MIN = 0.1;
const float SONAR_MAX = 6.0;
const float SONAR_STEP = 0.1;

const double LAT_STEP = 0.0002;
const double LON_STEP = 0.0002;

// State
float currentPressure;
float currentSonar;
double currentLat;
double currentLon;

unsigned long lastPublish = 0;

// utility clamp
template<typename T>
T clampVal(T v, T lo, T hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

float randStep(float range) {
  float r = (float)random(-1000, 1001) / 1000.0f;
  return r * range;
}

double randStepD(double range) {
  double r = (double)random(-1000, 1001) / 1000.0;
  return r * range;
}

void setupInitialValues() {
  randomSeed((unsigned long)esp_random());
  currentPressure = (PRESSURE_MIN + PRESSURE_MAX) / 2.0f;
  currentSonar    = (SONAR_MIN + SONAR_MAX) / 2.0f;
  currentLat = BASE_LAT;
  currentLon = BASE_LON;
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Not used here, but must be present for PubSubClient.
  // You can print incoming messages if you'd like.
  // Example:
  // Serial.print("MQTT RX "); Serial.println(topic);
}

void connectMQTT() {
  // Attempt to connect to the MQTT broker with AIO key as password and username as user
  while (!mqtt.connected()) {
    Serial.print("Connecting to MQTT... ");
    // client ID should be unique per device
    String clientId = "esp32-mqtt-";
    clientId += String((uint32_t)esp_random(), HEX);
    if (mqtt.connect(clientId.c_str(), AIO_USERNAME, AIO_KEY)) {
      Serial.println("connected");
      // No subscriptions required for publishing-only client, but you could subscribe here
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqtt.state());
      Serial.println(" - retrying in 10s");
      delay(10000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);
  Serial.println();
  Serial.println("MQTT publisher starting...");

  setupInitialValues();

  // Connect WiFi
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long wifiStart = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
    // simple timeout but keep trying
    if (millis() - wifiStart > 15000UL) {
      Serial.println();
      Serial.println("Still connecting to WiFi...");
      wifiStart = millis();
    }
  }
  Serial.println();
  Serial.print("WiFi connected, IP: ");
  Serial.println(WiFi.localIP());

  mqtt.setServer(AIO_SERVER, AIO_PORT);
  mqtt.setCallback(mqttCallback);

  connectMQTT();

  lastPublish = millis() - PUBLISH_INTERVAL; // publish immediately
}

void publishNumeric(const char* topic, double value, int precision = 6) {
  // Format the numeric value to a string (no JSON, plain payload)
  char buf[32];
  // Use dtostrf or snprintf
  // We'll use snprintf for floats/doubles; precision controls decimals
  snprintf(buf, sizeof(buf), "%.*f", precision, value);
  boolean ok = mqtt.publish(topic, buf);
  if (!ok) {
    Serial.printf("Publish failed: %s => %s\n", topic, buf);
  } else {
    Serial.printf("Published %s => %s\n", topic, buf);
  }
}

void publishRSSI() {
  long rssiVal;
  if (WiFi.status() == WL_CONNECTED) {
    rssiVal = WiFi.RSSI(); // typically negative dBm (e.g. -60)
  } else {
    // Not connected: use a sentinel. Change if you'd prefer 0 or another value.
    rssiVal = -127;
  }
  String tRssi = feedTopic(FEED_RSSI);
  publishNumeric(tRssi.c_str(), (double)rssiVal, 0); // 0 decimals
}

void loop() {
  if (!mqtt.connected()) {
    connectMQTT();
  }
  mqtt.loop();

  unsigned long now = millis();
  if (now - lastPublish >= PUBLISH_INTERVAL) {
    lastPublish = now;

    // Random walk updates
    currentPressure += randStep(PRESSURE_STEP);
    currentPressure = clampVal(currentPressure, PRESSURE_MIN, PRESSURE_MAX);

    currentSonar += randStep(SONAR_STEP);
    currentSonar = clampVal(currentSonar, SONAR_MIN, SONAR_MAX);

    currentLat += randStepD(LAT_STEP);
    currentLon += randStepD(LON_STEP);
    currentLat = (currentLat * 0.98) + (BASE_LAT * 0.02);
    currentLon = (currentLon * 0.98) + (BASE_LON * 0.02);

    // Build topics
    String tPressure = feedTopic(FEED_PRESSURE);
    String tSonar    = feedTopic(FEED_SONAR);
    String tLat      = feedTopic(FEED_LATITUDE);
    String tLon      = feedTopic(FEED_LONGITUDE);

    Serial.println("Publishing values via MQTT (plain payloads) ...");

    publishNumeric(tPressure.c_str(), currentPressure, 4);   // 4 decimals
    publishNumeric(tSonar.c_str(), currentSonar, 3);         // 3 decimals
    publishNumeric(tLat.c_str(), currentLat, 6);             // 6 decimals
    publishNumeric(tLon.c_str(), currentLon, 6);             // 6 decimals
    publishRSSI();
    Serial.println("--- published ---");
  }
}
