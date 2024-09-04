// js/

import { parseArgs } from "util"; // Importa la función parseArgs para analizar los argumentos de la línea de comandos
import { buildEthernetFrame, buildIpv4Packet, buildTcpPacket } from "./tcp.ts"; // Importa las funciones para construir los diferentes paquetes de red
import { alterPacket, runRandomly } from "./lib/random.ts"; // Importa funciones para alterar paquetes y ejecutar acciones aleatorias

const defaultServerPort = 8080;
const defaultClientPort = 3000;

let fileName: string;
let serverPort: number;
let clientPort: number;

try {
    // Analiza los argumentos de la línea de comandos para obtener el nombre del archivo y los puertos
    const { values } = parseArgs({
        args: Bun.argv, // Obtiene los argumentos pasados al comando
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

    // Asigna los valores de los argumentos a las variables, utilizando valores predeterminados si no se especifican
    fileName = values.file as string;
    serverPort =
        values.port === undefined ? defaultServerPort : parseInt(values.port);
    clientPort =
        values.clientPort === undefined
            ? defaultClientPort
            : parseInt(values.clientPort);
} catch (error) {
    // Muestra un mensaje de error y termina el proceso si ocurre un error al analizar los argumentos
    console.error("Error parsing arguments", error);
    console.info("Usage: bun run client.ts --file <file>");
    process.exit(1);
}

// Lee el contenido del archivo especificado y lo convierte a texto
const fileHandler = Bun.file(fileName);
const fileContent = await fileHandler.text();
const textEncoder = new TextEncoder();
const encodedString = textEncoder.encode(fileContent); // Codifica el contenido del archivo como bytes
const length = encodedString.length; // Obtiene la longitud del contenido en bytes

const MAX_BYTES_PER_PACKET = 1500; // Define el tamaño máximo de bytes por paquete

// Divide el contenido del archivo en grupos de bytes, cada uno con un tamaño máximo de 1500 bytes
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

    rawBytesGroups.push(groupOfBytes); // Agrega cada grupo de bytes al array rawBytesGroups
}

const packetsIndices = new Set(); // Crea un Set para almacenar los índices de los paquetes generados

// Mapea cada grupo de bytes en un paquete TCP completo
const packets = rawBytesGroups.map(async (payload, index) => {
    const ethernetFrame = await buildEthernetFrame(payload);
    const ipv4Packet = await buildIpv4Packet(ethernetFrame);
    const tcpPacket = buildTcpPacket(
        ipv4Packet,
        clientPort,
        serverPort,
        index, // Usa el índice como el número de secuencia del paquete TCP
        0 // Flags TCP
    );

    packetsIndices.add(index); // Agrega el índice del paquete al Set de índices

    return tcpPacket; // Retorna el paquete TCP generado
});

const builtPackets = await Promise.all(packets); // Espera a que todos los paquetes se construyan

let remainingPacketsToSend = builtPackets.length; // Inicializa el contador de paquetes restantes por enviar

// Función auxiliar para obtener una clave aleatoria de una colección
const getRandomKey = (collection: any) => {
    let index = Math.floor(Math.random() * collection.size);
    let counter = 0;
    for (let key of collection.keys()) {
        if (counter++ === index) {
            return key;
        }
    }
};

// Inicializa contadores para los paquetes enviados y recibidos
let sentPackages = 0;
let receivedPackages = 0;

await Bun.connect({
    hostname: "localhost", // Define el hostname del servidor al que conectarse
    port: serverPort, // Usa el puerto del servidor definido previamente
    socket: {
        data(socket, data) {
            const message = data.toString();
            const messageParts = message.split("/");

            if (messageParts.includes("received")) {
                const index = parseInt(messageParts[1]); // Obtiene el índice del paquete recibido
                packetsIndices.delete(index); // Elimina el índice del Set de paquetes pendientes
                remainingPacketsToSend -= 1; // Reduce el contador de paquetes restantes
                receivedPackages += 1; // Incrementa el contador de paquetes recibidos
            }

            if (remainingPacketsToSend === 0) {
                socket.end(); // Cierra la conexión si no quedan más paquetes por enviar
            }

            // Selecciona un índice de paquete aleatorio y obtiene el paquete correspondiente
            const randomIndex = getRandomKey(packetsIndices);
            let packet = builtPackets[randomIndex];

            if (runRandomly(10)) {
                // Posibilidad aleatoria de alterar el paquete
                packet = alterPacket(packet);
            }
            const binPacket = Buffer.from(JSON.stringify(packet)); // Convierte el paquete a formato binario

            socket.write(binPacket); // Envía el paquete a través del socket
            sentPackages += 1; // Incrementa el contador de paquetes enviados
        },

        close(socket) {
            console.log(
                `Sent packages: ${sentPackages}\nReceived packages: ${receivedPackages}\nPercentage packets lost/damaged: ${(
                    100 -
                    (receivedPackages / sentPackages) * 100
                ).toFixed(2)} %`
            ); // Muestra un resumen de los paquetes enviados, recibidos y el porcentaje de pérdida o daño
        },
    },
});
