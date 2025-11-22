"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { globalAudioController } from "@/lib/audio/globalAudioController";

const AudioVisualizer = () => {
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const audioElement = globalAudioController.getAudioElement();
    if (!audioElement) return;

    // Prevent double initialization
    if (rendererRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 4;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = "fixed";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.zIndex = "-1";
    document.body.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x111111,
      wireframe: true,
      metalness: 0.6,
      roughness: 0.3,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;

    const light = new THREE.PointLight(0xffffff, 1, 100);
    light.position.set(5, 5, 5);
    scene.add(light);

    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audioElement);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    const animate = () => {
      if (!document.hidden && rendererRef.current && sceneRef.current && cameraRef.current && meshRef.current) {
        analyser.getByteFrequencyData(frequencyData);
        const average =
          frequencyData.reduce((sum, value) => sum + value, 0) /
          frequencyData.length;

        const scale = 1 + average / 255;
        meshRef.current.scale.setScalar(scale);
        meshRef.current.rotation.x += 0.003 + average / 20000;
        meshRef.current.rotation.y += 0.004 + average / 20000;
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      animationIdRef.current = requestAnimationFrame(animate);
    };

    const handleVisibilityChange = () => {
      if (document.hidden && animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      } else if (!document.hidden && !animationIdRef.current) {
        animationIdRef.current = requestAnimationFrame(animate);
      }
    };

    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("resize", handleResize);
    animationIdRef.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("resize", handleResize);
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      
      source.disconnect();
      analyser.disconnect();
      audioContext.close().catch(() => undefined);
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
        const canvas = rendererRef.current.domElement;
        if (canvas && canvas.parentElement) {
          canvas.parentElement.removeChild(canvas);
        }
        rendererRef.current = null;
      }
      
      // Dispose geometries and materials
      if (meshRef.current) {
        meshRef.current.geometry.dispose();
        if (Array.isArray(meshRef.current.material)) {
          meshRef.current.material.forEach((m) => m.dispose());
        } else {
          meshRef.current.material.dispose();
        }
        meshRef.current = null;
      }
      
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, []);

  return null;
};

export default AudioVisualizer;
