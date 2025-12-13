"use client";
import { useEffect } from "react";
import * as THREE from "three";
import { globalAudioController } from "@/lib/audio/globalAudioController";

const AudioVisualizer = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const audioElement = globalAudioController.getAudioElement();
    if (!audioElement) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = "fixed";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.zIndex = "-1";
    document.body.appendChild(renderer.domElement);

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

    const light = new THREE.PointLight(0xffffff, 1, 100);
    light.position.set(5, 5, 5);
    scene.add(light);

    const audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audioElement);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    let frameId: number | null = null;

    const animate = () => {
      if (!document.hidden) {
        analyser.getByteFrequencyData(frequencyData);
        const average =
          frequencyData.reduce((sum, value) => sum + value, 0) /
          frequencyData.length;

        const scale = 1 + average / 255;
        mesh.scale.setScalar(scale);
        mesh.rotation.x += 0.003 + average / 20000;
        mesh.rotation.y += 0.004 + average / 20000;
        renderer.render(scene, camera);
      }
      frameId = requestAnimationFrame(animate);
    };

    const handleVisibilityChange = () => {
      if (document.hidden && frameId) {
        cancelAnimationFrame(frameId);
        frameId = null;
      } else if (!document.hidden && !frameId) {
        frameId = requestAnimationFrame(animate);
      }
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("resize", handleResize);
    frameId = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("resize", handleResize);
      if (frameId) cancelAnimationFrame(frameId);
      source.disconnect();
      analyser.disconnect();
      audioContext.close().catch(() => undefined);
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, []);

  return null;
};

export default AudioVisualizer;
