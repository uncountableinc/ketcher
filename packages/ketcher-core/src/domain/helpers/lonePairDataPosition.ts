import type { Struct } from 'domain/entities/struct';
import { Vec2 } from 'domain/entities/vec2';

export const LONE_PAIR_DATA_FIELD_NAME = 'UNC_LONE_PAIRS';

const LONE_PAIR_DATA_OFFSET = 0.6;

export function getLonePairDataPosition(struct: Struct, atomId: number): Vec2 {
  const atom = struct.atoms.get(atomId);
  if (!atom) {
    throw new Error(`Atom ${atomId} not found`);
  }

  const angles = atom.neighbors
    .map((halfBondId) => {
      const halfBond = struct.halfBonds.get(halfBondId);
      if (!halfBond) {
        throw new Error(`Half-bond ${halfBondId} not found`);
      }
      return halfBond.ang;
    })
    .sort((angle, nextAngle) => angle - nextAngle);
  let largestAngle = 0;
  let neighborAngle = -Math.PI / 2;

  for (const [index, angle] of angles.entries()) {
    const sector =
      index < angles.length - 1
        ? angles[index + 1] - angle
        : angles[0] - angle + 2 * Math.PI;
    if (sector > largestAngle) {
      largestAngle = sector;
      neighborAngle = angle;
    }
  }

  const bisectAngle = neighborAngle + largestAngle / 2;
  return atom.pp.add(
    new Vec2(Math.cos(bisectAngle), Math.sin(bisectAngle)).scaled(
      LONE_PAIR_DATA_OFFSET,
    ),
  );
}
