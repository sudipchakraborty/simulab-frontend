// Requires Adafruit NeoPixel: install from the Code Editor component library menu.
// Circuit: use "Open component laboratory" in the Hardware library.
#include <Wire.h>
#include <Adafruit_NeoPixel.h>
Adafruit_NeoPixel rgb(1, 3, NEO_GRB + NEO_KHZ800);
void setup() {
  Serial.begin(9600); Wire.begin(); rgb.begin();
  const int outputs[] = {4, 5, 6, 7, 8, 9, 10, 12};
  for (int p : outputs) pinMode(p, OUTPUT);
  pinMode(2, INPUT_PULLUP); pinMode(A0, INPUT);
  digitalWrite(4, HIGH); digitalWrite(5, LOW); analogWrite(6, 128);
  digitalWrite(8, LOW); digitalWrite(9, LOW); digitalWrite(10, LOW); digitalWrite(12, LOW);
}
void loop() {
  static bool phase = false; phase = !phase;
  digitalWrite(7, phase); // Active-low module: COM grounds NO when energized.
  rgb.setPixelColor(0, phase ? rgb.Color(255,0,0) : rgb.Color(0,0,255)); rgb.show();
  Wire.beginTransmission(0x68); Wire.write(0); Wire.endTransmission();
  Wire.requestFrom(0x68, 3);
  Serial.print("RTC BCD sec/min/hour:");
  while (Wire.available()) { Serial.print(' '); Serial.print(Wire.read(), HEX); }
  Serial.print(" relay input="); Serial.print(digitalRead(2));
  Serial.print(" mux digital input="); Serial.println(digitalRead(A0));
  delay(500);
}
