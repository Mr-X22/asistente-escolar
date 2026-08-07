/*
 * Capa de almacenamiento de Tu Asistente Escolar.
 *
 * Modo preferido: File System Access API -> los datos viven en un archivo
 * datos.json real, elegido por el usuario, igual que en LiteWorship.
 * El handle del archivo se guarda en IndexedDB para no tener que
 * volver a elegirlo cada vez que se abre la app.
 *
 * Modo alterno: localStorage, para navegadores sin soporte
 * (Firefox, Safari, la mayoría de móviles).
 *
 * En ambos modos la app trabaja contra el mismo objeto en memoria,
 * así que el resto del código no necesita saber cuál modo está activo.
 */

const AEStorage = (() => {

    const SOPORTA_FS = "showSaveFilePicker" in window;
    const DB_NOMBRE = "ae-db";
    const DB_STORE = "handles";
    const DB_KEY = "archivoDatos";

    let modo = null; // "archivo" | "local"
    let fileHandle = null;
    let datosEnMemoria = { materias: [], calificaciones: [] };

    // ---------- IndexedDB (solo para guardar el handle del archivo) ----------

    function abrirDB(){
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NOMBRE, 1);
            req.onupgradeneeded = () => {
                req.result.createObjectStore(DB_STORE);
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function guardarHandleEnDB(handle){
        const db = await abrirDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(DB_STORE, "readwrite");
            tx.objectStore(DB_STORE).put(handle, DB_KEY);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async function leerHandleDeDB(){
        const db = await abrirDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(DB_STORE, "readonly");
            const req = tx.objectStore(DB_STORE).get(DB_KEY);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    }

    // ---------- Lectura / escritura del archivo ----------

    async function tienePermiso(handle, modoPermiso = "readwrite"){
        const opciones = { mode: modoPermiso };
        if((await handle.queryPermission(opciones)) === "granted") return true;
        if((await handle.requestPermission(opciones)) === "granted") return true;
        return false;
    }

    async function leerArchivo(handle){
        const archivo = await handle.getFile();
        const texto = await archivo.text();
        if(!texto.trim()) return { materias: [], calificaciones: [] };
        try{
            return JSON.parse(texto);
        }catch(e){
            console.error("El archivo de datos está corrupto:", e);
            return { materias: [], calificaciones: [] };
        }
    }

    async function escribirArchivo(handle, datos){
        const escribible = await handle.createWritable();
        await escribible.write(JSON.stringify(datos, null, 2));
        await escribible.close();
    }

    // ---------- API pública ----------

    // Intenta reconectar con un archivo ya elegido antes. No pide nada al
    // usuario si no hay permiso persistente; en ese caso queda en modo local
    // hasta que el usuario conecte un archivo explícitamente.
    async function iniciar(){

        if(SOPORTA_FS){
            try{
                const handleGuardado = await leerHandleDeDB();
                if(handleGuardado && await tienePermiso(handleGuardado, "readwrite")){
                    fileHandle = handleGuardado;
                    datosEnMemoria = await leerArchivo(fileHandle);
                    modo = "archivo";
                    return { modo, conectado: true };
                }
            }catch(e){
                console.warn("No se pudo reconectar el archivo de datos automáticamente:", e);
            }
        }

        // Sin archivo conectado todavía: cae a localStorage mientras tanto
        datosEnMemoria = JSON.parse(localStorage.getItem("ae_datos")) || { materias: [], calificaciones: [] };
        modo = "local";
        return { modo, conectado: false };

    }

    // El usuario elige o crea un datos.json. Si ya existía uno con datos
    // en localStorage y el archivo está vacío, se ofrece migrar.
    async function conectarArchivoExistente(){
        const [handle] = await window.showOpenFilePicker({
            types: [{ description: "Datos de Asistente Escolar", accept: { "application/json": [".json"] } }],
            excludeAcceptAllOption: false
        });
        return _activarHandle(handle);
    }

    async function crearArchivoNuevo(){
        const handle = await window.showSaveFilePicker({
            suggestedName: "datos-asistente-escolar.json",
            types: [{ description: "Datos de Asistente Escolar", accept: { "application/json": [".json"] } }]
        });
        return _activarHandle(handle, true);
    }

    async function _activarHandle(handle, esNuevo = false){

        if(!(await tienePermiso(handle, "readwrite"))){
            throw new Error("Permiso de lectura/escritura denegado.");
        }

        fileHandle = handle;
        await guardarHandleEnDB(handle);

        if(esNuevo){
            // Archivo recién creado: si había datos locales, los migramos
            const local = JSON.parse(localStorage.getItem("ae_datos"));
            datosEnMemoria = local || { materias: [], calificaciones: [] };
            await escribirArchivo(fileHandle, datosEnMemoria);
        }else{
            datosEnMemoria = await leerArchivo(fileHandle);
        }

        modo = "archivo";
        return { modo, conectado: true };

    }

    function obtenerDatos(){
        return datosEnMemoria;
    }

    async function guardarDatos(datos){

        datosEnMemoria = datos;

        if(modo === "archivo" && fileHandle){
            await escribirArchivo(fileHandle, datos);
        }else{
            localStorage.setItem("ae_datos", JSON.stringify(datos));
        }

    }

    function exportarComoDescarga(){
        const blob = new Blob([JSON.stringify(datosEnMemoria, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "datos-asistente-escolar.json";
        a.click();
        URL.revokeObjectURL(url);
    }

    async function importarDesdeArchivo(file){
        const texto = await file.text();
        const datos = JSON.parse(texto);
        await guardarDatos(datos);
        return datos;
    }

    return {
        soportaFS: SOPORTA_FS,
        iniciar,
        conectarArchivoExistente,
        crearArchivoNuevo,
        obtenerDatos,
        guardarDatos,
        exportarComoDescarga,
        importarDesdeArchivo,
        get modo(){ return modo; }
    };

})();
