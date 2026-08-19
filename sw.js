const CACHE_NAME = "asistente-escolar-v15";

const ARCHIVOS_APP = [
    "./",
    "./index.html",
    "./manifest.json",
    "./storage.js",
    "./app.js",
    "./icons/icon-192.png",
    "./icons/icon-512.png"
];

// Instalar: cachea el app shell
self.addEventListener("install", (evento) => {
    evento.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_APP))
    );
    self.skipWaiting();
});

// Activar: limpia caches viejos de versiones anteriores
self.addEventListener("activate", (evento) => {
    evento.waitUntil(
        caches.keys().then((nombres) =>
            Promise.all(
                nombres
                    .filter((nombre) => nombre !== CACHE_NAME)
                    .map((nombre) => caches.delete(nombre))
            )
        )
    );
    self.clients.claim();
});

// Fetch: las peticiones de "navegación" (abrir la app en sí) usan la red
// primero para traer lo último, y si no hay internet caen directo al
// index.html guardado — sin importar si el navegador pidió "/",
// "/asistente-escolar/" o "/asistente-escolar/index.html".
// El resto de los archivos (CSS embebido, JS, íconos) usan caché primero.
self.addEventListener("fetch", (evento) => {

    if(evento.request.method !== "GET") return;

    if(evento.request.mode === "navigate"){
        evento.respondWith(
            fetch(evento.request).catch(() => caches.match("./index.html"))
        );
        return;
    }

    evento.respondWith(
        caches.match(evento.request).then((enCache) => {
            if(enCache) return enCache;

            return fetch(evento.request).then((respuestaRed) => {
                const copia = respuestaRed.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(evento.request, copia);
                });
                return respuestaRed;
            }).catch(() => enCache);
        })
    );

});
