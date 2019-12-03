#include <ESP8266WiFi.h>
#include <String.h>
#include <SPI.h>
#include "MFRC522.h"

#define RST_PIN D4
#define SS_PIN D3
const char* ssid = "Honor 8 Pro_0ECB";    // Enter SSID here
const char* password = "asutosh1289";  // Enter Password here

const char* server = " 192.168.43.206";
int Sample;

WiFiClient client;

//String for POSTing RFID seriel
String s1 = "";

//#define RST_PIN D4
//#define SS_PIN D3

MFRC522 rfid(SS_PIN, RST_PIN); // Instance of the class
 
//MFRC522::MIFARE_Key key; 
 
// Init array that will store new NUID 
byte nuidPICC[4];


void setup() {
  Serial.begin(115200);    // Initialize serial communications
  delay(250);
  Serial.println(F("Booting...."));
  
  SPI.begin();           // Init SPI bus
  rfid.PCD_Init();    // Init MFRC522
  
  WiFi.begin(ssid, password);
  
  int retries = 0;
  while ((WiFi.status() != WL_CONNECTED) && (retries < 10)) {
    retries++;
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("WiFi connected"));
  }
  
  Serial.println(F("Ready!"));
  Serial.println(F("======================================================")); 
  Serial.println(F("Scan for Card and print UID:"));
}

void loop() { 
  // Look for new cards
  if ( ! rfid.PICC_IsNewCardPresent()) {
    delay(50);
    return;
  }
  // Select one of the cards
  if ( ! rfid.PICC_ReadCardSerial()) {
    delay(50);
    return;
  }
  // Show some details of the PICC (that is: the tag/card)
  Serial.print(F("Card UID:"));
  Serial.println();
   Serial.print(F("PICC type: "));
  MFRC522::PICC_Type piccType = rfid.PICC_GetType(rfid.uid.sak);
  Serial.println(rfid.PICC_GetTypeName(piccType));
 
  // Check is the PICC of Classic MIFARE type
  if (piccType != MFRC522::PICC_TYPE_MIFARE_MINI &&  
    piccType != MFRC522::PICC_TYPE_MIFARE_1K &&
    piccType != MFRC522::PICC_TYPE_MIFARE_4K) {
    Serial.println(F("Your tag is not of type MIFARE Classic."));
    //return;
  }
 
    // Store NUID into nuidPICC array
    for (byte i = 0; i < 4; i++) {
      nuidPICC[i] = rfid.uid.uidByte[i];
      s1 += String(rfid.uid.uidByte[i]);
    }
   
   Serial.println(F("The NUID tag is:"));
    Serial.print(F("In hex: "));
    printHex(rfid.uid.uidByte, rfid.uid.size);
    Serial.println();
    Serial.print(F("In dec: "));
    printDec(rfid.uid.uidByte, rfid.uid.size);
    Serial.println();
    Serial.println("string to send");
    Serial.println(s1);
    Serial.println();
    //httpRequest(s1);

  if(s1.length() > 1){
      if (client.connect(server, 3000)) {

        // send the HTTP POST request:
        client.println("POST /hardware HTTP/1.1");
        client.println("Host: 192.168.43.206");
        client.println("Connection: close");
        client.println("Content-Type: text/plain");
        client.print("Content-Length: ");
        client.print(s1.length());
        client.println();
        client.println();
        client.print(s1);
        client.println();
  
      } else {
        // if you couldn't make a connection:
        Serial.println("connection failed");
      }
      s1 = "";
    }
    else {
      Serial.println("string length is less than 0 charachters");
    };

    if (client.available()) {
      char c = client.read();
      Serial.println("client.availabl");
      Serial.println(c);
    }

    if (!client.connected()) 
    {
    Serial.println();
    Serial.println("disconnecting.");
    client.stop();
    for(;;)
      ;
    }
 
  // Halt PICC
  rfid.PICC_HaltA();
 
  // Stop encryption on PCD
  rfid.PCD_StopCrypto1();
}
 
 
/**
 * Helper routine to dump a byte array as hex values to Serial. 
 */
void printHex(byte *buffer, byte bufferSize) {
  for (byte i = 0; i < bufferSize; i++) {
    Serial.print(buffer[i] < 0x10 ? " 0" : " ");
    Serial.print(buffer[i], HEX);
  }
}
 
/**
 * Helper routine to dump a byte array as dec values to Serial.
 */
void printDec(byte *buffer, byte bufferSize) {
  for (byte i = 0; i < bufferSize; i++) {
    Serial.print(buffer[i] < 0x10 ? " 0" : " ");
    Serial.print(buffer[i], DEC);
  }
}


/*/ Helper routine to dump a byte array as hex values to Serial
void dump_byte_array(byte *buffer, byte bufferSize) {
  for (byte i = 0; i < bufferSize; i++) {
    Serial.print(buffer[i] < 0x10 ? " 0" : " ");
    Serial.print(buffer[i], HEX);
  }
}*/
