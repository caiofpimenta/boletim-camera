/* Service worker do Boletim de Câmera.
   Guarda o app no celular para abrir sem internet.
   Ao publicar uma versão nova, aumente o número em VERSAO: é isso que faz os celulares baixarem a atualização. */
const VERSAO = "v4";
const APP = "boletim-app-" + VERSAO;
const FONTES = "boletim-fontes";
const ARQUIVOS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(APP).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith("boletim-app-") && n !== APP).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Fontes do Google: usa a cópia guardada e renova quando houver internet.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.open(FONTES).then(async (c) => {
        const guardada = await c.match(req);
        const rede = fetch(req).then((r) => { if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }).catch(() => guardada);
        return guardada || rede;
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Arquivos do app: primeiro a cópia no celular (abre sem sinal), depois a rede.
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((guardada) => {
      if (guardada) return guardada;
      return fetch(req).catch(() => (req.mode === "navigate" ? caches.match("./index.html") : Response.error()));
    })
  );
});
