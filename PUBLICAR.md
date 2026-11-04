# Publicar La Junta

## Estado

- Codigo: https://github.com/camicaicedof/la-junta-proyecto3
- Aplicacion publicada: https://la-junta-proyecto3.vercel.app

La interfaz esta publicada como vista previa. Para operar los circulos desde cualquier equipo falta financiar la billetera de pruebas y desplegar los contratos en Sepolia. La publicacion inicial se hizo con la herramienta de Vercel; la conexion para despliegues automaticos desde GitHub sigue pendiente de acceso de Vercel al repositorio.

## GitHub

Subir los archivos fuente y la documentacion. `.gitignore` excluye dependencias, cache, claves privadas y direcciones de la red local. No subir `.env`.

## Sepolia

Completar `.env` en tu computador usando `.env.example` como referencia. Usar una cuenta exclusiva de pruebas con ETH de Sepolia; no compartir su clave en el chat.

Como alternativa, `npm run setup:sepolia` crea una billetera exclusiva de pruebas en `.env` si no existe una clave configurada y muestra solamente su direccion publica y saldo. Ejecutarlo otra vez conserva la billetera existente. Enviar a esa direccion unicamente ETH de Sepolia, obtenido de un faucet; no enviar dinero real.

```powershell
.\proyecto.ps1 deploy:sepolia
```

El script genera `frontend/public/sepolia.json`, con direcciones y ABI publicos. Incluir **ese archivo** en el repositorio. No contiene claves privadas. `frontend/public/deployment.json` sigue siendo configuracion local ignorada por Git.

## Vercel

Importar el repositorio y dejar el directorio raiz del proyecto. `vercel.json` define:

- Instalacion: `npm install --include=dev`.
- Construccion: `npm run build:cloud`.
- Directorio publicado: `frontend/dist`.

No es necesario configurar `PRIVATE_KEY` en Vercel: la interfaz utiliza MetaMask del participante. El despliegue de contratos se hace por separado desde el computador.

Si todavia no existe `frontend/public/sepolia.json`, se puede publicar una vista previa: muestra que falta el despliegue y mantiene las operaciones deshabilitadas. La construccion en nube elimina cualquier configuracion de la red local del resultado publicado. Tras subir el archivo de Sepolia y volver a desplegar, se habilita la aplicacion.

## Comprobacion antes de compartir

1. Abrir el enlace de Vercel en un navegador con MetaMask.
2. Verificar que indica Sepolia, chain ID 11155111.
3. Conectar una cuenta con ETH de Sepolia y solicitar mUSD ficticio.
4. Crear y probar un circulo con varias cuentas de prueba.

La liquidacion manual funciona desde la interfaz. La ejecucion periodica del keeper necesita un servicio programado adicional.

Referencia: [configuracion de proyectos en Vercel](https://vercel.com/docs/project-configuration).
