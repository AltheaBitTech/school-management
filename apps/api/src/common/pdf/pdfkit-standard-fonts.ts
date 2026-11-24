import { createRequire } from 'module';
import Module from 'module';

/**
 * pdfkit loads Helvetica through the package import `#standard-fonts/*`.
 * Vercel does not copy those files out of pdfkit, and looking them up in
 * node_modules crashes the whole function. The copies in ./standard-fonts
 * are the pdfkit 0.20.2 standard fonts. Each require.resolve below uses a
 * string literal so the file tracer packages that file and its glyph chunk.
 */
const nodeRequire = createRequire(__filename);
const STANDARD_FONT_FILES: Record<string, string> = {};

function keep(name: string, load: () => string): void {
  try {
    STANDARD_FONT_FILES[name] = load();
  } catch (error) {
    console.error(`pdfkit standard font was not packaged: ${name}`, error);
  }
}

keep('Courier', () => nodeRequire.resolve('./standard-fonts/Courier.cjs'));
keep('CourierBold', () => nodeRequire.resolve('./standard-fonts/CourierBold.cjs'));
keep('CourierBoldOblique', () => nodeRequire.resolve('./standard-fonts/CourierBoldOblique.cjs'));
keep('CourierOblique', () => nodeRequire.resolve('./standard-fonts/CourierOblique.cjs'));
keep('Helvetica', () => nodeRequire.resolve('./standard-fonts/Helvetica.cjs'));
keep('HelveticaBold', () => nodeRequire.resolve('./standard-fonts/HelveticaBold.cjs'));
keep('HelveticaBoldOblique', () => nodeRequire.resolve('./standard-fonts/HelveticaBoldOblique.cjs'));
keep('HelveticaOblique', () => nodeRequire.resolve('./standard-fonts/HelveticaOblique.cjs'));
keep('Symbol', () => nodeRequire.resolve('./standard-fonts/Symbol.cjs'));
keep('TimesBold', () => nodeRequire.resolve('./standard-fonts/TimesBold.cjs'));
keep('TimesBoldItalic', () => nodeRequire.resolve('./standard-fonts/TimesBoldItalic.cjs'));
keep('TimesItalic', () => nodeRequire.resolve('./standard-fonts/TimesItalic.cjs'));
keep('TimesRoman', () => nodeRequire.resolve('./standard-fonts/TimesRoman.cjs'));
keep('ZapfDingbats', () => nodeRequire.resolve('./standard-fonts/ZapfDingbats.cjs'));
keep('glyph-names', () =>
  nodeRequire.resolve('./standard-fonts/chunks/standardGlyphNames-DNHAb7rp.cjs'),
);

const PATCH_KEY = Symbol.for('campusops.pdfkit-standard-fonts');
const moduleApi = Module as unknown as {
  _resolveFilename: (
    request: string,
    parent: NodeModule | null | undefined,
    isMain: boolean,
    options?: unknown,
  ) => string;
} & Record<symbol, boolean>;

if (!moduleApi[PATCH_KEY] && STANDARD_FONT_FILES.Helvetica) {
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
