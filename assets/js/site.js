// Portfolio Omar Malih : menu, animations, cartes 3D et scène Three.js
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // En-tête
  var header = document.querySelector('.site-header');
  function onScroll() { if (header) header.classList.toggle('scrolled', window.scrollY > 20); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Menu mobile
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
    });
  }

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Apparition au scroll + lien actif
  var items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reduce) {
    items.forEach(function (el) { el.classList.add('visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
  }
  if ('IntersectionObserver' in window) {
    var links = document.querySelectorAll('.nav a[href^="#"]');
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && map[entry.target.id]) {
          links.forEach(function (a) { a.classList.remove('active'); });
          map[entry.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });
  }

  // Cartes inclinables en 3D
  if (!reduce) {
    document.querySelectorAll('[data-tilt]').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.classList.add('tilting');
        card.style.transform = 'rotateX(' + (-y * 7).toFixed(2) + 'deg) rotateY(' + (x * 9).toFixed(2) + 'deg)';
        card.style.setProperty('--mx', ((x + 0.5) * 100).toFixed(1) + '%');
        card.style.setProperty('--my', ((y + 0.5) * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', function () {
        card.classList.remove('tilting');
        card.style.transform = '';
      });
    });
  }

  // Scène 3D : un réseau de nœuds où circulent des paquets
  function initScene() {
    var canvas = document.getElementById('scene');
    if (!canvas || !window.THREE) return;
    var THREE = window.THREE;
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true }); }
    catch (err) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 10);

    var world = new THREE.Group();
    world.rotation.set(0.35, 0, 0.12);
    scene.add(world);

    // Noyau facetté
    var coreGeo = new THREE.IcosahedronGeometry(1.45, 1);
    var core = new THREE.Mesh(coreGeo, new THREE.MeshStandardMaterial({
      color: 0x1c1c1a, metalness: 0.55, roughness: 0.32, flatShading: true
    }));
    core.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(coreGeo),
      new THREE.LineBasicMaterial({ color: 0xff5b23, transparent: true, opacity: 0.7 })
    ));
    world.add(core);

    // Nœuds sur une sphère (répartition de Fibonacci, légèrement bruitée)
    var N = 150, R = 3.05, nodes = [];
    var golden = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < N; i++) {
      var y = 1 - (i / (N - 1)) * 2;
      var rad = Math.sqrt(1 - y * y);
      var th = golden * i;
      var r = R * (0.93 + Math.random() * 0.14);
      nodes.push(new THREE.Vector3(Math.cos(th) * rad * r, y * r, Math.sin(th) * rad * r));
    }
    var pGeo = new THREE.BufferGeometry().setFromPoints(nodes);
    world.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xecebe6, size: 0.06, sizeAttenuation: true })));

    // Liens entre voisins proches
    var edges = [], linePos = [];
    for (var a = 0; a < N; a++) {
      for (var b = a + 1; b < N; b++) {
        if (nodes[a].distanceTo(nodes[b]) < 1.05) {
          edges.push([a, b]);
          linePos.push(nodes[a].x, nodes[a].y, nodes[a].z, nodes[b].x, nodes[b].y, nodes[b].z);
        }
      }
    }
    var lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
    world.add(new THREE.LineSegments(lGeo, new THREE.LineBasicMaterial({ color: 0x6b6a64, transparent: true, opacity: 0.35 })));

    // Anneau orbital
    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(4.1, 0.008, 8, 200),
      new THREE.MeshBasicMaterial({ color: 0xff5b23, transparent: true, opacity: 0.45 })
    );
    ring.rotation.set(1.25, 0.2, 0);
    world.add(ring);
    var sat = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), new THREE.MeshBasicMaterial({ color: 0xff5b23 }));
    world.add(sat);

    // Paquets qui circulent sur les liens
    var packets = [];
    var pMat = new THREE.MeshBasicMaterial({ color: 0xff5b23 });
    var pSphere = new THREE.SphereGeometry(0.045, 10, 10);
    function pickEdge(p) {
      var e = edges[Math.floor(Math.random() * edges.length)];
      p.from = nodes[e[0]]; p.to = nodes[e[1]];
      p.t = 0; p.speed = 0.006 + Math.random() * 0.012;
    }
    for (var k = 0; k < 22 && edges.length; k++) {
      var m = new THREE.Mesh(pSphere, pMat);
      var p = { mesh: m };
      pickEdge(p); p.t = Math.random();
      world.add(m); packets.push(p);
    }

    // Lumières
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    var key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(-4, 5, 6); scene.add(key);
    var rim = new THREE.PointLight(0xff5b23, 2.2, 20); rim.position.set(4, -2, 3); scene.add(rim);

    // Taille
    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.z = w / h < 0.9 ? 12.5 : 10;
      camera.updateProjectionMatrix();
    }
    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize);

    // Souris
    var mx = 0, my = 0, tx = 0, ty = 0;
    window.addEventListener('pointermove', function (e) {
      mx = (e.clientX / window.innerWidth) * 2 - 1;
      my = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });

    var visible = true, angle = 0;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(canvas);
    }

    function frame() {
      angle += 0.0022;
      tx += (mx - tx) * 0.04; ty += (my - ty) * 0.04;
      world.rotation.y = angle + tx * 0.45;
      world.rotation.x = 0.35 + ty * 0.25;
      core.rotation.y -= 0.004; core.rotation.z += 0.0015;
      var s = angle * 6;
      sat.position.set(Math.cos(s) * 4.1, 0, Math.sin(s) * 4.1).applyEuler(ring.rotation);
      packets.forEach(function (p) {
        p.t += p.speed;
        if (p.t >= 1) pickEdge(p);
        p.mesh.position.lerpVectors(p.from, p.to, p.t);
      });
      renderer.render(scene, camera);
    }

    if (reduce) { frame(); return; }
    (function loop() {
      requestAnimationFrame(loop);
      if (visible && !document.hidden) frame();
    })();
  }

  if (window.THREE) initScene();
  else window.addEventListener('load', initScene);
})();
