// js/

import { parseArgs } from "util";
import type { tcpPacket } from "./tcp.ts";
import type { byte } from "./lib/bytes.ts";
import { runRandomly } from "./lib/random.ts";
import { checkPacket } from "./lib/checksum.ts";
import { mkdir } from "node:fs/promises";

const defaultPort = 8080;
let port: number;

try {
    const { values } = parseArgs({
        args: Bun.argv,
        options: {
            port: {
                type: "string",
            },
        },
        strict: true,
        allowPositionals: true,
    });
    port = values.port === undefined ? defaultPort : parseInt(values.port);
} catch (error) {
    console.error("Error parsing arguments", error);
    console.info("Usage: bun run server.ts --port <port_number>");
    process.exit(1);
}

let packets: tcpPacket[] = [];

const server = Bun.listen({
    hostname: "localhost",
    port,
    socket: {
        data(socket, data) {
            if (runRandomly(3)) {
                socket.write("send");
                return;
            }

            const packet = JSON.parse(data.toString()) as tcpPacket;
            const passedChecksums = checkPacket(packet);

            if (passedChecksums) {
                const id = packet.tcpHeader.sequenceNumber;
                packets.push(packet);
                socket.write(`received/${id}`);
            } else {
                socket.write("send");
            }
        },
        open(socket) {
            packets = [];
            socket.write("send");
        },
        async close(socket) {
            const sortedPackets = packets.sort(
                (packetA: tcpPacket, packetB: tcpPacket) =>
                    packetA.tcpHeader.sequenceNumber -
                    packetB.tcpHeader.sequenceNumber
            );

            await mkdir("store", { recursive: true });
            const file = Bun.file("./store/file.txt");
            const writer = file.writer();
            const decoder = new TextDecoder();
            for (const packet of sortedPackets) {
                const data = packet.ipv4Packet.ethernetFrame.payload;
                const byte: byte = new Uint8Array(Object.values(data));
                const text = decoder.decode(byte);
                writer.write(text);
                writer.flush();
            }
            writer.end();
        },
    },
});

console.log(`Socket listening in ${server.port}`);
