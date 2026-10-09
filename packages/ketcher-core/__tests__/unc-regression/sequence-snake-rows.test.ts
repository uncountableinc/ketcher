import { BaseSequenceItemRenderer } from 'application/render/renderers/sequence/BaseSequenceItemRenderer';
import { SequenceViewModelChain } from 'application/render/renderers/sequence/SequenceViewModel/SequenceViewModelChain';
import {
  Chain,
  MonomerSequenceNode,
  Nucleotide,
  Peptide,
  Phosphate,
  RNABase,
  Sugar,
} from 'domain/entities';
import type { ITwoStrandedChainItem } from 'domain/entities/monomer-chains/ChainsCollection';
import type { SequenceNode } from 'domain/entities/monomer-chains/types';
import { KetMonomerClass } from 'domain/constants/monomers';
import { peptideMonomerItem } from '../mock-data';

/*
 * MAT-91342: in sequence mode, wrapped rows of a nucleic acid chain follow a
 * snake pattern. Rows alternate direction, so the second row continues from
 * the right end of the first row and reads right to left. Chains with only
 * peptides keep every row left to right.
 *
 * Upstream draws every row left to right, so vanilla fails this suite.
 */

const LINE_LENGTH = 30;

function rnaPartItem(monomerClass: KetMonomerClass) {
  return {
    ...peptideMonomerItem,
    props: {
      ...peptideMonomerItem.props,
      MonomerType: 'RNA',
      MonomerClass: monomerClass,
    },
  };
}

function chainItem(senseNode: SequenceNode): ITwoStrandedChainItem {
  return { senseNode, senseNodeIndex: 0, chain: new Chain() };
}

function nucleotideItem() {
  return chainItem(
    new Nucleotide(
      new Sugar(rnaPartItem(KetMonomerClass.Sugar)),
      new RNABase(rnaPartItem(KetMonomerClass.Base)),
      new Phosphate(rnaPartItem(KetMonomerClass.Phosphate)),
    ),
  );
}

function peptideItem() {
  return chainItem(new MonomerSequenceNode(new Peptide(peptideMonomerItem)));
}

function viewModelChainWithRows(
  createItem: () => ITwoStrandedChainItem,
  rowCount: number,
) {
  const chain = new SequenceViewModelChain();

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    chain.addRow({ sequenceViewModelItems: [createItem(), createItem()] });
  }

  return chain;
}

describe('sequence mode rows follow a snake pattern for nucleic acids', () => {
  it('reverses every second row of a nucleotide chain', () => {
    const chain = viewModelChainWithRows(nucleotideItem, 3);

    expect([0, 1, 2].map((rowIndex) => chain.isRowReversed(rowIndex))).toEqual([
      false,
      true,
      false,
    ]);
  });

  it('keeps every row of a peptide chain left to right', () => {
    const chain = viewModelChainWithRows(peptideItem, 3);

    expect([0, 1, 2].map((rowIndex) => chain.isRowReversed(rowIndex))).toEqual([
      false,
      false,
      false,
    ]);
  });

  it('mirrors a position only in a reversed row', () => {
    expect(BaseSequenceItemRenderer.mirrorPositionInRow(0, true)).toBe(
      LINE_LENGTH - 1,
    );
    expect(BaseSequenceItemRenderer.mirrorPositionInRow(10, true)).toBe(
      LINE_LENGTH - 11,
    );
    expect(BaseSequenceItemRenderer.mirrorPositionInRow(10, false)).toBe(10);
  });
});
