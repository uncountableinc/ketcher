import { fireEvent, render, screen } from '@testing-library/react';
import { Dialog } from './Dialog';

describe('Dialog keyboard handling', () => {
  it('cancels on an Escape that starts inside the dialog after focus left it', () => {
    const onCancel = jest.fn();
    render(
      <Dialog params={{ onCancel }} buttons={['Cancel', 'OK']}>
        <input data-testid="dialog-field" />
      </Dialog>,
    );
    const field = screen.getByTestId('dialog-field');
    field.focus();
    field.blur();

    fireEvent.keyDown(field, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('ignores an Escape that starts outside the dialog', () => {
    const onCancel = jest.fn();
    render(
      <>
        <input data-testid="outside-field" />
        <Dialog params={{ onCancel }} buttons={['Cancel', 'OK']} />
      </>,
    );

    fireEvent.keyDown(screen.getByTestId('outside-field'), { key: 'Escape' });

    expect(onCancel).not.toHaveBeenCalled();
  });
});
