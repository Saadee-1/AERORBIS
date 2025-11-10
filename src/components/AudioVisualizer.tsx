"use client";
import React, { useEffect } from "react";
import * as THREE from "three";

const AudioVisualizer: React.FC = () => {
  useEffect(() => {
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = "fixed";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.zIndex = "-1";
    document.body.appendChild(renderer.domElement);

    // Simple rotating shape
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

    camera.position.z = 4;

    // Animate
    const animate = (): void => {
      requestAnimationFrame(animate);
      mesh.rotation.x += 0.005;
      mesh.rotation.y += 0.008;
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = (): void => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (renderer.domElement.parentElement)
        renderer.domElement.parentElement.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <audio
      id="globalAudio"
      src="/audio/interstellar.mp3"
      autoPlay
      loop
      style={{
        display: "none", // hides it completely
      }}
    />
  );
};

export default AudioVisualizer;
