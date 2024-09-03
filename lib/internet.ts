// js/lib

import macaddress from "macaddress";  // Importa el módulo 'macaddress' para obtener información sobre las interfaces de red

// Función que obtiene la interfaz de red con IPv4, dirección MAC y IPv6
export const getInternetInterface = async (): Promise<any> => {
    // Obtiene todas las interfaces de red del sistema de manera asíncrona
    const interfaces = await macaddress.all();

    // Busca en las interfaces la primera que tenga IPv4, dirección MAC y IPv6
    const deviceInterface: any = Object.values(interfaces).find(
        ({ ipv4, mac, ipv6 }) => {
            return ipv4 && mac && ipv6;  // Retorna true si la interfaz tiene IPv4, MAC y IPv6
        }
    );

    // Retorna la interfaz encontrada, o undefined si no se encuentra ninguna que cumpla los criterios
    return deviceInterface;
};

export type MAC = string;  
export type IP = `${number}.${number}.${number}.${number}`; 

