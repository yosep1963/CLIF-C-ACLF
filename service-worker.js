/**
 * CLIF-C ACLF Score Calculator
 * Service Worker - 오프라인 지원 (v1.2)
 */

const CACHE_NAME = 'clif-c-aclf-v1.2.1';

// 캐시할 파일 목록 (리팩터링된 모듈 구조 반영)
const urlsToCache = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/config.js',
    '/js/utils.js',
    '/js/validation.js',
    '/js/calculator.js',
    '/js/storage.js',
    '/js/clipboard.js',
    '/js/app.js',
    '/manifest.json',
    '/icons/icon-72x72.png',
    '/icons/icon-96x96.png',
    '/icons/icon.svg'
];

/**
 * Install 이벤트 - 캐시 초기화
 */
self.addEventListener('install', event => {
    console.log('[ServiceWorker] Install');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[ServiceWorker] Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[ServiceWorker] Cache failed:', error);
            })
    );
});

/**
 * Activate 이벤트 - 이전 캐시 정리
 */
self.addEventListener('activate', event => {
    console.log('[ServiceWorker] Activate');

    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(cacheName => {
                            return cacheName.startsWith('clif-c-aclf-') &&
                                   cacheName !== CACHE_NAME;
                        })
                        .map(cacheName => {
                            console.log('[ServiceWorker] Removing old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => {
                return self.clients.claim();
            })
    );
});

/**
 * Fetch 이벤트 - Cache First 전략
 */
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request)
                    .then(response => {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(error => {
                        console.error('[ServiceWorker] Fetch failed:', error);

                        if (event.request.destination === 'document') {
                            return caches.match('/index.html');
                        }

                        return new Response('Offline', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

/**
 * 메시지 이벤트
 */
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME).then(() => {
            console.log('[ServiceWorker] Cache cleared');
        });
    }
});

/**
 * 푸시 알림
 */
self.addEventListener('push', event => {
    console.log('[ServiceWorker] Push received');

    const options = {
        body: event.data ? event.data.text() : 'CLIF-C ACLF Calculator',
        icon: '/icons/icon-96x96.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            url: '/'
        }
    };

    event.waitUntil(
        self.registration.showNotification('CLIF-C ACLF', options)
    );
});

/**
 * 알림 클릭
 */
self.addEventListener('notificationclick', event => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window' })
            .then(clientList => {
                for (const client of clientList) {
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});
