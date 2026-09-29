import { textToKet } from 'domain/serializers/ket/toKet/textToKet';

/*
 * Fork commit under test:
 *   the mass of text handling added for KET 2.0 in 3.18
 *
 * convertToKET20Text builds the 2.0 shape whenever the text node carries three
 * or more pos points, and parses its content as JSON to do so. Indigo writes
 * four pos points and the typed string itself, and so did Ketcher before 3.18,
 * so every stored text object took that path and the parse threw on prose.
 *
 * The platform reads a KET snapshot after each edit, so the throw lost the
 * edit rather than showing an error.
 *
 * The behaviour to pin is that a text node keeps serialising whatever its
 * content is. Which shape the legacy one comes back as is upstream's choice;
 * that it comes back at all is the point.
 */

const FOUR_CORNERS = [
  { x: 1, y: 1, z: 0 },
  { x: 1, y: 0, z: 0 },
  { x: 3, y: 0, z: 0 },
  { x: 3, y: 1, z: 0 },
];

const LEXICAL_CONTENT = JSON.stringify({
  root: {
    children: [
      {
        children: [{ text: 'styled note', type: 'text', version: 1 }],
        type: 'paragraph',
        version: 1,
      },
    ],
    type: 'root',
    version: 1,
  },
});

function textNodeWith(content: string) {
  return {
    selected: false,
    data: { content, position: { x: 1, y: 1, z: 0 }, pos: FOUR_CORNERS },
  };
}

describe('serialising a text node whose content is not Lexical', () => {
  it('does not throw on the plain string Indigo and earlier Ketcher write', () => {
    expect(() => textToKet(textNodeWith('hello note'))).not.toThrow();
  });

  it('keeps the text, rather than dropping or rewriting it', () => {
    const ket = textToKet(textNodeWith('hello note')) as unknown as {
      data: { content: string };
    };

    expect(ket.data.content).toBe('hello note');
  });

  it('does not mistake prose that opens with a brace for Lexical', () => {
    expect(() => textToKet(textNodeWith('{not json'))).not.toThrow();
  });

  it('still builds the 2.0 shape from real Lexical content', () => {
    const ket = textToKet(textNodeWith(LEXICAL_CONTENT)) as unknown as {
      data?: unknown;
      boundingBox?: unknown;
      paragraphs?: unknown[];
    };

    expect(ket.data).toBeUndefined();
    expect(ket.boundingBox).toBeDefined();
    expect(ket.paragraphs).toHaveLength(1);
  });
});
