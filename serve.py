#!/usr/bin/env python3
"""Локальный сервер для проверки сайта: python3 serve.py [порт]  ->  http://localhost:8080
Отдаёт папку /ads/ с Access-Control-Allow-Origin: * (как в инструкции партнёра),
иначе 3D-Лион внутри sandbox-iframe не загрузит модели. Двойной клик по index.html (file://) не подходит."""
import http.server, socketserver, sys

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
        '.webp': 'image/webp', '.woff2': 'font/woff2', '.js': 'text/javascript',
        '.json': 'application/json', '.glb': 'application/octet-stream', '.svg': 'image/svg+xml'}
    def end_headers(self):
        if self.path.startswith('/ads/'):
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cross-Origin-Resource-Policy', 'cross-origin')
            self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('', port), Handler) as srv:
    print(f'http://localhost:{port}  (Ctrl+C — остановить)')
    srv.serve_forever()
