/**
 * CLIF-C ACLF Score Calculator
 * Service Worker - 오프라인 지원
 */

const CACHE_NAME = 'clif-c-aclf-v1.0.0';

// 캐시할 파일 목록
const urlsToCache = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/app.js',
    '/js/calculator.js',
    '/js/storage.js',
    '/js/clipboard.js',
    '/manifest.json',
    '/icons/icon-72x72.png',
    '/icons/icon-96x96.png',
    '/icons/icon-128x128.png',
    '/icons/icon-144x144.png',
    '/icons/icon-152x152.png',
    '/icons/icon-192x192.png',
    '/icons/icon-384x384.png',
    '/icons/icon-512x512.png'
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
                // 즉시 활성화
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
                            // 현재 캐시가 아닌 이전 캐시 삭제
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
                // 즉시 제어권 획득
                return self.clients.claim();
            })
    );
});

/**
 * Fetch 이벤트 - Cache First 전략
 */
self.addEventListener('fetch', event => {
    // POST 요청 등은 캐시하지 않음
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // 캐시에서 응답
                    console.log('[ServiceWorker] Serving from cache:', event.request.url);
                    return cachedResponse;
                }

                // 네트워크에서 가져오기
                return fetch(event.request)
                    .then(response => {
                        // 유효하지 않은 응답은 캐시하지 않음
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // 응답 복제 (스트림은 한 번만 사용 가능)
                        const responseToCache = response.clone();

                        // 캐시에 저장
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(error => {
                        console.error('[ServiceWorker] Fetch failed:', error);

                        // 오프라인 폴백
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
 * 메시지 이벤트 - 캐시 업데이트 등
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
 * 푸시 알림 (향후 확장용)
 */
self.addEventListener('push', event => {
    console.log('[ServiceWorker] Push received');

    const options = {
        body: event.data ? event.data.text() : 'CLIF-C ACLF Calculator',
        icon: '/icons/icon-192x192.png',
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
                // 이미 열린 창이 있으면 포커스
                for (const client of clientList) {
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                // 새 창 열기
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});
