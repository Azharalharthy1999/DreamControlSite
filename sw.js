const CACHE_NAME = 'dream-control-v1';
const FILES_TO_CACHE = [
    './',
    'index.html',
    'styles.css',
    'app.js',
    'manifest.json'
    // Add 'icon.png' here later if you have one
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(FILES_TO_CACHE);
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});