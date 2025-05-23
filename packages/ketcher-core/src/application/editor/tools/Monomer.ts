/****************************************************************************
 * Copyright 2021 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ***************************************************************************/
import { BaseTool } from 'application/editor/tools/Tool';
import { BaseMonomer, AmbiguousMonomer, Vec2 } from 'domain/entities';
import { CoreEditor, EditorHistory } from 'application/editor/internal';
import {
  BaseMonomerRenderer,
  AmbiguousMonomerRenderer,
} from 'application/render/renderers';
import { MonomerOrAmbiguousType } from 'domain/types';
import { monomerFactory } from '../operations/monomer/monomerFactory';
import assert from 'assert';
import { Coordinates } from '../shared/coordinates';
import { isAmbiguousMonomerLibraryItem } from 'domain/helpers/monomers';

class MonomerTool implements BaseTool {
  private monomerPreview: BaseMonomer | AmbiguousMonomer | undefined;

  private monomerPreviewRenderer:
    | BaseMonomerRenderer
    | AmbiguousMonomerRenderer
    | undefined;

  readonly MONOMER_PREVIEW_SCALE_FACTOR = 0.8;
  readonly MONOMER_PREVIEW_OFFSET_X = 30;
  readonly MONOMER_PREVIEW_OFFSET_Y = 30;
  history: EditorHistory;
  constructor(
    private editor: CoreEditor,
    private monomer: MonomerOrAmbiguousType,
  ) {
    this.editor = editor;
    this.monomer = monomer;
    this.history = new EditorHistory(this.editor);
  }

  mousedown() {
    assert(this.monomerPreviewRenderer);
    let modelChanges;
    const position = Coordinates.canvasToModel(
      new Vec2(
        this.editor.lastCursorPositionOfCanvas.x,
        this.editor.lastCursorPositionOfCanvas.y,
      ),
    );
    if (isAmbiguousMonomerLibraryItem(this.monomer)) {
      modelChanges = this.editor.drawingEntitiesManager.addAmbiguousMonomer(
        this.monomer,
        position,
      );
    } else {
      modelChanges = this.editor.drawingEntitiesManager.addMonomer(
        this.monomer,
        // We convert monomer coordinates from pixels to angstroms
        // because the model layer (like BaseMonomer) should not work with pixels
        position,
      );
    }

    this.history.update(modelChanges);
    this.editor.renderersContainer.update(modelChanges);
  }

  mousemove() {
    const position = Coordinates.canvasToModel(
      new Vec2(
        this.editor.lastCursorPosition.x + this.MONOMER_PREVIEW_OFFSET_X,
        this.editor.lastCursorPosition.y + this.MONOMER_PREVIEW_OFFSET_Y,
      ),
    );
    this.monomerPreview?.moveAbsolute(position);
    this.monomerPreviewRenderer?.move();
  }

  public mouseLeaveClientArea() {
    this.hidePreview();
  }

  public mouseover() {
    if (!this.monomerPreview) {
      if (isAmbiguousMonomerLibraryItem(this.monomer)) {
        const variantMonomer = new AmbiguousMonomer(this.monomer);
        this.monomerPreview = variantMonomer;
        this.monomerPreviewRenderer = new AmbiguousMonomerRenderer(
          variantMonomer,
          this.MONOMER_PREVIEW_SCALE_FACTOR,
        );
      } else {
        const [Monomer, MonomerRenderer] = monomerFactory(this.monomer);

        this.monomerPreview = new Monomer(this.monomer);
        this.monomerPreviewRenderer = new MonomerRenderer(
          this.monomerPreview,
          this.MONOMER_PREVIEW_SCALE_FACTOR,
          false,
        );
      }

      this.monomerPreviewRenderer?.show(this.editor.theme);
    }
  }

  hidePreview() {
    this.monomerPreviewRenderer?.remove();
    this.monomerPreviewRenderer = undefined;
    this.monomerPreview = undefined;
  }

  destroy(): void {
    this.hidePreview();
  }
}

export { MonomerTool };
