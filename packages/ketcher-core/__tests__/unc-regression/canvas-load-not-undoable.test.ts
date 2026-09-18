// ketcher-core's operation modules form an import cycle that only resolves
// when a serializer entry point is loaded first. Without this the operation
// base class is still undefined when its subclasses extend it.
import 'domain/serializers';
import { Action } from 'application/editor/actions/action';
import { BaseOperation } from 'application/editor/operations/base';
import { CanvasLoad } from 'application/editor/operations/CanvasLoad';
import { OperationType } from 'application/editor/operations/OperationType';

/*
 * Fork commit under test:
 *   c0fde0b1e  skip inverting CanvasLoad and remove clearHistory
 *
 * CanvasLoad replaces the whole canvas contents, which is what runs when the
 * app loads a stored structure into the drawer. Vanilla pushes its inverse
 * onto the undo stack like any other operation, so the user's first undo
 * empties the canvas back to whatever was there before the load.
 *
 * The fork adds an isInvertible() predicate to the operation base class.
 * CanvasLoad opts out, and Action.perform leaves opted-out operations off the
 * undo action it builds. Every other operation keeps the vanilla behaviour,
 * so the default has to stay true.
 */

class RecordingOperation extends BaseOperation {
  public performed = false;

  constructor() {
    super(OperationType.ATOM_ADD);
  }

  execute() {
    this.performed = true;
  }

  invert() {
    return this;
  }
}

/*
 * CanvasLoad.execute only needs somewhere to clear visels and a current
 * molecule to compare against; RecordingOperation ignores its argument.
 */
function emptyRestruct() {
  return {
    molecule: {},
    clearVisels: () => undefined,
  } as never;
}

describe('CanvasLoad is left off the undo stack', () => {
  it('opts out of inversion', () => {
    expect(new CanvasLoad().isInvertible()).toBe(false);
  });

  it('leaves every other operation invertible by default', () => {
    expect(new RecordingOperation().isInvertible()).toBe(true);
  });

  it('drops a non-invertible operation from the action it returns', () => {
    const canvasLoad = new CanvasLoad();
    const action = new Action([]);
    action.addOp(canvasLoad);
    action.addOp(new RecordingOperation());

    const inverted = action.perform(emptyRestruct());

    expect(inverted.operations).toHaveLength(1);
    expect(inverted.operations).not.toContain(canvasLoad);
  });

  it('still performs the non-invertible operation', () => {
    const ordinary = new RecordingOperation();
    const action = new Action([]);
    action.addOp(ordinary);

    action.perform(emptyRestruct());

    expect(ordinary.performed).toBe(true);
  });
});
