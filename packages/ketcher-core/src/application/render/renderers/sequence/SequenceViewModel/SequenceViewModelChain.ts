import type { ITwoStrandedChainItem } from 'domain/entities/monomer-chains/ChainsCollection';
import { EmptySequenceNode } from 'domain/entities/EmptySequenceNode';
import { Nucleoside } from 'domain/entities/Nucleoside';
import { Nucleotide } from 'domain/entities/Nucleotide';
import type { SequenceNode } from 'domain/entities/monomer-chains/types';

const ROWS_PER_SNAKE_CYCLE = 2;
const REVERSED_ROW_INDEX_IN_SNAKE_CYCLE = 1;

function isNucleicAcidNode(node?: SequenceNode) {
  return node instanceof Nucleotide || node instanceof Nucleoside;
}

export interface ISequenceViewModelRow {
  sequenceViewModelItems: ITwoStrandedChainItem[];
}

export class SequenceViewModelChain {
  private readonly rows: ISequenceViewModelRow[] = [];

  public get lastRow() {
    return this.rows[this.rows.length - 1];
  }

  public get lastNode() {
    return this.lastRow.sequenceViewModelItems[
      this.lastRow.sequenceViewModelItems.length - 1
    ];
  }

  public get firstRow() {
    return this.rows[0];
  }

  public get firstNode() {
    return this.firstRow.sequenceViewModelItems[0];
  }

  public get nodes() {
    return this.rows.reduce(
      (acc, row) => acc.concat(row.sequenceViewModelItems),
      [] as ITwoStrandedChainItem[],
    );
  }

  public get length() {
    return this.nodes.length;
  }

  public get hasAntisense() {
    return this.rows.some((row) =>
      row.sequenceViewModelItems.some(
        (node) =>
          node.antisenseNode &&
          !(node.antisenseNode instanceof EmptySequenceNode),
      ),
    );
  }

  public get isNewSequenceChain() {
    return (
      this.length === 1 && this.firstNode.senseNode instanceof EmptySequenceNode
    );
  }

  private get isNucleicAcidChain() {
    return this.rows.some((row) =>
      row.sequenceViewModelItems.some(
        (node) =>
          isNucleicAcidNode(node.senseNode) ||
          isNucleicAcidNode(node.antisenseNode),
      ),
    );
  }

  public isRowReversed(rowIndex: number) {
    return (
      this.isNucleicAcidChain &&
      rowIndex % ROWS_PER_SNAKE_CYCLE === REVERSED_ROW_INDEX_IN_SNAKE_CYCLE
    );
  }

  public addRow(row: ISequenceViewModelRow) {
    this.rows.push(row);
  }

  public forEachNode(
    callback: (node: ITwoStrandedChainItem, nodeIndex: number) => void,
  ) {
    let nodeIndexInChain = 0;

    this.rows.forEach((row) => {
      row.sequenceViewModelItems.forEach((node) => {
        callback(node, nodeIndexInChain);
        nodeIndexInChain++;
      });
    });
  }

  public forEachRow(
    callback: (row: ISequenceViewModelRow, rowIndex: number) => void,
  ) {
    this.rows.forEach((row, rowIndex) => {
      callback(row, rowIndex);
    });
  }
}
