// js/lib

import type { tcpPacket } from "../tcp";  // Importa el tipo tcpPacket desde el archivo correspondiente

// Función que ejecuta una operación aleatoria con una probabilidad de 1 en n
export const runRandomly = (n: number): boolean => {
    // Genera un número aleatorio entre 0 y n-1
    const randomNumber = Math.floor(Math.random() * n);

    // Retorna true si el número aleatorio es igual a 1, lo que significa que la operación debe ejecutarse
    return randomNumber === 1;
};

// Función que altera un paquete TCP de forma aleatoria
export const alterPacket = (packet: tcpPacket): tcpPacket => {
    // Hace una copia profunda del paquete TCP recibido para evitar modificar el original
    const copy = JSON.parse(JSON.stringify(packet)) as tcpPacket;
    const data = copy.ipv4Packet.ethernetFrame.payload;  // Accede a la carga útil (payload) del paquete

    // Itera sobre cada entrada en la carga útil del paquete
    Object.entries(data).forEach(([key, value]) => {
        // Genera un número aleatorio entre 1 y 8 para determinar el número de bits de desplazamiento
        const shift = Math.ceil(Math.random() * 8);
        // Desplaza los bits de la entrada actual hacia la derecha por la cantidad generada
        const newNumber = value >>> shift;
        // Asigna el nuevo valor a la clave correspondiente en la carga útil
        data[key] = newNumber;
    });

    // Retorna el paquete TCP alterado
    return copy;
};

