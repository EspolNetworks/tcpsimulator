// js/lib

import macaddress from "macaddress";

export const getInternetInterface = async (): Promise<any> => {
    const interfaces = await macaddress.all();

    const deviceInterface: any = Object.values(interfaces).find(
        ({ ipv4, mac, ipv6 }) => {
            return ipv4 && mac && ipv6;
        }
    );

    return deviceInterface;
};

export type MAC = string;
export type IP = `${number}.${number}.${number}.${number}`;
