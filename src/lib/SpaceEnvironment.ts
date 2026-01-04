import * as THREE from 'three';
import { gsap } from 'gsap';

export interface SpaceEnvironmentConfig {
  starCount?: number;
  nebulaIntensity?: number;
  particleCount?: number;
  cursorInfluence?: number;
  parallaxStrength?: number;
}

export class SpaceEnvironment {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private stars: THREE.Points;
  private nebula: THREE.Mesh;
  private particles: THREE.Points;
  private mousePosition = { x: 0, y: 0 };
  private targetMousePosition = { x: 0, y: 0 };
  private scrollY = 0;
  private animationId: number | null = null;
  private config: Required<SpaceEnvironmentConfig>;

  constructor(canvas: HTMLCanvasElement, config: SpaceEnvironmentConfig = {}) {
    this.config = {
      starCount: config.starCount ?? 2000,
      nebulaIntensity: config.nebulaIntensity ?? 0.3,
      particleCount: config.particleCount ?? 500,
      cursorInfluence: config.cursorInfluence ?? 0.03,
      parallaxStrength: config.parallaxStrength ?? 20,
    };

    // Scene setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.position.z = 500;

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create space elements
    this.stars = this.createStarfield();
    this.nebula = this.createNebula();
    this.particles = this.createParticles();

    this.scene.add(this.stars);
    this.scene.add(this.nebula);
    this.scene.add(this.particles);

    // Start animation
    this.animate();
  }

  private createStarfield(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];
    const sizes = [];

    for (let i = 0; i < this.config.starCount; i++) {
      const x = (Math.random() - 0.5) * 2000;
      const y = (Math.random() - 0.5) * 2000;
      const z = (Math.random() - 0.5) * 1000;
      vertices.push(x, y, z);

      // Star colors - white to cyan
      const color = new THREE.Color();
      color.setHSL(Math.random() * 0.1 + 0.5, 0.6, Math.random() * 0.4 + 0.6);
      colors.push(color.r, color.g, color.b);
      
      // Random sizes for variety
      sizes.push(Math.random() * 2 + 1);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    // Custom shader material for round stars
    const material = new THREE.ShaderMaterial({
      uniforms: {
        pixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float pixelRatio;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * pixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          // Create circular stars
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          // Soft circular falloff
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
          
          // Add glow effect
          float glow = exp(-dist * 4.0) * 0.5;
          alpha += glow;
          
          if (alpha < 0.01) discard;
          
          gl_FragColor = vec4(vColor, alpha * 0.9);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return new THREE.Points(geometry, material);
  }

  private createNebula(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(1500, 1500, 32, 32);
    
    const material = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      uniforms: {
        time: { value: 0 },
        mousePosition: { value: new THREE.Vector2(0, 0) },
        intensity: { value: this.config.nebulaIntensity },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec2 mousePosition;
        uniform float intensity;
        varying vec2 vUv;

        void main() {
          vec2 uv = vUv - 0.5;
          float dist = length(uv);
          
          // Create nebula clouds
          float noise = sin(uv.x * 3.0 + time * 0.1) * cos(uv.y * 3.0 + time * 0.15);
          noise += sin(uv.x * 5.0 - time * 0.2) * cos(uv.y * 5.0 - time * 0.1);
          
          // Mouse influence
          vec2 mouseInfluence = mousePosition * 0.5;
          float mouseDist = length(uv - mouseInfluence);
          
          // Color gradient
          vec3 color1 = vec3(0.0, 0.18, 0.45); // Deep blue
          vec3 color2 = vec3(0.3, 0.79, 0.94); // Cyan
          vec3 color = mix(color1, color2, noise * 0.5 + 0.5);
          
          float alpha = (1.0 - dist) * intensity * (0.5 + noise * 0.3);
          alpha *= smoothstep(1.0, 0.3, mouseDist);
          
          gl_FragColor = vec4(color, alpha * 0.4);
        }
      `,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = -200;
    return mesh;
  }

  private createParticles(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];

    for (let i = 0; i < this.config.particleCount; i++) {
      const x = (Math.random() - 0.5) * 1000;
      const y = (Math.random() - 0.5) * 1000;
      const z = Math.random() * 500;
      vertices.push(x, y, z);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const material = new THREE.PointsMaterial({
      color: 0x4CC9F0,
      size: 3,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    return new THREE.Points(geometry, material);
  }

  public updateMousePosition(x: number, y: number): void {
    this.targetMousePosition.x = (x / window.innerWidth) * 2 - 1;
    this.targetMousePosition.y = -(y / window.innerHeight) * 2 + 1;
  }

  public updateScroll(scrollY: number): void {
    this.scrollY = scrollY;
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    // Smooth mouse following
    this.mousePosition.x += (this.targetMousePosition.x - this.mousePosition.x) * 0.05;
    this.mousePosition.y += (this.targetMousePosition.y - this.mousePosition.y) * 0.05;

    // Update nebula shader
    if (this.nebula.material instanceof THREE.ShaderMaterial) {
      this.nebula.material.uniforms.time.value += 0.01;
      this.nebula.material.uniforms.mousePosition.value.set(
        this.mousePosition.x,
        this.mousePosition.y
      );
    }

    // Parallax effect on stars
    this.stars.rotation.y = this.mousePosition.x * 0.1;
    this.stars.rotation.x = this.mousePosition.y * 0.1;
    this.stars.position.y = -this.scrollY * 0.1;

    // Nebula parallax
    this.nebula.position.x = this.mousePosition.x * this.config.parallaxStrength;
    this.nebula.position.y = this.mousePosition.y * this.config.parallaxStrength;

    // Particle drift
    const positions = this.particles.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] -= 0.1; // Drift down
      if (positions[i + 1] < -500) {
        positions[i + 1] = 500;
      }
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.position.x = this.mousePosition.x * this.config.parallaxStrength * 1.5;

    this.renderer.render(this.scene, this.camera);
  };

  public resize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.stars.geometry.dispose();
    (this.stars.material as THREE.Material).dispose();
    this.nebula.geometry.dispose();
    (this.nebula.material as THREE.Material).dispose();
    this.particles.geometry.dispose();
    (this.particles.material as THREE.Material).dispose();
    this.renderer.dispose();
  }

  public transitionTo(config: Partial<SpaceEnvironmentConfig>): void {
    // Smooth transition using GSAP
    if (config.nebulaIntensity !== undefined && this.nebula.material instanceof THREE.ShaderMaterial) {
      gsap.to(this.nebula.material.uniforms.intensity, {
        value: config.nebulaIntensity,
        duration: 1.2,
        ease: 'power2.inOut',
      });
    }
  }
}
