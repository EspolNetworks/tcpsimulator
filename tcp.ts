// js/

import type { IP, MAC } from "./lib/internet.ts"; // Importa los tipos IP y MAC desde el módulo de Internet
import type { byte } from "./lib/bytes.ts"; // Importa el tipo byte desde el módulo de bytes
import { buf } from "./lib/crc.js"; // Importa la función buf desde el módulo de CRC para calcular el FCS
import {
    ipToBytes,
    macToBytes,
    numberToBytes,
    toSingleArrayOfBytes,
} from "./lib/bytes.ts"; // Importa funciones para convertir direcciones IP, MAC, y números a bytes, y para combinar varios arrays de bytes
import { getInternetInterface } from "./lib/internet.ts"; // Importa una función para obtener la interfaz de red actual
import { calculateChecksum } from "./lib/checksum.ts"; // Importa una función para calcular el checksum

// Define el tipo ethernetFrame que representa un marco Ethernet
type ethernetFrame = {
    destinationMac: MAC; // Dirección MAC de destino
    sourceMac: MAC; // Dirección MAC de origen
    type: number; // Tipo de protocolo
    payload: byte; //Datos del payload
    fcs: number; // Frame Check Sequence (FCS) para verificación de integridad
};

// Define el tipo ipv4Header que representa un encabezado IPv4
type ipv4Header = {
    version: number;  // Versión de IP (4 para IPv4)
    totalLength: number;  // Longitud total del paquete
    identification: number;  // Identificación del paquete
    timeToLive: number;  // Tiempo de vida del paquete
    headerChecksum: number;  // Checksum del encabezado
    source: IP;  // Dirección IP de origen
    destination: IP;  // Dirección IP de destino
};

// Define el tipo ipv4Packet que representa un paquete IPv4 completo
type ipv4Packet = {
    header: ipv4Header;  // Encabezado IPv4
    ethernetFrame: ethernetFrame;  // Marco Ethernet que encapsula el paquete IPv4
};

// Define el tipo tcpHeader que representa un encabezado TCP
type tcpHeader = {
    sourcePort: number;  // Puerto de origen
    destinationPort: number;  // Puerto de destino
    sequenceNumber: number;  // Número de secuencia
    acknowledgmentNumber: number;  // Número de acuse de recibo (ACK)
    dataOffset: number;  // Desplazamiento de datos (tamaño del encabezado TCP)
    reserved: number;  // Bits reservados para uso futuro
    flags: number;  // Banderas de control TCP
    windowSize: number;  // Tamaño de la ventana de recepción
    checksum: number;  // Checksum del encabezado TCP
    urgentPointer: number;  // Puntero urgente (usado cuando la bandera URG está activa)
};

// Define el tipo tcpPacket que representa un paquete TCP completo
export type tcpPacket = {
    tcpHeader: tcpHeader;  // Encabezado TCP
    ipv4Packet: ipv4Packet;  // Paquete IPv4 que encapsula el segmento TCP
};

// Función para calcular el Frame Check Sequence (FCS) para un marco Ethernet
export const calculateFCS = (frame: ethernetFrame): number => {
    // Convierte las direcciones MAC y otros campos a bytes
    const destinationMacBytes = macToBytes(frame.destinationMac);
    const sourceMacBytes = macToBytes(frame.sourceMac);
    const typeBytes = frame.type;
    const payloadBytes = frame.payload;

    // Combina todos los bytes en un solo arreglo
    const data = toSingleArrayOfBytes(
        destinationMacBytes,
        sourceMacBytes,
        numberToBytes(typeBytes, 2),
        payloadBytes
    );

    // Calcula el FCS utilizando la función buf
    const fcs = buf(data);

    return fcs;
};

// Función para construir un marco Ethernet
export const buildEthernetFrame = async (
    payload: byte
): Promise<ethernetFrame> => {
    // Obtiene la interfaz de red actual
    const internetInterface = await getInternetInterface();

    let macAddress: MAC;

    // Si no se obtiene la interfaz, usa una dirección MAC por defecto
    if (!internetInterface) {
        macAddress = "00:00:00:00:00:00";
    } else {
        macAddress = internetInterface.mac as MAC;
    }

    // Crea el marco Ethernet con la dirección MAC, tipo, payload y FCS inicial
    const ethernetFrame: ethernetFrame = {
        destinationMac: macAddress,
        sourceMac: macAddress,
        type: 0x0800,  // Tipo de protocolo (IPv4)
        payload,
        fcs: 0,  // Inicializa el FCS en 0
    };

    // Calcula el FCS real y lo asigna al marco Ethernet
    const fcs = calculateFCS(ethernetFrame);
    ethernetFrame.fcs = fcs;

    return ethernetFrame;
};

// Función para construir un paquete IPv4
export const buildIpv4Packet = async (
    ethernetFrame: ethernetFrame
): Promise<ipv4Packet> => {
    // Obtiene la dirección IP de la interfaz de red actual
    const deviceInterface = await getInternetInterface();
    const ip = deviceInterface.ipv4 as IP;

    // Crea el encabezado IPv4 con valores predeterminados
    const ipv4Header: ipv4Header = {
        version: 4,  // IPv4
        totalLength: 20,  // Longitud total del encabezado (en bytes)
        identification: 0,  // Identificación del paquete
        timeToLive: 64,  // Tiempo de vida del paquete
        headerChecksum: 0,  // Inicializa el checksum en 0
        source: ip,  // Dirección IP de origen
        destination: ip,  // Dirección IP de destino
    };

    // Convierte los campos del encabezado a bytes
    const headerBytes = toSingleArrayOfBytes(
        numberToBytes(ipv4Header.version, 1),
        numberToBytes(ipv4Header.totalLength, 2),
        numberToBytes(ipv4Header.identification, 1),
        numberToBytes(ipv4Header.timeToLive, 1),
        numberToBytes(ipv4Header.headerChecksum, 2),
        ipToBytes(ipv4Header.source),
        ipToBytes(ipv4Header.destination)
    );

    // Calcula el checksum para el encabezado IPv4
    const checksum = calculateChecksum(headerBytes);
    ipv4Header.headerChecksum = checksum;

    // Crea el paquete IPv4 con el encabezado y el marco Ethernet
    const ipv4Packet: ipv4Packet = {
        ethernetFrame,
        header: ipv4Header,
    };

    return ipv4Packet;
};

// Función para construir un paquete TCP
export const buildTcpPacket = (
    ipv4Packet: ipv4Packet,
    sourcePort: number,
    destinationPort: number,
    sequenceNumber: number,
    flags: number
): tcpPacket => {
    // Crea el encabezado TCP con los campos dados
    const tcpHeader: tcpHeader = {
        sourcePort: sourcePort,  // Puerto de origen
        destinationPort: destinationPort,  // Puerto de destino
        sequenceNumber: sequenceNumber,  // Número de secuencia
        flags: flags,  // Banderas TCP
        acknowledgmentNumber: 0,  // Número de acuse de recibo (inicialmente 0)
        dataOffset: 5,  // Desplazamiento de datos (indica el tamaño del encabezado TCP)
        reserved: 0,  // Bits reservados
        windowSize: 65535,  // Tamaño de la ventana de recepción
        checksum: 0,  // Inicializa el checksum en 0
        urgentPointer: 0,  // Puntero urgente (inicialmente 0)
    };

    // Convierte el encabezado TCP y el paquete IPv4 a bytes
    const bin = toSingleArrayOfBytes(
        numberToBytes(tcpHeader.sourcePort, 2),
        numberToBytes(tcpHeader.destinationPort, 2),
        numberToBytes(tcpHeader.sequenceNumber, 1),
        numberToBytes(tcpHeader.flags, 1),
        numberToBytes(tcpHeader.acknowledgmentNumber, 1),
        numberToBytes(tcpHeader.dataOffset, 1),
        numberToBytes(tcpHeader.reserved, 1),
        numberToBytes(tcpHeader.windowSize, 2),
        numberToBytes(tcpHeader.checksum, 1),
        numberToBytes(tcpHeader.urgentPointer, 1),
        new Uint8Array(Buffer.from(JSON.stringify(ipv4Packet)))  // Serializa el paquete IPv4 y lo convierte en bytes
    );

    // Calcula el checksum para el encabezado TCP
    const checksum = calculateChecksum(bin);
    tcpHeader.checksum = checksum;

    // Crea el paquete TCP con el encabezado TCP y el paquete IPv4
    const tcpPacket: tcpPacket = {
        tcpHeader,
        ipv4Packet,
    };

    return tcpPacket;
};
