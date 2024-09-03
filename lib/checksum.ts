// js/lib

import type { tcpPacket } from "../tcp"; // Importa el tipo tcpPacket desde un archivo externo
import { numberToBytes, toSingleArrayOfBytes, type byte } from "./bytes"; // Importa funciones para manipular bytes y define el tipo `byte`

export const calculateChecksum = (bytes: byte): number => {
    let sum = 0;

    for (let i = 0; i < bytes.length; i += 2) {
        let word = bytes[i] << 8; // Toma un byte y lo desplaza 8 bits a la izquierda
        if (i + 1 < bytes.length) {
            word += bytes[i + 1]; // Si hay un segundo byte, lo agrega al `word`
        } else {
            word += 0x00; // Si no hay un segundo byte, agrega padding
        }

        sum += word;

        if (sum > 0xffff) {
            sum = (sum & 0xffff) + 1; // Si la suma supera 16 bits, agrega el desbordamiento al sumador
        }
    }

    sum = ~sum; // Complemento a uno de la suma

    return sum & 0xffff; // Retorna solo los últimos 16 bits
};


export const checkPacket = (packet: tcpPacket): boolean => {
    const tcpHeader = packet.tcpHeader; // Obtiene el encabezado TCP del paquete
    const ipv4Packet = packet.ipv4Packet; // Obtiene el paquete IPv4
    const tcpChecksum = packet.tcpHeader.checksum; // Almacena el checksum del encabezado TCP
    packet.tcpHeader.checksum = 0; // Inicializa el checksum a 0 para el cálculo

    // Combina los valores del encabezado TCP y el paquete IPv4 en un solo array de bytes
    const bin = toSingleArrayOfBytes(
        numberToBytes(tcpHeader.sourcePort, 2), // Puerto de origen (2 bytes)
        numberToBytes(tcpHeader.destinationPort, 2), // Puerto de destino (2 bytes)
        numberToBytes(tcpHeader.sequenceNumber, 1), // Número de secuencia (1 byte)
        numberToBytes(tcpHeader.flags, 1), // Bandera (1 byte)
        numberToBytes(tcpHeader.acknowledgmentNumber, 1), // Número de reconocimiento (1 byte)
        numberToBytes(tcpHeader.dataOffset, 1), // Desplazamiento de datos (1 byte)
        numberToBytes(tcpHeader.reserved, 1), // Bits reservados (1 byte)
        numberToBytes(tcpHeader.windowSize, 2), // Tamaño de la ventana (2 bytes)
        numberToBytes(tcpHeader.checksum, 1), // Checksum (1 byte, que temporalmente es 0)
        numberToBytes(tcpHeader.urgentPointer, 1), // Puntero urgente (1 byte)
        new Uint8Array(Buffer.from(JSON.stringify(ipv4Packet))) // Conversión del paquete IPv4 a bytes
    );

    const checksum = calculateChecksum(bin); // Calcula el checksum del array de bytes

    return tcpChecksum === checksum; // Compara el checksum calculado con el original
};
