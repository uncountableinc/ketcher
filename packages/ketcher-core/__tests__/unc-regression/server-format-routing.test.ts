import { FormatterFactory } from 'application/formatters/formatterFactory';
import { SupportedFormat } from 'application/formatters/structFormatter.types';
import { KetSerializer } from 'domain/serializers';
import type { StructService } from 'domain/services';

import { twoCarbonKet } from './fixtures';

/*
 * Fork commits under test:
 *   6576cd745  backend all formats
 *   52fc7376a  fix formatter
 *   b53ffb290  fix lint
 *
 * Vanilla Ketcher converts a structure to MOL V2000 in the browser, with its
 * own MolfileV2000Formatter, and only asks the server for the other formats.
 * The fork removed that branch: every format except KET now goes to Indigo.
 *
 * Indigo and the in-browser serializer do not agree - they differ on atom
 * ordering, stereo perception and S-group output - so the app's stored
 * molfiles depend on which one runs. This is the widest-reaching fork change
 * in the patch set, and the only one that alters chemistry output rather than
 * crashing, so losing it on the upgrade would be silent.
 *
 * The assertion is behavioural rather than a class-identity check, because
 * upstream is free to rename its formatter classes.
 */

function recordingStructService() {
  const convertedFormats: string[] = [];

  const structService = {
    convert: async (data: { struct: string; output_format: string }) => {
      convertedFormats.push(data.output_format);
      return { struct: data.struct, format: data.output_format };
    },
  } as unknown as StructService;

  return { structService, convertedFormats };
}

const SERVER_FORMATS = [
  SupportedFormat.mol,
  SupportedFormat.molV3000,
  SupportedFormat.rxn,
  SupportedFormat.rxnV3000,
  SupportedFormat.smiles,
  SupportedFormat.cml,
  SupportedFormat.inChI,
];

describe('every format except KET is converted by the server', () => {
  const struct = new KetSerializer().deserializeMicromolecules(twoCarbonKet());

  it.each(SERVER_FORMATS)('asks the server to convert %s', async (format) => {
    const { structService, convertedFormats } = recordingStructService();

    await new FormatterFactory(structService)
      .create(format)
      .getStructureFromStructAsync(struct);

    expect(convertedFormats).toHaveLength(1);
  });

  it('converts MOL on the server, not with the in-browser serializer', async () => {
    const { structService, convertedFormats } = recordingStructService();

    await new FormatterFactory(structService)
      .create(SupportedFormat.mol)
      .getStructureFromStructAsync(struct);

    expect(convertedFormats).toEqual(['chemical/x-mdl-molfile']);
  });

  it('still serializes KET locally', async () => {
    const { structService, convertedFormats } = recordingStructService();

    const result = await new FormatterFactory(structService)
      .create(SupportedFormat.ket)
      .getStructureFromStructAsync(struct);

    expect(convertedFormats).toEqual([]);
    expect(JSON.parse(result).root).toBeDefined();
  });
});
