import type { Struct } from 'domain/entities/struct';
import type { Vec2 } from 'domain/entities/vec2';
import {
  getLonePairDataPosition,
  LONE_PAIR_DATA_FIELD_NAME,
} from 'domain/helpers/lonePairDataPosition';

export type DatPosition = (struct: Struct, atomId: number) => Vec2;

const DAT_POSITION_CONTRIBUTIONS: ReadonlyMap<string, DatPosition> = new Map([
  [LONE_PAIR_DATA_FIELD_NAME, getLonePairDataPosition],
]);

export function getDatPositionContribution(
  fieldName: string,
): DatPosition | undefined {
  return DAT_POSITION_CONTRIBUTIONS.get(fieldName);
}
