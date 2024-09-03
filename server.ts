// js/

import { parseArgs } from "util"; // Importa la función parseArgs para analizar los argumentos de la línea de comandos
import type { tcpPacket } from "./tcp.ts"; // Importa el tipo tcpPacket desde el módulo tcp.ts
import type { byte } from "./lib/bytes.ts"; // Importa el tipo byte desde el módulo bytes.ts
import { runRandomly } from "./lib/random.ts"; // Importa una función para ejecutar una acción de manera aleatoria
import { checkPacket } from "./lib/checksum.ts"; // Importa la función checkPacket para verificar el checksum de un paquete
import { mkdir } from "node:fs/promises"; // Importa la función mkdir de fs/promises para crear directorios de manera asíncrona

const defaultPort = 8080;
let port: number;

try {
    // Analiza los argumentos de la línea de comandos para obtener el puerto
    const { values } = parseArgs({
        args: Bun.argv, // Obtiene los argumentos pasados al comando
        options: {
            port: {
                type: "string",
            },
        },
        strict: true, // Requiere que los argumentos sean estrictamente como se definen
        allowPositionals: true, // Permite argumentos posicionales
    });

    // Asigna el puerto a la variable `port`, utilizando el puerto predeterminado si no se especifica
    port = values.port === undefined ? defaultPort : parseInt(values.port);
} catch (error) {
    // Muestra un mensaje de error y termina el proceso si ocurre un error al analizar los argumentos
    console.error("Error parsing arguments", error);
    console.info("Usage: bun run server.ts --port <port_number>");
    process.exit(1);
}

// Inicializa un array para almacenar los paquetes recibidos
let packets: tcpPacket[] = [];

const server = Bun.listen({
    hostname: "localhost",
    port,
    socket: {
        data(socket, data) {
            // Simula una pérdida de paquetes al responder "send" aleatoriamente
            if (runRandomly(3)) {
                socket.write("send");
                return;
            }

            // Convierte los datos recibidos en un objeto tcpPacket
            const packet = JSON.parse(data.toString()) as tcpPacket;

            // Verifica los checksums del paquete
            const passedChecksums = checkPacket(packet);

            if (passedChecksums) {
                // Si los checksums son válidos, almacena el paquete y responde con el número de secuencia
                const id = packet.tcpHeader.sequenceNumber;
                packets.push(packet);
                socket.write(`received/${id}`);
            } else {
                // Si los checksums no son válidos, solicita el reenvío del paquete
                socket.write("send");
            }
        },
        open(socket) {
            packets = [];
            // Solicita el envío de datos al cliente
            socket.write("send");
        },

        async close(socket) {
            // Ordena los paquetes por el número de secuencia
            const sortedPackets = packets.sort(
                (packetA: tcpPacket, packetB: tcpPacket) =>
                    packetA.tcpHeader.sequenceNumber -
                    packetB.tcpHeader.sequenceNumber
            );

            // Crea el directorio "store" si no existe
            await mkdir("store", { recursive: true });

            // Crea o abre el archivo donde se almacenarán los datos recibidos
            const file = Bun.file("./store/file.txt");
            const writer = file.writer();
            const decoder = new TextDecoder(); // Crea un decodificador para convertir los bytes en texto

            // Itera sobre los paquetes ordenados y escribe el payload en el archivo
            for (const packet of sortedPackets) {
                const data = packet.ipv4Packet.ethernetFrame.payload;
                const text = decoder.decode(byte);
                writer.write(text);
                writer.flush();
            }
            writer.end();
        },
    },
});

console.log(`Socket listening in ${server.port}`);
