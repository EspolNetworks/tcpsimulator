# TCP Simulator!

Este es un proyecto para la materia Redes de Datos, desarrollada por [Erick López](https://github.com/Erillope), [Braulio Rivas](https://github.com/brauliorivas), [Alejandro Sornoza](https://github.com/AlejandroSV2004), 
[Ariel Vargas](https://github.com/Ariel-Vargas) y [Angelo Zurita](https://github.com/aszurita).

## Versión en `Typescript`
La versión de typescript (javascript) del proyecto consiste de dos programas, `server` y `client`, las cuales abren un socket TCP dentro de un mismo dispositivo para comunicarse (en puertos distintos). 
Al inicio, el proceso `client` abre el archivo especificado por consola, lo separa en grupos de $1500$ bytes o menos, para posteriormente construir un paquete TCP siguiendo el modelo de capas del modelo
TCP/IP. En específico, se encapsulan primero según un paquete ethernet, paquete ipv4 y posteriormente paquete tcp. Una vez el cliente ha procesado todos los paquetes listos para enviar, se conecta al servidor,
y envía aleatoriamente todos los paquetes. Además, simula alteración en los datos, pues con cierta probabilidad, un paquete cualquiera es modificado el payload. También dada cierta probabilidad, no envía un 
paquete para simular la pérdida y obligar al servidor pedir de nuevo los paquetes. Finalmente, se cierra el socket, se ordenan los paquetes y se escribe un archivo con el contenido extraido. 

- Para el cálculo de los checksums, es necesario transformar los datos en bytes. Por ello, se convierten los datos en un `Uint8Array`, los cuales se usan para calcular los checksums.
- Se usa el algoritmo crc para el frame check sequence, y la suma a complemento uno para los checksums ipv4 y tcp, que son muy similares.

### Uso

Se usó [`bun`](https://bun.sh/docs) para el desarrollo en typescript, porque lo soporta por defecto y es más rápido que `node` o `deno`. 

1. 
```sh
bun run server.ts [--port <port_number>]
```
2.
```sh
bun run client.ts [--port <port_number>] [--clientPort <port_number>] --file <file>
```

### Limitaciones

- Funciona dentro de una sola misma máquina, aunque se podría modificar para que se ejecute en dispositivos distintos.
- No se han añadido tests al funcionamiento del checksum.

