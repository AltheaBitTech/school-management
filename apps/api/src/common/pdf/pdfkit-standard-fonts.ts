import { createRequire } from 'module';
import Module from 'module';

/**
 * pdfkit loads Helvetica through the package import `#standard-fonts/*`.
 * Node resolves that on a normal machine. The Vercel file tracer does not
 * follow it, so production throws when the first text is drawn. Resolve the
 * font files with a normal require so they are packaged, then answer the
 * `#standard-fonts` request with those files.
 */
const nodeRequire = createRequire(__filename);

const STANDARD_FONT_FILES: Record<string, string> = {
  Courier: nodeRequire.resolve('pdfkit/standard-fonts/Courier'),
  CourierBold: nodeRequire.resolve('pdfkit/standard-fonts/CourierBold'),
  CourierBoldOblique: nodeRequire.resolve('pdfkit/standard-fonts/CourierBoldOblique'),
  CourierOblique: nodeRequire.resolve('pdfkit/standard-fonts/CourierOblique'),
  Helvetica: nodeRequire.resolve('pdfkit/standard-fonts/Helvetica'),
  HelveticaBold: nodeRequire.resolve('pdfkit/standard-fonts/HelveticaBold'),
  HelveticaBoldOblique: nodeRequire.resolve('pdfkit/standard-fonts/HelveticaBoldOblique'),
  HelveticaOblique: nodeRequire.resolve('pdfkit/standard-fonts/HelveticaOblique'),
  Symbol: nodeRequire.resolve('pdfkit/standard-fonts/Symbol'),
  TimesBold: nodeRequire.resolve('pdfkit/standard-fonts/TimesBold'),
  TimesBoldItalic: nodeRequire.resolve('pdfkit/standard-fonts/TimesBoldItalic'),
  TimesItalic: nodeRequire.resolve('pdfkit/standard-fonts/TimesItalic'),
  TimesRoman: nodeRequire.resolve('pdfkit/standard-fonts/TimesRoman'),
  ZapfDingbats: nodeRequire.resolve('pdfkit/standard-fonts/ZapfDingbats'),
};

const PATCH_KEY = Symbol.for('campusops.pdfkit-standard-fonts');
const moduleApi = Module as unknown as {
  _resolveFilename: (
    request: string,
    parent: NodeModule | null | undefined,
    isMain: boolean,
    options?: unknown,
  ) => string;
} & Record<symbol, boolean>;

if (!moduleApi[PATCH_KEY]) {
  const resolveFilename = moduleApi._resolveFilename;
  moduleApi._resolveFilename = function resolvePdfKitStandardFont(
    request,
    parent,
    isMain,
    options,
  ) {
    if (request.startsWith('#standard-fonts/')) {
      const file = STANDARD_FONT_FILES[request.slice('#standard-fonts/'.length)];
      if (file) {
        return file;
      }
    }
    return resolveFilename.call(this, request, parent, isMain, options);
  };
  moduleApi[PATCH_KEY] = true;
}
