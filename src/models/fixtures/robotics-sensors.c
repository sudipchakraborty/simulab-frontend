/** @file Real ATmega328P bit-banged HX711 and DHT22 protocol fixture. */
#include <avr/io.h>
#include <util/delay.h>
static void send(unsigned char c){while(!(UCSR0A&(1<<UDRE0))){}UDR0=c;}
int main(void){
 UBRR0=103;UCSR0B=(1<<TXEN0);UCSR0C=(1<<UCSZ01)|(1<<UCSZ00);
 DDRD|=(1<<PD3);PORTD&=~(1<<PD3);
 while(PIND&(1<<PD2)){_delay_ms(1);}
 unsigned long raw=0;
 for(unsigned char i=0;i<24;i++){PORTD|=(1<<PD3);_delay_us(1);raw=(raw<<1)|((PIND>>PD2)&1);PORTD&=~(1<<PD3);_delay_us(1);}
 PORTD|=(1<<PD3);_delay_us(1);PORTD&=~(1<<PD3);
 send('H');send(raw>>16);send(raw>>8);send(raw);
 DDRB|=1;PORTB&=~1;_delay_ms(2);DDRB&=~1;
 unsigned int timeout=0;
 while(PINB&1){if(++timeout==10000){send('E');for(;;){}}}
 while(!(PINB&1)){}
 while(PINB&1){}
 unsigned char bytes[5]={0};
 for(unsigned char i=0;i<40;i++){
  while(!(PINB&1)){}
  _delay_us(40);
  bytes[i/8]=(bytes[i/8]<<1)|(PINB&1);
  while(PINB&1){}
 }
 send('D');for(unsigned char i=0;i<5;i++)send(bytes[i]);
 for(;;){}
}
