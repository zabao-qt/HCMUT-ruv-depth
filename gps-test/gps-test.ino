#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <TinyGPSPlus.h>

// ----------------- GPS Config -----------------
#define GPS_RX 44  // ESP32 receives GPS data on GPIO44 (TX from GPS)
#define GPS_TX 43  // ESP32 transmits to GPS on GPIO43 (RX on GPS, rarely used)
HardwareSerial GPS_Serial(0); // Use UART0, mapped to custom pins

TinyGPSPlus gps;

// ----------------- OLED Config -----------------
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1   // No reset pin
#define I2C_SDA 8
#define I2C_SCL 9

TwoWire I2C_BUS = TwoWire(0);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &I2C_BUS, OLED_RESET);

// ----------------- Setup -----------------
void setup() {
  Serial.begin(115200);
  Serial.println("ESP32-S3 GPS + OLED Test");

  // GPS UART
  GPS_Serial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);

  // OLED Init
  I2C_BUS.begin(I2C_SDA, I2C_SCL, 400000); // SDA, SCL, freq
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) { 
    Serial.println("SSD1315/SSD1306 allocation failed");
    for (;;) ;
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(0, 0);
  display.println("Waiting for GPS...");
  display.display();
}

// ----------------- Loop -----------------
void loop() {
  // Read GPS data
  while (GPS_Serial.available() > 0) {
    gps.encode(GPS_Serial.read());
  }

  // Update OLED
  display.clearDisplay();
  display.setCursor(0, 0);

  if (gps.location.isValid()) {
    display.print("Lat: ");
    display.println(gps.location.lat(), 6);

    display.print("Lng: ");
    display.println(gps.location.lng(), 6);
  } else {
    display.println("Loc: --");
  }

  if (gps.date.isValid() && gps.time.isValid()) {
    display.print("Date: ");
    display.print(gps.date.day());
    display.print("/");
    display.print(gps.date.month());
    display.print("/");
    display.println(gps.date.year());

    display.print("Time: ");
    display.print(gps.time.hour());
    display.print(":");
    display.print(gps.time.minute());
    display.print(":");
    display.println(gps.time.second());
  } else {
    display.println("Time: --");
  }

  if (gps.satellites.isValid()) {
    display.print("Sats: ");
    display.println(gps.satellites.value());
  } else {
    display.println("Sats: --");
  }

  display.display();

  delay(1000); // update every second
}