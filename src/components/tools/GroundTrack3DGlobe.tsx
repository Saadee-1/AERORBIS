/**
 * 3D Rotating Globe with Ground Track Wrapped Around Sphere
 *
 * Two display modes via the `mode` prop:
 *   - "inset": small ~140x140 auto-rotating preview, click to expand
 *   - "fullscreen": large interactive globe with drag-to-rotate + zoom
 *
 * Pure Three.js (no R3F dep). Mirrors the rendering pattern of the existing
 * OrbitalVisualizer scene. Physics inputs (lat/lon arrays) are produced upstream
 * by the SAME orbital propagation in OrbitalGroundTrack.tsx — this file does
 * NOT compute orbital mechanics, only visualisation. Logic-freeze policy: ✓
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Maximize2, X, RotateCw } from 'lucide-react';

const R_E_KM = 6371;
const GLOBE_RADIUS = 1.0; // unit sphere — track sits at radius * (1 + alt/R_E)

export interface GroundTrackPoint {
  lat: number; // deg
  lon: number; // deg
  orbitIdx: number;
  altKm?: number; // if omitted, drawn on surface
}

export interface LaunchSitePin {
  name: string;
  lat: number;
  lon: number;
  isSelected?: boolean;
}

export interface LiveSatellite3D {
  name: string;
  group: 'iss' | 'starlink';
  lat: number;
  lon: number;
  altKm: number;
  inEclipse: boolean;
}

export interface GroundStation3D {
  name: string;
  lat: number;
  lon: number;
  minElevDeg: number;
}

export interface LiveLayersFlags {
  liveSats: boolean;
  coverage: boolean;
  eclipse: boolean;
  gsLinks: boolean;
}

interface GroundTrack3DGlobeProps {
  tracks: GroundTrackPoint[];
  launchSites?: LaunchSitePin[];
  /** Current sub-satellite point for live marker */
  currentLat?: number;
  currentLon?: number;
  currentAltKm?: number;
  /** Visualisation mode */
  mode: 'inset' | 'fullscreen';
  /** Click handler for inset → expand */
  onExpand?: () => void;
  /** Close handler for fullscreen */
  onClose?: () => void;
  /** Orbit colour palette (HSL strings) — re-uses the 2D map colours */
  orbitColors?: string[];
  /** Live overlay flags (4 toggles from LiveLayersPanel) */
  liveLayers?: LiveLayersFlags;
  /** Live SGP4-propagated satellites (ISS / Starlink) */
  liveSats?: LiveSatellite3D[];
  /** Ground station catalog for link-line rendering */
  groundStations?: GroundStation3D[];
  /** Whether the user's primary satellite is currently in Earth's umbra */
  userSatEclipsed?: boolean;
}

// Convert lat/lon (deg) + altitude to 3D Cartesian on/above unit sphere
function latLonToVec3(latDeg: number, lonDeg: number, altKm = 0): THREE.Vector3 {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const r = GLOBE_RADIUS * (1 + altKm / R_E_KM);
  // Standard "globe": +Y up, lon=0 along +X, lon=90 along +Z
  return new THREE.Vector3(
    r * Math.cos(lat) * Math.cos(lon),
    r * Math.sin(lat),
    -r * Math.cos(lat) * Math.sin(lon),
  );
}

export function GroundTrack3DGlobe({
  tracks,
  launchSites = [],
  currentLat,
  currentLon,
  currentAltKm,
  mode,
  onExpand,
  onClose,
  orbitColors = [
    'hsl(210 90% 60%)',
    'hsl(145 70% 50%)',
    'hsl(35 95% 55%)',
    'hsl(280 70% 60%)',
  ],
  liveLayers,
  liveSats = [],
  groundStations = [],
  userSatEclipsed = false,
}: GroundTrack3DGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneObjRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    earth: THREE.Mesh;
    trackGroup: THREE.Group;
    pinsGroup: THREE.Group;
    satMarker: THREE.Mesh | null;
    liveGroup: THREE.Group;
    raf: number;
  } | null>(null);

  // For fullscreen: drag rotation state
  const dragRef = useRef<{ active: boolean; lastX: number; lastY: number; rotY: number; rotX: number; zoom: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
    rotY: 0,
    rotX: 0.3,
    zoom: mode === 'inset' ? 2.6 : 3.2,
  });

  const [autoRotate, setAutoRotate] = useState(true);

  // Build the scene once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;

    // Scene + camera + renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('hsl(220, 60%, 4%)');

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, dragRef.current.zoom);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    // Lower DPR for inset (mini preview) to save GPU; cap fullscreen at 1.75
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mode === 'inset' ? 1 : 1.75));
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.cursor = mode === 'inset' ? 'pointer' : 'grab';

    // Lighting — sun directional + soft ambient
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(5, 2, 3);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0x445577, 0.55));

    // Earth — procedural shaded sphere with land/ocean colours via noise pattern
    const earthGeo = new THREE.SphereGeometry(GLOBE_RADIUS, mode === 'inset' ? 48 : 96, mode === 'inset' ? 32 : 64);

    // Procedural earth material — uses simple noise for landmass hint without needing texture asset
    const earthMat = new THREE.ShaderMaterial({
      uniforms: {
        uLightDir: { value: new THREE.Vector3(5, 2, 3).normalize() },
        uOcean: { value: new THREE.Color(0.04, 0.12, 0.28) },
        uOceanShallow: { value: new THREE.Color(0.08, 0.22, 0.38) },
        uLand: { value: new THREE.Color(0.16, 0.32, 0.18) },
        uLandHigh: { value: new THREE.Color(0.34, 0.28, 0.18) },
        uIce: { value: new THREE.Color(0.85, 0.9, 0.95) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vUv = uv;
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uLightDir;
        uniform vec3 uOcean;
        uniform vec3 uOceanShallow;
        uniform vec3 uLand;
        uniform vec3 uLandHigh;
        uniform vec3 uIce;
        varying vec3 vNormal;
        varying vec2 vUv;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        float fbm(vec2 p) {
          float v = 0.0; float a = 0.5;
          for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
          return v;
        }

        void main() {
          vec2 uv = vUv * 7.0;
          float n = fbm(uv);
          float landMask = smoothstep(0.45, 0.55, n);
          float heightMask = smoothstep(0.55, 0.7, n);
          float lat = abs(vUv.y - 0.5) * 2.0;
          float iceMask = smoothstep(0.78, 0.92, lat);

          vec3 oceanColor = mix(uOcean, uOceanShallow, fbm(uv * 2.0));
          vec3 landColor = mix(uLand, uLandHigh, heightMask);
          vec3 surface = mix(oceanColor, landColor, landMask);
          surface = mix(surface, uIce, iceMask);

          float diffuse = max(dot(vNormal, uLightDir), 0.0);
          float ambient = 0.18;
          // Specular highlight on ocean
          float spec = pow(max(dot(vNormal, uLightDir), 0.0), 32.0) * (1.0 - landMask) * 0.35;

          vec3 color = surface * (ambient + diffuse * 0.85) + vec3(spec);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);

    // Atmosphere fresnel halo
    const atmoGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.04, 48, 32);
    const atmoMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(0.3, 0.6, 1.0) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vView = normalize(-(modelViewMatrix * vec4(position, 1.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.5);
          gl_FragColor = vec4(uColor, fres * 0.6);
        }
      `,
    });
    scene.add(new THREE.Mesh(atmoGeo, atmoMat));

    // Star background — only for fullscreen (inset stays clean)
    if (mode === 'fullscreen') {
      const starsGeo = new THREE.BufferGeometry();
      const starCount = 1500;
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const r = 30 + Math.random() * 20;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPos[i * 3 + 2] = r * Math.cos(phi);
      }
      starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
      const starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.04, sizeAttenuation: true, transparent: true, opacity: 0.7 });
      scene.add(new THREE.Points(starsGeo, starsMat));
    }

    // Track group + pins group
    const trackGroup = new THREE.Group();
    const pinsGroup = new THREE.Group();
    const liveGroup = new THREE.Group();
    scene.add(trackGroup);
    scene.add(pinsGroup);
    scene.add(liveGroup);

    sceneObjRef.current = {
      scene,
      camera,
      renderer,
      earth,
      trackGroup,
      pinsGroup,
      satMarker: null,
      liveGroup,
      raf: 0,
    };

    // Animation loop
    // Throttle: inset ~30fps, fullscreen ~60fps. Pause when tab hidden.
    const targetFrameMs = mode === 'inset' ? 1000 / 30 : 1000 / 60;
    let lastFrameTs = 0;
    let lastZoom = dragRef.current.zoom;
    const animate = (ts: number) => {
      if (!sceneObjRef.current) return;
      const obj = sceneObjRef.current;
      obj.raf = requestAnimationFrame(animate);

      // Skip work entirely when tab hidden
      if (typeof document !== 'undefined' && document.hidden) return;

      if (ts - lastFrameTs < targetFrameMs) return;
      lastFrameTs = ts;

      if (autoRotate && (mode === 'inset' || !dragRef.current.active)) {
        dragRef.current.rotY += mode === 'inset' ? 0.0035 : 0.0012;
      }

      // Apply rotation to earth + groups together (so track rotates with globe)
      const rx = dragRef.current.rotX;
      const ry = dragRef.current.rotY;
      obj.earth.rotation.set(rx, ry, 0);
      obj.trackGroup.rotation.set(rx, ry, 0);
      obj.pinsGroup.rotation.set(rx, ry, 0);
      obj.liveGroup.rotation.set(rx, ry, 0);

      // Camera zoom (only update when changed)
      if (lastZoom !== dragRef.current.zoom) {
        obj.camera.position.setLength(dragRef.current.zoom);
        obj.camera.lookAt(0, 0, 0);
        lastZoom = dragRef.current.zoom;
      }

      obj.renderer.render(obj.scene, obj.camera);
    };
    sceneObjRef.current.raf = requestAnimationFrame(animate);

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (!sceneObjRef.current || !container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      sceneObjRef.current.camera.aspect = w / h;
      sceneObjRef.current.camera.updateProjectionMatrix();
      sceneObjRef.current.renderer.setSize(w, h);
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      if (sceneObjRef.current) {
        cancelAnimationFrame(sceneObjRef.current.raf);
        sceneObjRef.current.renderer.dispose();
        earthGeo.dispose();
        earthMat.dispose();
        atmoGeo.dispose();
        atmoMat.dispose();
        if (sceneObjRef.current.renderer.domElement.parentElement === container) {
          container.removeChild(sceneObjRef.current.renderer.domElement);
        }
        sceneObjRef.current = null;
      }
    };
    // Intentionally rebuild only on mode change. autoRotate handled inside loop via ref-less state read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Update tracks whenever they change
  useEffect(() => {
    const obj = sceneObjRef.current;
    if (!obj) return;
    // Clear previous tracks
    while (obj.trackGroup.children.length > 0) {
      const child = obj.trackGroup.children[0];
      obj.trackGroup.remove(child);
      if ((child as THREE.Line).geometry) (child as THREE.Line).geometry.dispose();
      const mat = (child as THREE.Line).material as THREE.Material;
      if (mat) mat.dispose();
    }
    if (tracks.length === 0) return;

    // Group consecutive points by orbitIdx, splitting on >180° lon jumps
    const segments: Array<{ pts: THREE.Vector3[]; orbitIdx: number }> = [];
    let current: { pts: THREE.Vector3[]; orbitIdx: number } | null = null;

    for (let i = 0; i < tracks.length; i++) {
      const p = tracks[i];
      const v = latLonToVec3(p.lat, p.lon, p.altKm ?? 0);
      const lonJump =
        i > 0 && Math.abs(tracks[i].lon - tracks[i - 1].lon) > 180;
      const orbitChange = current && current.orbitIdx !== p.orbitIdx;

      if (!current || lonJump || orbitChange) {
        if (current && current.pts.length > 1) segments.push(current);
        current = { pts: [v], orbitIdx: p.orbitIdx };
      } else {
        current.pts.push(v);
      }
    }
    if (current && current.pts.length > 1) segments.push(current);

    // Build a glowing tube for each segment
    segments.forEach((seg) => {
      if (seg.pts.length < 2) return;
      const colorStr = orbitColors[seg.orbitIdx % orbitColors.length];
      const color = new THREE.Color(colorStr);
      const curve = new THREE.CatmullRomCurve3(seg.pts, false, 'centripetal');
      const tubeRadius = mode === 'inset' ? 0.006 : 0.008;
      const tubeGeo = new THREE.TubeGeometry(curve, Math.min(seg.pts.length * 2, 256), tubeRadius, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
      obj.trackGroup.add(new THREE.Mesh(tubeGeo, tubeMat));

      // Outer glow
      const glowGeo = new THREE.TubeGeometry(curve, Math.min(seg.pts.length * 2, 256), tubeRadius * 2.5, 6, false);
      const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false });
      obj.trackGroup.add(new THREE.Mesh(glowGeo, glowMat));
    });
  }, [tracks, orbitColors, mode]);

  // Update launch site pins
  useEffect(() => {
    const obj = sceneObjRef.current;
    if (!obj) return;
    while (obj.pinsGroup.children.length > 0) {
      const child = obj.pinsGroup.children[0];
      obj.pinsGroup.remove(child);
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) (mesh.material as THREE.Material).dispose();
    }

    launchSites.forEach((site) => {
      const pos = latLonToVec3(site.lat, site.lon, 0).multiplyScalar(1.012);
      const isSel = site.isSelected;
      const pinGeo = new THREE.SphereGeometry(isSel ? 0.018 : 0.012, 12, 12);
      const pinMat = new THREE.MeshBasicMaterial({
        color: isSel ? new THREE.Color('hsl(190, 90%, 60%)') : new THREE.Color('hsl(45, 90%, 55%)'),
      });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.copy(pos);
      obj.pinsGroup.add(pin);

      if (isSel) {
        // Halo ring
        const ringGeo = new THREE.RingGeometry(0.022, 0.028, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color('hsl(190, 90%, 60%)'),
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(pos);
        ring.lookAt(0, 0, 0);
        obj.pinsGroup.add(ring);
      }
    });
  }, [launchSites]);

  // Update live satellite marker
  useEffect(() => {
    const obj = sceneObjRef.current;
    if (!obj) return;
    if (obj.satMarker) {
      obj.pinsGroup.remove(obj.satMarker);
      obj.satMarker.geometry.dispose();
      (obj.satMarker.material as THREE.Material).dispose();
      obj.satMarker = null;
    }
    if (currentLat === undefined || currentLon === undefined) return;

    const pos = latLonToVec3(currentLat, currentLon, currentAltKm ?? 0);
    const satGeo = new THREE.SphereGeometry(mode === 'inset' ? 0.022 : 0.028, 16, 16);
    const eclipseColor = userSatEclipsed && liveLayers?.eclipse
      ? new THREE.Color('hsl(230, 70%, 75%)')
      : new THREE.Color('hsl(0, 90%, 60%)');
    const satMat = new THREE.MeshBasicMaterial({ color: eclipseColor });
    const sat = new THREE.Mesh(satGeo, satMat);
    sat.position.copy(pos);
    obj.pinsGroup.add(sat);
    obj.satMarker = sat;
  }, [currentLat, currentLon, currentAltKm, mode, userSatEclipsed, liveLayers?.eclipse]);

  // Live layers — coverage cone, live satellites, GS link lines
  useEffect(() => {
    const obj = sceneObjRef.current;
    if (!obj) return;

    // Clear previous live layer objects
    while (obj.liveGroup.children.length > 0) {
      const child = obj.liveGroup.children[0];
      obj.liveGroup.remove(child);
      const mesh = child as THREE.Mesh & { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] };
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
        else mesh.material.dispose();
      }
    }

    if (!liveLayers) return;

    // 1) Coverage cone for the user's primary satellite
    if (
      liveLayers.coverage &&
      currentLat !== undefined &&
      currentLon !== undefined &&
      currentAltKm !== undefined &&
      currentAltKm > 0
    ) {
      const altKm = currentAltKm;
      const rho = Math.acos(R_E_KM / (R_E_KM + altKm)); // central half-angle
      const lat1 = (currentLat * Math.PI) / 180;
      const lon1 = (currentLon * Math.PI) / 180;
      const ringPts: THREE.Vector3[] = [];
      const steps = mode === 'inset' ? 36 : 64;
      for (let i = 0; i <= steps; i++) {
        const az = (i / steps) * 2 * Math.PI;
        const lat2 = Math.asin(
          Math.sin(lat1) * Math.cos(rho) + Math.cos(lat1) * Math.sin(rho) * Math.cos(az),
        );
        const lon2 =
          lon1 +
          Math.atan2(
            Math.sin(az) * Math.sin(rho) * Math.cos(lat1),
            Math.cos(rho) - Math.sin(lat1) * Math.sin(lat2),
          );
        ringPts.push(latLonToVec3((lat2 * 180) / Math.PI, (lon2 * 180) / Math.PI, 0).multiplyScalar(1.005));
      }
      // Translucent cap
      const satPos = latLonToVec3(currentLat, currentLon, altKm);
      const coneGeo = new THREE.BufferGeometry();
      const verts: number[] = [];
      for (let i = 0; i < ringPts.length - 1; i++) {
        const a = ringPts[i];
        const b = ringPts[i + 1];
        verts.push(satPos.x, satPos.y, satPos.z, a.x, a.y, a.z, b.x, b.y, b.z);
      }
      coneGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      coneGeo.computeVertexNormals();
      const coneMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('hsl(190, 90%, 60%)'),
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      obj.liveGroup.add(new THREE.Mesh(coneGeo, coneMat));
      // Outline ring
      const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
      const ringMat = new THREE.LineBasicMaterial({
        color: new THREE.Color('hsl(190, 90%, 65%)'),
        transparent: true,
        opacity: 0.6,
      });
      obj.liveGroup.add(new THREE.Line(ringGeo, ringMat));
    }

    // 2) Live satellites (ISS / Starlink)
    if (liveLayers.liveSats && liveSats.length > 0) {
      liveSats.forEach((s) => {
        const isISS = s.group === 'iss';
        const dim = liveLayers.eclipse && s.inEclipse;
        const color = new THREE.Color(
          dim ? 'hsl(230, 60%, 55%)' : isISS ? 'hsl(190, 90%, 60%)' : 'hsl(280, 70%, 65%)',
        );
        const radius = isISS ? (mode === 'inset' ? 0.018 : 0.022) : (mode === 'inset' ? 0.008 : 0.011);
        const geo = new THREE.SphereGeometry(radius, 10, 10);
        const mat = new THREE.MeshBasicMaterial({ color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(latLonToVec3(s.lat, s.lon, s.altKm));
        obj.liveGroup.add(mesh);
      });
    }

    // 3) Ground-station link lines to user's primary satellite
    if (
      liveLayers.gsLinks &&
      currentLat !== undefined &&
      currentLon !== undefined &&
      currentAltKm !== undefined &&
      currentAltKm > 0 &&
      groundStations.length > 0
    ) {
      const satVec = latLonToVec3(currentLat, currentLon, currentAltKm);
      const rho = Math.acos(R_E_KM / (R_E_KM + currentAltKm));
      const satLatRad = (currentLat * Math.PI) / 180;
      groundStations.forEach((gs) => {
        const gsLatRad = (gs.lat * Math.PI) / 180;
        const dLon = ((currentLon - gs.lon) * Math.PI) / 180;
        const a =
          Math.sin((gsLatRad - satLatRad) / 2) ** 2 +
          Math.cos(satLatRad) * Math.cos(gsLatRad) * Math.sin(dLon / 2) ** 2;
        const angDist = 2 * Math.asin(Math.sqrt(a));
        const visible = angDist <= rho - (gs.minElevDeg * Math.PI) / 180;
        if (!visible) return;
        const gsVec = latLonToVec3(gs.lat, gs.lon, 0).multiplyScalar(1.005);
        const lineGeo = new THREE.BufferGeometry().setFromPoints([gsVec, satVec]);
        const lineMat = new THREE.LineBasicMaterial({
          color: new THREE.Color('hsl(145, 70%, 55%)'),
          transparent: true,
          opacity: 0.7,
        });
        obj.liveGroup.add(new THREE.Line(lineGeo, lineMat));
        // small green dot at the station
        const dotGeo = new THREE.SphereGeometry(mode === 'inset' ? 0.008 : 0.012, 8, 8);
        const dotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('hsl(145, 70%, 55%)') });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.copy(gsVec);
        obj.liveGroup.add(dot);
      });
    }
  }, [
    liveLayers,
    liveSats,
    groundStations,
    currentLat,
    currentLon,
    currentAltKm,
    mode,
  ]);

  // Drag/zoom interaction (fullscreen only)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (mode !== 'fullscreen') return;
      dragRef.current.active = true;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const canvas = sceneObjRef.current?.renderer.domElement;
      if (canvas) canvas.style.cursor = 'grabbing';
    },
    [mode],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (mode !== 'fullscreen' || !dragRef.current.active) return;
      const dx = e.clientX - dragRef.current.lastX;
      const dy = e.clientY - dragRef.current.lastY;
      dragRef.current.rotY += dx * 0.005;
      dragRef.current.rotX = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, dragRef.current.rotX + dy * 0.005));
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
    },
    [mode],
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current.active = false;
    const canvas = sceneObjRef.current?.renderer.domElement;
    if (canvas && mode === 'fullscreen') canvas.style.cursor = 'grab';
  }, [mode]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (mode !== 'fullscreen') return;
      dragRef.current.zoom = Math.max(1.6, Math.min(6, dragRef.current.zoom + e.deltaY * 0.002));
    },
    [mode],
  );

  // Inset click → expand
  const handleClick = useCallback(() => {
    if (mode === 'inset' && onExpand) onExpand();
  }, [mode, onExpand]);

  // INSET MODE — small floating preview
  if (mode === 'inset') {
    return (
      <div
        className="absolute top-2 right-2 z-20 group cursor-pointer"
        style={{ width: 140, height: 140 }}
        onClick={handleClick}
        title="Click to view in 3D"
      >
        <div
          ref={containerRef}
          className="w-full h-full rounded-full overflow-hidden border-2 border-primary/40 shadow-[0_0_20px_hsl(var(--primary)/0.4)] group-hover:border-primary group-hover:shadow-[0_0_30px_hsl(var(--primary)/0.7)] transition-all"
        />
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-background/90 border border-primary/40 text-[9px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 whitespace-nowrap">
          <Maximize2 className="w-2.5 h-2.5" />
          View 3D
        </div>
      </div>
    );
  }

  // FULLSCREEN MODE
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full h-full max-w-7xl">
        {/* Header */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
          <h3 className="text-lg font-bold text-foreground tracking-wide">3D Orbital Globe</h3>
          <span className="text-xs text-muted-foreground">Drag to rotate · Scroll to zoom</span>
        </div>

        {/* Controls */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button
            onClick={() => setAutoRotate((s) => !s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold transition-all ${
              autoRotate
                ? 'bg-primary/20 border-primary/50 text-primary'
                : 'bg-background/80 border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin-slow' : ''}`} />
            Auto-rotate
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background/80 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all text-xs font-semibold"
          >
            <X className="w-3.5 h-3.5" />
            Back to 2D
          </button>
        </div>

        {/* Canvas container */}
        <div
          ref={containerRef}
          className="w-full h-full rounded-2xl border border-primary/20 overflow-hidden shadow-[0_0_60px_hsl(var(--primary)/0.15)]"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
        />

        {/* Bottom legend */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2 rounded-full bg-background/80 border border-border backdrop-blur-sm text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[hsl(0,90%,60%)]" /> Satellite
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[hsl(190,90%,60%)]" /> Selected pad
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[hsl(45,90%,55%)]" /> Launch sites
          </span>
        </div>
      </div>
    </div>
  );
}
