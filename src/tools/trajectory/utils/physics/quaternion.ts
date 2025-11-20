/**
 * Quaternion math for 3D attitude representation
 * Used for rocket orientation in 3D simulations
 */

export type Quaternion = [number, number, number, number]; // [w, x, y, z]

/**
 * Create identity quaternion (no rotation)
 */
export function quaternionIdentity(): Quaternion {
  return [1, 0, 0, 0];
}

/**
 * Quaternion multiplication (q1 ⊗ q2)
 */
export function quaternionMultiply(q1: Quaternion, q2: Quaternion): Quaternion {
  const [w1, x1, y1, z1] = q1;
  const [w2, x2, y2, z2] = q2;
  
  return [
    w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
    w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
    w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
    w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
  ];
}

/**
 * Quaternion conjugate
 */
export function quaternionConjugate(q: Quaternion): Quaternion {
  return [q[0], -q[1], -q[2], -q[3]];
}

/**
 * Quaternion normalization
 */
export function quaternionNormalize(q: Quaternion): Quaternion {
  const norm = Math.sqrt(q[0] ** 2 + q[1] ** 2 + q[2] ** 2 + q[3] ** 2);
  if (norm < 1e-10) return quaternionIdentity();
  return [q[0] / norm, q[1] / norm, q[2] / norm, q[3] / norm];
}

/**
 * Rotate vector by quaternion: v' = q ⊗ v ⊗ q*
 */
export function quaternionRotateVector(q: Quaternion, v: [number, number, number]): [number, number, number] {
  const qv: Quaternion = [0, v[0], v[1], v[2]];
  const qConj = quaternionConjugate(q);
  const qvq = quaternionMultiply(quaternionMultiply(q, qv), qConj);
  return [qvq[1], qvq[2], qvq[3]];
}

/**
 * Quaternion derivative: q' = 0.5 * q ⊗ ω
 * where ω is angular velocity [wx, wy, wz]
 */
export function quaternionDerivative(q: Quaternion, omega: [number, number, number]): Quaternion {
  const [w, x, y, z] = q;
  const [wx, wy, wz] = omega;
  
  const omegaQ: Quaternion = [0, wx, wy, wz];
  const dq = quaternionMultiply(q, omegaQ);
  
  return [0.5 * dq[0], 0.5 * dq[1], 0.5 * dq[2], 0.5 * dq[3]];
}

/**
 * Convert quaternion to rotation matrix (3x3)
 */
export function quaternionToRotationMatrix(q: Quaternion): number[][] {
  const [w, x, y, z] = q;
  
  return [
    [
      1 - 2 * (y * y + z * z),
      2 * (x * y - w * z),
      2 * (x * z + w * y),
    ],
    [
      2 * (x * y + w * z),
      1 - 2 * (x * x + z * z),
      2 * (y * z - w * x),
    ],
    [
      2 * (x * z - w * y),
      2 * (y * z + w * x),
      1 - 2 * (x * x + y * y),
    ],
  ];
}

/**
 * Create quaternion from Euler angles (ZYX order: yaw, pitch, roll)
 */
export function quaternionFromEuler(yaw: number, pitch: number, roll: number): Quaternion {
  const cy = Math.cos(yaw * 0.5);
  const sy = Math.sin(yaw * 0.5);
  const cp = Math.cos(pitch * 0.5);
  const sp = Math.sin(pitch * 0.5);
  const cr = Math.cos(roll * 0.5);
  const sr = Math.sin(roll * 0.5);
  
  return [
    cr * cp * cy + sr * sp * sy,
    sr * cp * cy - cr * sp * sy,
    cr * sp * cy + sr * cp * sy,
    cr * cp * sy - sr * sp * cy,
  ];
}

/**
 * Convert quaternion to Euler angles (ZYX order)
 */
export function quaternionToEuler(q: Quaternion): [number, number, number] {
  const [w, x, y, z] = q;
  
  const sinr_cosp = 2 * (w * x + y * z);
  const cosr_cosp = 1 - 2 * (x * x + y * y);
  const roll = Math.atan2(sinr_cosp, cosr_cosp);
  
  const sinp = 2 * (w * y - z * x);
  const pitch = Math.abs(sinp) >= 1 
    ? Math.sign(sinp) * Math.PI / 2 
    : Math.asin(sinp);
  
  const siny_cosp = 2 * (w * z + x * y);
  const cosy_cosp = 1 - 2 * (y * y + z * z);
  const yaw = Math.atan2(siny_cosp, cosy_cosp);
  
  return [yaw, pitch, roll];
}
