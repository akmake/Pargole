# MyVisit (Clean Base)

This repository keeps the original `client` and `server` structure,
with a cleaned homepage focused on a single visual welcome screen.

## Run client

```bash
cd client
npm install
npm run dev
```

## Run server

```bash
cd server
npm install
npm run dev
```

## Enable DWG import

`DXF` works directly. `DWG` requires `ODA File Converter`.

Set this in `server/.env` if the converter is installed:

```env
ODA_FILE_CONVERTER_PATH=C:\Program Files\ODA\ODAFileConverter\ODAFileConverter.exe
```

If ODA is installed in the default path above, the server will pick it up automatically.
