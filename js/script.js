(function () {
  "use strict";

  // Troca o endpoint abaixo por um webhook/CRM real quando definido.
  // Enquanto for null, o lead fica salvo em localStorage e o formulário
  // apenas simula sucesso — nenhum dado é perdido, só não sai daqui ainda.
  var FORM_ENDPOINT = null;

  function trackEvent(name, detail) {
    if (window.dataLayer && typeof window.dataLayer.push === "function") {
      window.dataLayer.push(Object.assign({ event: name }, detail || {}));
    }
    if (typeof window.gtag === "function") {
      window.gtag("event", name, detail || {});
    }
  }

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-event]");
    if (!el) return;
    trackEvent(el.getAttribute("data-event"), {
      source: el.getAttribute("data-source") || "unknown",
    });
  });

  // ---------- Reveal on scroll ----------
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  // ---------- Sticky nav offset for anchor links ----------
  var nav = document.getElementById("nav");
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var id = link.getAttribute("href").slice(1);
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      var navH = nav ? nav.offsetHeight : 0;
      var top = target.getBoundingClientRect().top + window.pageYOffset - navH - 12;
      window.scrollTo({ top: top, behavior: "smooth" });
    });
  });

  // ---------- WhatsApp phone mask ----------
  var waInput = document.getElementById("whatsapp");
  if (waInput) {
    waInput.addEventListener("input", function () {
      var digits = waInput.value.replace(/\D/g, "").slice(0, 11);
      var out = digits;
      if (digits.length > 2) out = "(" + digits.slice(0, 2) + ") " + digits.slice(2);
      if (digits.length > 7) out = "(" + digits.slice(0, 2) + ") " + digits.slice(2, 7) + "-" + digits.slice(7);
      waInput.value = out;
    });
  }

  // ---------- Form validation + submit ----------
  var form = document.getElementById("lead-form");
  if (form) {
    var successBox = document.getElementById("form-success");

    function setError(field, message) {
      var wrap = field.closest(".field");
      var errorEl = wrap.querySelector(".field__error");
      if (message) {
        wrap.classList.add("has-error");
        if (errorEl) errorEl.textContent = message;
      } else {
        wrap.classList.remove("has-error");
        if (errorEl) errorEl.textContent = "";
      }
    }

    function validate() {
      var valid = true;

      var name = form.querySelector("#name");
      if (!name.value.trim() || name.value.trim().length < 3) {
        setError(name, "Informe seu nome completo.");
        valid = false;
      } else {
        setError(name, "");
      }

      var wa = form.querySelector("#whatsapp");
      var waDigits = wa.value.replace(/\D/g, "");
      if (waDigits.length < 10) {
        setError(wa, "Informe um WhatsApp válido com DDD.");
        valid = false;
      } else {
        setError(wa, "");
      }

      var email = form.querySelector("#email");
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
      if (!emailOk) {
        setError(email, "Informe um e-mail válido.");
        valid = false;
      } else {
        setError(email, "");
      }

      var profileChecked = form.querySelector('input[name="profile"]:checked');
      var profileField = form.querySelector(".field--radio");
      if (!profileChecked) {
        var errorEl = profileField.querySelector(".field__error");
        if (errorEl) errorEl.textContent = "Selecione uma opção.";
        valid = false;
      } else {
        var errorEl2 = profileField.querySelector(".field__error");
        if (errorEl2) errorEl2.textContent = "";
      }

      return valid;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate()) return;

      var submitBtn = form.querySelector('button[type="submit"]');
      var originalLabel = submitBtn.querySelector(".btn__label").textContent;
      submitBtn.disabled = true;
      submitBtn.querySelector(".btn__label").textContent = "Enviando...";

      var payload = {
        name: form.querySelector("#name").value.trim(),
        whatsapp: form.querySelector("#whatsapp").value.trim(),
        email: form.querySelector("#email").value.trim(),
        profile: form.querySelector('input[name="profile"]:checked').value,
        source: "landing-w1",
        page: window.location.href,
        submittedAt: new Date().toISOString(),
      };

      function finish() {
        try {
          var stored = JSON.parse(localStorage.getItem("w1_leads") || "[]");
          stored.push(payload);
          localStorage.setItem("w1_leads", JSON.stringify(stored));
        } catch (err) {
          /* localStorage indisponível — segue sem cache local */
        }

        trackEvent("lead_submit", { profile: payload.profile });

        form.hidden = true;
        var formAlt = document.getElementById("form-alt");
        if (formAlt) formAlt.hidden = true;
        successBox.hidden = false;
        successBox.scrollIntoView({ behavior: "smooth", block: "center" });

        submitBtn.disabled = false;
        submitBtn.querySelector(".btn__label").textContent = originalLabel;
      }

      if (FORM_ENDPOINT) {
        fetch(FORM_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
          .then(finish)
          .catch(finish);
      } else {
        setTimeout(finish, 500);
      }
    });
  }

  // ---------- Gallery lightbox ----------
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightbox-img");
  var lightboxCaption = document.getElementById("lightbox-caption");
  var lightboxClose = document.getElementById("lightbox-close");

  document.querySelectorAll(".gallery__item").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var img = btn.querySelector("img");
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightboxCaption.textContent = btn.getAttribute("data-caption") || "";
      lightbox.hidden = false;
      document.body.style.overflow = "hidden";
    });
  });

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImg.src = "";
    document.body.style.overflow = "";
  }

  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && lightbox && !lightbox.hidden) closeLightbox();
  });

  // ---------- Hero video: só troca a imagem estática pelo vídeo depois
  // que a página inteira já carregou, e só se a conexão aguentar. Em
  // dados ruins / economia de dados / reduced-motion, fica só a imagem. ----------
  window.addEventListener("load", function () {
    var video = document.getElementById("hero-video");
    if (!video) return;

    var conn = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
    if (conn) {
      if (conn.saveData) return;
      if (conn.effectiveType && /2g/.test(conn.effectiveType)) return;
    }
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var isMobile = window.matchMedia("(max-width: 720px)").matches;
    var src = isMobile ? "assets/video/hero-mobile.mp4" : "assets/video/hero-desktop.mp4";

    var settled = false;
    var giveUp = setTimeout(function () {
      settled = true;
    }, 10000);

    video.addEventListener(
      "canplaythrough",
      function () {
        if (settled) return;
        clearTimeout(giveUp);
        settled = true;
        video.play().catch(function () {});
        video.classList.add("is-visible");
      },
      { once: true }
    );

    video.addEventListener(
      "error",
      function () {
        clearTimeout(giveUp);
      },
      { once: true }
    );

    var source = document.createElement("source");
    source.src = src;
    source.type = "video/mp4";
    video.appendChild(source);
    video.load();
  });
})();
