import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const RINGS_LY = [25, 50, 100];

function StarDots({ points, onSelect }) {
  const ref = useRef();
  const [hovered, setHovered] = useState(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    points.forEach((p, i) => {
      dummy.position.set(p.x, p.z, p.y); // map astro-z (north) to three's up (y)
      dummy.scale.setScalar(p.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new THREE.Color(p.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [points, dummy]);

  return (
    <>
      <instancedMesh
        ref={ref}
        args={[undefined, undefined, points.length]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(e.instanceId ?? null);
        }}
        onPointerOut={() => setHovered(null)}
        onClick={(e) => {
          e.stopPropagation();
          if (e.instanceId != null) onSelect(points[e.instanceId].planet);
        }}
      >
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshStandardMaterial vertexColors />
      </instancedMesh>
      {hovered != null && points[hovered] && (
        <Html
          position={[points[hovered].x, points[hovered].z, points[hovered].y]}
          center
        >
          <div className="neighborhood-map__tip">
            {points[hovered].planet.name} · {points[hovered].planet.distance_ly}{' '}
            ly · {points[hovered].planet.size_class}
          </div>
        </Html>
      )}
    </>
  );
}

function DistanceRings() {
  return RINGS_LY.map((r) => (
    <mesh key={r} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[r - 0.4, r, 96]} />
      <meshBasicMaterial
        color="#2c3350"
        side={THREE.DoubleSide}
        transparent
        opacity={0.7}
      />
    </mesh>
  ));
}

function NeighborhoodMap({ points, onSelect, selectedName, showRings }) {
  const selected = points.find((p) => p.planet.name === selectedName);
  return (
    <Canvas
      camera={{ position: [0, 60, 120], fov: 55 }}
      className="neighborhood-map__canvas"
    >
      <color attach="background" args={['#0b0d17']} />
      <ambientLight intensity={0.7} />
      <pointLight position={[0, 80, 40]} intensity={1.2} />
      {showRings && <DistanceRings />}
      {/* Sun / Earth anchor at the origin */}
      <mesh>
        <sphereGeometry args={[1.4, 16, 16]} />
        <meshStandardMaterial
          color="#79f0c8"
          emissive="#2fae86"
          emissiveIntensity={0.6}
        />
      </mesh>
      <StarDots points={points} onSelect={onSelect} />
      {selected && (
        <mesh position={[selected.x, selected.z, selected.y]}>
          <sphereGeometry args={[selected.size * 1.8, 16, 16]} />
          <meshBasicMaterial color="#ffffff" wireframe />
        </mesh>
      )}
      <OrbitControls enablePan={false} minDistance={10} maxDistance={400} />
    </Canvas>
  );
}

export default NeighborhoodMap;
