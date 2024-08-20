// js/lib

import type { tcpPacket } from "../tcp";
import { numberToBytes, toSingleArrayOfBytes, type byte } from "./bytes";

export const calculateChecksum = (bytes: byte): number => {
    let sum = 0;

    for (let i = 0; i < bytes.length; i += 2) {
        let word = bytes[i] << 8;
        if (i + 1 < bytes.length) {
            word += bytes[i + 1];
        } else {
            word += 0x00;
        }

        sum += word;

        if (sum > 0xffff) {
            sum = (sum & 0xffff) + 1;
        }
    }

    sum = ~sum;

    return sum & 0xffff;
};

export const checkPacket = (packet: tcpPacket): boolean => {
    const tcpHeader = packet.tcpHeader;
    const ipv4Packet = packet.ipv4Packet;
    const tcpChecksum = packet.tcpHeader.checksum;
    packet.tcpHeader.checksum = 0;

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

    return tcpChecksum === checksum;
};
