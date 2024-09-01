// js/

import type { IP, MAC } from "./lib/internet.ts";
import type { byte } from "./lib/bytes.ts";
import { buf } from "./lib/crc.js";
import {
    ipToBytes,
    macToBytes,
    numberToBytes,
    toSingleArrayOfBytes,
} from "./lib/bytes.ts";
import { getInternetInterface } from "./lib/internet.ts";
import { calculateChecksum } from "./lib/checksum.ts";

type ethernetFrame = {
    destinationMac: MAC;
    sourceMac: MAC;
    type: number;
    payload: byte;
    fcs: number;
};

type ipv4Header = {
    version: number;
    totalLength: number;
    identification: number;
    timeToLive: number;
    headerChecksum: number;
    source: IP;
    destination: IP;
};

type ipv4Packet = {
    header: ipv4Header;
    ethernetFrame: ethernetFrame;
};

type tcpHeader = {
    sourcePort: number;
    destinationPort: number;
    sequenceNumber: number;
    acknowledgmentNumber: number;
    dataOffset: number;
    reserved: number;
    flags: number;
    windowSize: number;
    checksum: number;
    urgentPointer: number;
};

export type tcpPacket = {
    tcpHeader: tcpHeader;
    ipv4Packet: ipv4Packet;
};

export const calculateFCS = (frame: ethernetFrame): number => {
    const destinationMacBytes = macToBytes(frame.destinationMac);
    const sourceMacBytes = macToBytes(frame.sourceMac);
    const typeBytes = frame.type;
    const payloadBytes = frame.payload;

    const data = toSingleArrayOfBytes(
        destinationMacBytes,
        sourceMacBytes,
        numberToBytes(typeBytes, 2),
        payloadBytes
    );

    const fcs = buf(data);

    return fcs;
};

export const buildEthernetFrame = async (
    payload: byte
): Promise<ethernetFrame> => {
    const internetInterface = await getInternetInterface();

    let macAddress: MAC;

    if (!internetInterface) {
        macAddress = "00:00:00:00:00:00";
    } else {
        macAddress = internetInterface.mac as MAC;
    }

    const ethernetFrame: ethernetFrame = {
        destinationMac: macAddress,
        sourceMac: macAddress,
        type: 0x0800,
        payload,
        fcs: 0,
    };

    const fcs = calculateFCS(ethernetFrame);
    ethernetFrame.fcs = fcs;

    return ethernetFrame;
};

export const buildIpv4Packet = async (
    ethernetFrame: ethernetFrame
): Promise<ipv4Packet> => {
    const deviceInterface = await getInternetInterface();
    const ip = deviceInterface.ipv4 as IP;

    const ipv4Header: ipv4Header = {
        version: 4,
        totalLength: 20,
        identification: 0,
        timeToLive: 64,
        headerChecksum: 0,
        source: ip,
        destination: ip,
    };

    const headerBytes = toSingleArrayOfBytes(
        numberToBytes(ipv4Header.version, 1),
        numberToBytes(ipv4Header.totalLength, 2),
        numberToBytes(ipv4Header.identification, 1),
        numberToBytes(ipv4Header.timeToLive, 1),
        numberToBytes(ipv4Header.headerChecksum, 2),
        ipToBytes(ipv4Header.source),
        ipToBytes(ipv4Header.destination)
    );

    const checksum = calculateChecksum(headerBytes);
    ipv4Header.headerChecksum = checksum;

    const ipv4Packet: ipv4Packet = {
        ethernetFrame,
        header: ipv4Header,
    };

    return ipv4Packet;
};

export const buildTcpPacket = (
    ipv4Packet: ipv4Packet,
    sourcePort: number,
    destinationPort: number,
    sequenceNumber: number,
    flags: number
): tcpPacket => {
    const tcpHeader: tcpHeader = {
        sourcePort: sourcePort,
        destinationPort: destinationPort,
        sequenceNumber: sequenceNumber,
        flags: flags,
        acknowledgmentNumber: 0,
        dataOffset: 5,
        reserved: 0,
        windowSize: 65535,
        checksum: 0,
        urgentPointer: 0,
    };

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
        new Uint8Array(Buffer.from(JSON.stringify(ipv4Packet)))
    );

    const checksum = calculateChecksum(bin);
    tcpHeader.checksum = checksum;

    const tcpPacket: tcpPacket = {
        tcpHeader,
        ipv4Packet,
    };

    return tcpPacket;
};
