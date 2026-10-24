import http.server, sys, os
OUT = sys.argv[1]
class H(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers['Content-Length']); body = self.rfile.read(n)
        open(OUT, 'wb').write(body); self.send_response(200); self.end_headers()
os.chdir(sys.argv[2])
http.server.ThreadingHTTPServer(('127.0.0.1', 8765), H).serve_forever()
