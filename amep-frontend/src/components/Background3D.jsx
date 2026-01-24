import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Sphere } from "@react-three/drei";

function FloatingShape({ position, color, speed = 1 }) {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.001 * speed;
      meshRef.current.rotation.y += 0.002 * speed;
      meshRef.current.position.y =
        position[1] + Math.sin(state.clock.elapsedTime * speed) * 0.3;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 32, 32]} position={position}>
      <MeshDistortMaterial
        color={color}
        attach="material"
        distort={0.3}
        speed={1.5}
        roughness={0.5}
        metalness={0.2}
        transparent
        opacity={0.15}
      />
    </Sphere>
  );
}

function TorusShape({ position, color, speed = 1 }) {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.001 * speed;
      meshRef.current.rotation.z += 0.0015 * speed;
      meshRef.current.position.y =
        position[1] + Math.cos(state.clock.elapsedTime * speed * 0.8) * 0.2;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <torusGeometry args={[1.2, 0.4, 16, 32]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.12}
        roughness={0.6}
        metalness={0.3}
      />
    </mesh>
  );
}

export default function Background3D() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={0.3} />
      <pointLight position={[-10, -10, -10]} intensity={0.2} color="#4a90e2" />

      {/* Floating abstract shapes */}
      <FloatingShape position={[-8, 2, -5]} color="#3b82f6" speed={0.5} />
      <FloatingShape position={[8, -2, -5]} color="#8b5cf6" speed={0.7} />
      <FloatingShape position={[0, 4, -6]} color="#06b6d4" speed={0.6} />

      <TorusShape position={[-5, -3, -4]} color="#6366f1" speed={0.4} />
      <TorusShape position={[6, 3, -4]} color="#ec4899" speed={0.5} />
    </>
  );
}
