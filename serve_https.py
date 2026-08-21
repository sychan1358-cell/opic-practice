# OPIc 연습실 HTTPS 서버 (모바일 접속용)
# 실행: python serve_https.py  →  https://<PC IP>:8452
import http.server
import ssl
import os

PORT = 8452
os.chdir(os.path.dirname(os.path.abspath(__file__)))

server = http.server.ThreadingHTTPServer(('0.0.0.0', PORT), http.server.SimpleHTTPRequestHandler)
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain('certs/cert.pem', 'certs/key.pem')
server.socket = ctx.wrap_socket(server.socket, server_side=True)

print(f'HTTPS server running on https://0.0.0.0:{PORT}')
server.serve_forever()
