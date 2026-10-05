/* ==========================================================================
   FAENOX — interacciones
   - Emblema fijo: parte en el logo del hero, gira y se traslada a la
     izquierda (2/3 fuera de pantalla) con el scroll, y al asomar el logo
     de cierre regresa a su lugar formando de nuevo el logo del inicio.
   - Revelado de secciones al entrar en viewport.
   - Header con fondo al hacer scroll.
   ========================================================================== */

(function () {
  "use strict";

  var emblemOrbit = document.getElementById("emblemOrbit");
  var startSlot = document.getElementById("emblemSlot");
  var endSlot = document.getElementById("emblemSlotEnd");
  var header = document.getElementById("siteHeader");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var base = { x: 0, y: 0, w: 0 }; // slot del hero (coordenadas de documento)

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function smoothstep(t) { return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function measureEmblem() {
    if (!emblemOrbit || !startSlot) return;

    var r = startSlot.getBoundingClientRect();
    var scrollY = window.pageYOffset || document.documentElement.scrollTop;
    base.x = r.left + r.width / 2;
    base.y = r.top + r.height / 2 + scrollY;
    base.w = r.width;

    emblemOrbit.style.width = base.w + "px";
    emblemOrbit.style.height = base.w + "px";

    renderEmblem();
  }

  function applyEmblem(cx, cy, scale, rot, opacity) {
    emblemOrbit.style.transform =
      "translate(" + (cx - base.x) + "px, " + (cy - base.y) + "px) " +
      "scale(" + scale + ") rotate(" + rot + "deg)";
    emblemOrbit.style.opacity = opacity;
  }

  function renderEmblem() {
    if (!emblemOrbit || !base.w) return;

    var scrollY = window.pageYOffset || document.documentElement.scrollTop;
    var vh = window.innerHeight;
    var small = window.innerWidth < 720;

    // Medir el logo de cierre en vivo (sin depender de la altura de la página).
    var endBox = null;
    if (endSlot) {
      var er = endSlot.getBoundingClientRect();
      if (er.width > 0) {
        endBox = { x: er.left + er.width / 2, y: er.top + er.height / 2, w: er.width };
      }
    }

    // Posición base (fixed): centro del slot del hero en coordenadas de viewport.
    emblemOrbit.style.left = base.x - base.w / 2 + "px";
    emblemOrbit.style.top = base.y - base.w / 2 + "px";

    if (reduceMotion) {
      emblemOrbit.style.transform = "none";
      emblemOrbit.style.opacity = "0.12";
      return;
    }

    var parkScale = small ? 1.9 : 2.6;
    var parkX = -(base.w * parkScale) / 6; // 2/3 del ancho fuera de pantalla
    var parkOpacity = 0.12;
    var rot = scrollY * 0.2;

    // Fase 1: hero -> emblema estacionado a la izquierda.
    var e = smoothstep(clamp01(scrollY / (vh * 0.75)));
    var cx = lerp(base.x, parkX, e);
    var cy = base.y;
    var scale = lerp(1, parkScale, e);
    var opacity = lerp(1, parkOpacity, e);

    // Fase 2: cuando el logo de cierre asoma (a partir de 1.2 pantallas de
    // distancia vertical) el emblema regresa y completa el logo.
    if (endBox) {
      var q = smoothstep(clamp01((vh * 1.2 - endBox.y) / (vh * 0.5)));

      if (q > 0) {
        var endScale = endBox.w / base.w;
        var snapped = Math.round(rot / 360) * 360;

        cx = lerp(cx, endBox.x, q);
        cy = lerp(cy, endBox.y, q);
        scale = lerp(scale, endScale, q);
        opacity = lerp(opacity, 1, q);
        rot = lerp(rot, snapped, q);
      }
    }

    applyEmblem(cx, cy, scale, rot, opacity);
  }

  /* ---------- Scroll ---------- */

  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      if (!reduceMotion) renderEmblem();

      if (header) {
        header.classList.toggle("is-scrolled", window.pageYOffset > 40);
      }
    });
  }

  /* ---------- Reveal ---------- */

  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    items.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- Init ---------- */

  function init() {
    var year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();

    initReveal();
    measureEmblem();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measureEmblem);
    window.addEventListener("load", measureEmblem);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measureEmblem);
    }

    if (window.ResizeObserver) {
      var ro = new ResizeObserver(measureEmblem);
      if (startSlot) ro.observe(startSlot);
      if (endSlot) ro.observe(endSlot);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
