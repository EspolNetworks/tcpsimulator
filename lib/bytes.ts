// js/lib

// Definición del tipo `byte` como un `Uint8Array`, donde cada número debe tener 8 bits.
export type byte = Uint8Array;

// Convierte una dirección MAC en una representación de bytes (`Uint8Array`).
export const macToBytes = (mac: MAC): byte => {
    // Divide la dirección MAC en sus componentes y convierte cada componente de hexadecimal a decimal.
    return new Uint8Array(mac.split(":").map((byte) => parseInt(byte, 16)));
};

// Convierte una dirección IP en una representación de bytes (`Uint8Array`).
export const ipToBytes = (ip: IP): byte => {
    // Divide la dirección IP en sus componentes y convierte cada componente de decimal a número entero.
    return new Uint8Array(ip.split(".").map((byte) => parseInt(byte)));
};

// Convierte un número en una representación de bytes (`Uint8Array`).
export const numberToBytes = (num: number, numberOfBytes: number): byte => {
    // Crea un array de `Uint8Array` con el tamaño especificado por `numberOfBytes`.
    const arr = new Uint8Array(numberOfBytes);

    // Llena el array con los bytes del número, empezando desde el byte menos significativo.
    for (let i = numberOfBytes - 1; i >= 0; i--) {
        // Almacena el byte menos significativo de `num`.
        arr[i] = num % 256;
        // Desplaza el número a la derecha para procesar el siguiente byte.
        num = Math.floor(num / 256);
    }

    return arr;
};

// Combina múltiples `Uint8Array` en un solo `Uint8Array`.
export const toSingleArrayOfBytes = (...bytes: byte[]): byte => {
    // Calcula la longitud total del array combinado.
    let totalLength = 0;
    for (const subArray of bytes) {
        totalLength += subArray.length;
    }

    // Crea un `Uint8Array` con la longitud total.
    const array = new Uint8Array(totalLength);

    // Copia los datos de cada sub-array al array combinado.
    let i = 0;
    for (const subArray of bytes) {
        let j = 0;
        for (const element of subArray) {
            // Copia cada elemento del sub-array al array combinado.
            array[i] = element;
            i++;
            j++;
        }
    }

    return array;
};
