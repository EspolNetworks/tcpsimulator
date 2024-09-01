// js/

import { parseArgs } from "util";
import { buildEthernetFrame, buildIpv4Packet, buildTcpPacket } from "./tcp.ts";
import { alterPacket, runRandomly } from "./lib/random.ts";

const defaultServerPort = 8080;
const defaultClientPort = 3000;

let fileName: string;
let serverPort: number;
let clientPort: number;

try {
    const { values } = parseArgs({
        args: Bun.argv,
        options: {
            file: {
                type: "string",
            },
            port: {
                type: "string",
            },
            clientPort: {
                type: "string",
            },
        },
        strict: true,
        allowPositionals: true,
    });
    fileName = values.file as string;
    serverPort =
        values.port === undefined ? defaultServerPort : parseInt(values.port);
    clientPort =
        values.clientPort === undefined
            ? defaultClientPort
            : parseInt(values.clientPort);
} catch (error) {
    console.error("Error parsing arguments", error);
    console.info("Usage: bun run client.ts --file <file>");
    process.exit(1);
}

const fileHandler = Bun.file(fileName);
const fileContent = await fileHandler.text();
const textEncoder = new TextEncoder();
const encodedString = textEncoder.encode(fileContent);
const length = encodedString.length;

const MAX_BYTES_PER_PACKET = 1500;

const rawBytesGroups = [];

for (let i = 0; i < length; i += MAX_BYTES_PER_PACKET) {
    const remainingBytes = length - i;
    const numElements = Math.min(remainingBytes, MAX_BYTES_PER_PACKET);
    const maxIndex = numElements + i;
    const groupOfBytes = new Uint8Array(numElements);

    let k = 0;
    let startIndex = i;
    while (startIndex < maxIndex) {
        groupOfBytes[k] = encodedString[startIndex];
        startIndex++;
        k++;
    }

    rawBytesGroups.push(groupOfBytes);
}

const packetsIndices = new Set();

const packets = rawBytesGroups.map(async (payload, index) => {
    const ethernetFrame = await buildEthernetFrame(payload);
    const ipv4Packet = await buildIpv4Packet(ethernetFrame);
    const tcpPacket = buildTcpPacket(
        ipv4Packet,
        clientPort,
        serverPort,
        index,
        0
    );

    packetsIndices.add(index);

    return tcpPacket;
});

const builtPackets = await Promise.all(packets);

let remainingPacketsToSend = builtPackets.length;

const getRandomKey = (collection: any) => {
    let index = Math.floor(Math.random() * collection.size);
    let counter = 0;
    for (let key of collection.keys()) {
        if (counter++ === index) {
            return key;
        }
    }
};

// data: received/index

let sentPackages = 0;
let receivedPackages = 0;

await Bun.connect({
    hostname: "localhost",
    port: serverPort,
    socket: {
        data(socket, data) {
            const message = data.toString();
            const messageParts = message.split("/");

            if (messageParts.includes("received")) {
                const index = parseInt(messageParts[1]);
                packetsIndices.delete(index);
                remainingPacketsToSend -= 1;
                receivedPackages += 1;
            }

            if (remainingPacketsToSend === 0) {
                socket.end();
            }

            // chose randomly
            const randomIndex = getRandomKey(packetsIndices);
            let packet = builtPackets[randomIndex];

            if (runRandomly(10)) {
                packet = alterPacket(packet);
            }
            const binPacket = Buffer.from(JSON.stringify(packet));

            socket.write(binPacket);
            sentPackages += 1;
        },
        close(socket) {
            console.log(
                `Sent packages: ${sentPackages}\nReceived packages: ${receivedPackages}\nPercentage packets lost/damaged: ${(
                    (receivedPackages / sentPackages) *
                    100
                ).toFixed(2)} %`
            );
        },
    },
});
