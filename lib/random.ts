// js/lib

import type { tcpPacket } from "../tcp";

export const runRandomly = (n: number): boolean => {
    const randomNumber = Math.floor(Math.random() * n);

    return randomNumber === 1;
};

export const alterPacket = (packet: tcpPacket): tcpPacket => {
    const copy = JSON.parse(JSON.stringify(packet)) as tcpPacket;
    const data = copy.ipv4Packet.ethernetFrame.payload;

    Object.entries(data).forEach(([key, value]) => {
        const shift = Math.ceil(Math.random() * 8);
        const newNumber = value >>> shift;
        data[key] = newNumber;
    });

    return copy;
};
