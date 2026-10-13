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

    // Distancia de scroll de cada transición (ida y retorno). Deben coincidir
    // para que el emblema viaje con la misma fluidez en la entrada y en el pie.
    var transit = vh * 0.75;

    // Fase 1: hero -> emblema estacionado a la izquierda.
    var e = smoothstep(clamp01(scrollY / transit));
    var cx = lerp(base.x, parkX, e);
    var cy = base.y;
    var scale = lerp(1, parkScale, e);
    var opacity = lerp(1, parkOpacity, e);

    // Fase 2: el emblema regresa y completa el logo. Empieza más abajo (recién
    // cuando el logo de cierre entra en pantalla) para no pasar por detrás de
    // los logos de clientes, y termina cuando el logo de cierre llega a endY.
    if (endBox) {
      var endY = vh * 0.7;
      var returnDist = vh * 0.3;
      var q = smoothstep(clamp01((endY + returnDist - endBox.y) / returnDist));

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

  /* ---------- Carruseles ---------- */

  function initCarousels() {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var cars = document.querySelectorAll("[data-carousel]");
    if (!cars.length) return;

    cars.forEach(function (car) {
      var track = car.querySelector(".carousel__track");
      if (!track) return;
      var slides = track.querySelectorAll(".carousel__slide");
      if (slides.length < 2) return;

      var timer = null;
      var paused = false;

      function gap() {
        var cs = window.getComputedStyle(track);
        var g = parseFloat(cs.columnGap || cs.gap);
        return isNaN(g) ? 0 : g;
      }

      function step() {
        if (paused) return;
        var maxScroll = track.scrollWidth - track.clientWidth;
        if (maxScroll <= 4) return;
        if (track.scrollLeft >= maxScroll - 4) {
          track.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          var w = slides[0].getBoundingClientRect().width;
          track.scrollBy({ left: w + gap(), behavior: "smooth" });
        }
      }

      function start() {
        if (reduce) return;
        stop();
        timer = window.setInterval(step, 4000);
      }

      function stop() {
        if (timer) { window.clearInterval(timer); timer = null; }
      }

      car.addEventListener("mouseenter", function () { paused = true; });
      car.addEventListener("mouseleave", function () { paused = false; });
      car.addEventListener("focusin", function () { paused = true; });
      car.addEventListener("focusout", function () { paused = false; });
      track.addEventListener("pointerdown", function () { paused = true; });
      window.addEventListener("pointerup", function () { paused = false; });

      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) { paused = false; start(); }
            else { paused = true; stop(); }
          });
        }, { threshold: 0.25 });
        io.observe(car);
      } else {
        start();
      }
    });
  }

  /* ---------- Init ---------- */

  function init() {
    var year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();

    initReveal();
    initCarousels();
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
