// js/lib

import type { IP, MAC } from "./internet.ts";

export type byte = Uint8Array; // each number should be 8 bits

export const macToBytes = (mac: MAC): byte => {
    return new Uint8Array(mac.split(":").map((byte) => parseInt(byte, 16)));
};

export const ipToBytes = (ip: IP): byte => {
    return new Uint8Array(ip.split(".").map((byte) => parseInt(byte)));
};

export const numberToBytes = (num: number, numberOfBytes: number): byte => {
    const arr = new Uint8Array(numberOfBytes);

    for (let i = numberOfBytes - 1; i >= 0; i--) {
        arr[i] = num % 256;
        num = Math.floor(num / 256);
    }

    return arr;
};

export const toSingleArrayOfBytes = (...bytes: byte[]): byte => {
    let totalLength = 0;
    for (const subArray of bytes) {
        totalLength += subArray.length;
    }
    const array = new Uint8Array(totalLength);

    let i = 0;
    for (const subArray of bytes) {
        let j = 0;
        for (const element of subArray) {
            array[i] = element;
            i++;
            j++;
        }
    }

    return array;
};
