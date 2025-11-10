import { motion } from 'framer-motion';
import ThreeBackground from './ThreeBackground';
import { useState, useEffect } from 'react';

const ConstellationNetworkBackground = () => {
  const [nodes, setNodes] = useState<{ x: number; y: number; id: number }[]>([]);

  useEffect(() => {
    const newNodes = [...Array(30)].map((_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      id: i,
    }));
    setNodes(newNodes);
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Three.js space environment - community network mode */}
      <ThreeBackground config={{
        starCount: 1600,
        nebulaIntensity: 0.22,
        particleCount: 350,
        cursorInfluence: 0.028,
        parallaxStrength: 16,
      }} />
      
      {/* Constellation nodes */}
      {nodes.map((node) => (
        <motion.div
          key={node.id}
          className="absolute w-2 h-2 rounded-full bg-foreground"
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            boxShadow: '0 0 8px rgba(255, 255, 255, 0.8)',
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
      
      {/* Connecting lines between nodes */}
      {nodes.map((node, i) => {
        const nearbyNodes = nodes.filter((n, j) => {
          if (j === i) return false;
          const dx = n.x - node.x;
          const dy = n.y - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance < 25;
        });

        return nearbyNodes.map((nearNode, j) => (
          <motion.line
            key={`line-${i}-${j}`}
            x1={`${node.x}%`}
            y1={`${node.y}%`}
            x2={`${nearNode.x}%`}
            y2={`${nearNode.y}%`}
            stroke="rgba(135, 206, 235, 0.3)"
            strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: [0, 1, 0],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ));
      })}
      
      <svg className="absolute inset-0 w-full h-full">
        {nodes.map((node, i) => {
          const nearbyNodes = nodes.filter((n, j) => {
            if (j === i) return false;
            const dx = n.x - node.x;
            const dy = n.y - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < 25;
          });

          return nearbyNodes.map((nearNode, j) => (
            <motion.line
              key={`line-${i}-${j}`}
              x1={`${node.x}%`}
              y1={`${node.y}%`}
              x2={`${nearNode.x}%`}
              y2={`${nearNode.y}%`}
              stroke="rgba(135, 206, 235, 0.3)"
              strokeWidth="1"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ 
                pathLength: [0, 1, 0],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            />
          ));
        })}
      </svg>
      
      {/* Ambient glow particles */}
      {[...Array(50)].map((_, i) => (
        <motion.div
          key={`glow-${i}`}
          className="absolute w-1 h-1 bg-secondary rounded-full opacity-30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0.1, 0.5, 0.1],
          }}
          transition={{
            duration: Math.random() * 8 + 5,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        />
      ))}
    </div>
  );
};

export default ConstellationNetworkBackground;
