const CACHE_NAME = "asistente-escolar-v2";

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

// Fetch: cache-first para el app shell, con fallback a red
self.addEventListener("fetch", (evento) => {

    if(evento.request.method !== "GET") return;

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
