import { render, screen } from '@testing-library/react';
import ClipArea from './cliparea';

describe('ClipArea', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: jest.fn(),
    });
  });

  const createProps = () => ({
    formats: [],
    focused: jest.fn(() => true),
    onCopy: jest.fn(() => Promise.resolve(null)),
    onCut: jest.fn(() => Promise.resolve(null)),
    onPaste: jest.fn(() => Promise.resolve()),
    onLegacyCopy: jest.fn(() => ({ 'text/plain': 'ketcher' })),
    onLegacyCut: jest.fn(() => ({ 'text/plain': 'ketcher' })),
    onLegacyPaste: jest.fn(),
  });

  it('does not claim copy when focus is outside Ketcher', () => {
    const props = createProps();
    render(
      <>
        <div className="Ketcher-root">
          <ClipArea {...props} target={document.body} />
        </div>
        <button data-testid="outside">Outside</button>
      </>,
    );
    const outside = screen.getByTestId('outside');
    outside.focus();
    const clipboardData = {
      getData: jest.fn(),
      setData: jest.fn(),
    } as unknown as DataTransfer;
    const event = new Event('copy', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: clipboardData });

    outside.dispatchEvent(event);

    expect(props.onLegacyCopy).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('claims copy when the ClipArea has focus', () => {
    const props = createProps();
    render(
      <div className="Ketcher-root">
        <ClipArea {...props} target={document.body} />
      </div>,
    );
    screen.getByRole('textbox').focus();
    const clipboardData = {
      getData: jest.fn(),
      setData: jest.fn(),
    } as unknown as DataTransfer;
    const event = new Event('copy', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: clipboardData });

    document.body.dispatchEvent(event);

    expect(props.onCopy).toHaveBeenCalledTimes(1);
    expect(clipboardData.setData).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not claim paste when focus is outside Ketcher', () => {
    const props = createProps();
    render(
      <>
        <div className="Ketcher-root">
          <ClipArea {...props} target={document.body} />
        </div>
        <button data-testid="outside">Outside</button>
      </>,
    );
    const outside = screen.getByTestId('outside');
    outside.focus();
    const clipboardData = {
      getData: jest.fn(() => 'text'),
    } as unknown as DataTransfer;
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: clipboardData });

    outside.dispatchEvent(event);

    expect(props.onLegacyPaste).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('claims paste when the ClipArea has focus', () => {
    const props = createProps();
    render(
      <div className="Ketcher-root">
        <ClipArea {...props} target={document.body} />
      </div>,
    );
    screen.getByRole('textbox').focus();
    const clipboardData = {
      getData: jest.fn(() => 'text'),
    } as unknown as DataTransfer;
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: clipboardData });

    document.body.dispatchEvent(event);

    expect(props.onLegacyPaste).toHaveBeenCalledWith({ 'text/plain': 'text' });
    expect(event.defaultPrevented).toBe(true);
  });
});
